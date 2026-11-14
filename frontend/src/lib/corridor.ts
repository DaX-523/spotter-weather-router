// The corridor heatmap and its 0-48 h slider. The backend rates every hour; this only labels,
// sizes and sums up what the map shades. No level is ever changed here.
import type { Corridor, RiskLevel } from "@/lib/api";
import { formatClock } from "@/lib/format";
import { RISK_LEVELS } from "@/lib/risk";

/** The owner's slider: from now (hour 0) to 48 hours ahead. */
export const CORRIDOR_HOURS = 48;
const MS_PER_HOUR = 60 * 60 * 1000;
// Leaflet sizes circles in metres: the one place the map needs metric.
const METERS_PER_MILE = 1609.344;
// Each checkpoint's shading reaches 60% of the way to its neighbours, so they blend into a band.
const SHADING_REACH = 0.6;

// Worst first, for summing up many levels as one. Unknown sits just under High: the owner's
// ranking counts it as High, and a known High hazard says more.
const WORST_FIRST: readonly RiskLevel[] = [
  "no_travel",
  "severe",
  "high",
  "unknown",
  "moderate",
  "low",
];

/** The moment a slider hour stands for, as ISO 8601. */
export function hourMoment(startAt: string, hour: number): string {
  return new Date(
    new Date(startAt).getTime() + hour * MS_PER_HOUR,
  ).toISOString();
}

/** "Now", "+6 h". */
export function hourOffsetLabel(hour: number): string {
  return hour === 0 ? "Now" : `+${hour} h`;
}

/** "Now · Sat, 9:00 AM CST", "+6 h · Sat, 3:00 PM CST", in the origin's local time. */
export function forecastHourLabel(
  startAt: string,
  hour: number,
  timeZone: string,
): string {
  const clock = formatClock(hourMoment(startAt, hour), timeZone);
  return `${hourOffsetLabel(hour)} · ${clock}`;
}

/** The worst of several levels. No levels at all is unknown, never low. */
export function worstLevel(levels: readonly RiskLevel[]): RiskLevel {
  return WORST_FIRST.find((level) => levels.includes(level)) ?? "unknown";
}

/** The corridor's worst level at each hour, from now to 48 h ahead: the slider's timeline. */
export function hourlyWorst(corridor: Corridor): RiskLevel[] {
  return Array.from({ length: CORRIDOR_HOURS + 1 }, (_, hour) =>
    worstLevel(corridor.points.map((point) => point.levels[hour])),
  );
}

export type LevelCount = { level: RiskLevel; count: number };

/** How many of the corridor's checkpoints are at each level at an hour, in legend order. Levels
 * no checkpoint has are left out. */
export function levelCounts(corridor: Corridor, hour: number): LevelCount[] {
  return RISK_LEVELS.map((level) => ({
    level,
    count: corridor.points.filter((point) => point.levels[hour] === level)
      .length,
  })).filter(({ count }) => count > 0);
}

/** The worst level in the timeline, and the first hour it is forecast. */
export function corridorPeak(timeline: readonly RiskLevel[]): {
  level: RiskLevel;
  hour: number;
} {
  const level = worstLevel(timeline);
  return { level, hour: timeline.indexOf(level) };
}

export function corridorRadiusMeters(spacingMi: number): number {
  return Math.round(spacingMi * METERS_PER_MILE * SHADING_REACH);
}

/** Base UI's slider reports a number or a list, matching how its value was given. */
export function sliderHour(value: number | readonly number[]): number {
  return typeof value === "number" ? value : value[0];
}
