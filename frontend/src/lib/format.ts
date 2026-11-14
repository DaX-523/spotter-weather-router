// Formatting for display. The API already speaks US units; nothing here converts.

const UNKNOWN = "Unknown";
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

const wholeNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
const clock = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function formatMiles(miles: number): string {
  return `${wholeNumber.format(miles)} mi`;
}

export function formatMileMarker(miles: number): string {
  return `Mile ${wholeNumber.format(miles)}`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** Weekday, time and zone in the driver's time zone, e.g. "Sun, 12:00 AM CST". */
export function formatClock(iso: string): string {
  // Some ICU versions put a narrow no-break space before AM/PM; keep plain spaces.
  return clock.format(new Date(iso)).replace(/\u202f/g, " ");
}

export function formatWind(mph: number | null): string {
  return mph === null ? UNKNOWN : `${wholeNumber.format(mph)} mph`;
}

/** Rain or snow in the hour the truck is there. */
export function formatPerHour(inches: number | null): string {
  return inches === null ? UNKNOWN : `${inches.toFixed(2)} in/hr`;
}
