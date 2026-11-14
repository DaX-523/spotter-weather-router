// Times are shown in local time where they happen (owner's decision): the departure in the
// origin's zone, each ETA in its checkpoint's zone, and arrival in the destination's.

/** Until an origin is picked, the departure is read in US Central time. */
export const DEFAULT_TIME_ZONE = "America/Chicago";

// The value of an <input type="datetime-local">: a wall-clock time with no zone.
const INPUT_VALUE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const MS_PER_MINUTE = 60_000;
const wallClocks = new Map<string, Intl.DateTimeFormat>();

/** A moment as the local date and time in `zone`, to the minute. */
export function toZonedInputValue(moment: Date, zone: string): string {
  const { year, month, day, hour, minute } = wallClock(moment, zone);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/** The moment a local date and time in `zone` names, or null if it doesn't name one. */
export function fromZonedInputValue(value: string, zone: string): Date | null {
  const match = INPUT_VALUE.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const wallTime = Date.UTC(year, month - 1, day, hour, minute);
  // The offset depends on the moment (daylight saving), so measure it again at the first guess.
  const firstGuess = wallTime - offsetMs(wallTime, zone);
  return new Date(wallTime - offsetMs(firstGuess, zone));
}

/** "CST", "MDT": how drivers name the zone's time at that moment. */
export function zoneAbbreviation(zone: string, moment: Date): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "short",
  }).format(moment);
  // "11/14/2026, CST": the zone is the last word.
  return formatted.slice(formatted.lastIndexOf(" ") + 1);
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function wallClock(moment: Date, zone: string): Record<string, string> {
  let formatter = wallClocks.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    wallClocks.set(zone, formatter);
  }
  return Object.fromEntries(
    formatter.formatToParts(moment).map(({ type, value }) => [type, value]),
  );
}

/** How far `zone`'s wall clock is ahead of UTC at a moment (negative across the US). */
function offsetMs(epochMs: number, zone: string): number {
  const { year, month, day, hour, minute } = wallClock(new Date(epochMs), zone);
  const wallTime = Date.UTC(+year, +month - 1, +day, +hour, +minute);
  return wallTime - Math.floor(epochMs / MS_PER_MINUTE) * MS_PER_MINUTE;
}
