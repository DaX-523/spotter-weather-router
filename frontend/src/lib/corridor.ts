// The corridor heatmap and its 0-48 h slider. The backend rates every hour; this only labels,
// sizes and sums up what the map shades. No level is ever changed here.
import type {
  Coordinate,
  Corridor,
  Hazard,
  HazardKind,
  RiskLevel,
} from "@/lib/api";
import { formatClock } from "@/lib/format";
import { RISK_LEVELS, markerTitle } from "@/lib/risk";

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

// The order hazards are named in, so the same causes always read the same way.
const HAZARD_ORDER: readonly HazardKind[] = ["wind", "rain", "snow"];

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

/** A corridor checkpoint that isn't low risk at an hour, and what makes it so. */
export type CorridorHazard = {
  coordinate: Coordinate;
  level: RiskLevel;
  /** The hazard behind the level; unknown where there is no forecast. */
  kind: HazardKind | "unknown";
  /** "High: Wind 38 mph; Rain 0.12 in/hr", as a checkpoint's marker says it. */
  title: string;
};

/** The corridor's checkpoints that aren't low risk at an hour, worst first. */
export function hazardsAt(corridor: Corridor, hour: number): CorridorHazard[] {
  return corridor.points
    .filter((point) => point.levels[hour] !== "low")
    .map((point) => {
      const level = point.levels[hour];
      const hazards = point.hazards[hour];
      return {
        coordinate: point.coordinate,
        level,
        kind: decidingKind(level, hazards),
        title: markerTitle({ level, hazards }),
      };
    })
    .sort(
      (a, b) => WORST_FIRST.indexOf(a.level) - WORST_FIRST.indexOf(b.level),
    );
}

/** What puts the corridor at a level at an hour, in words: "wind", "wind and rain". */
export function hazardCause(
  corridor: Corridor,
  hour: number,
  level: RiskLevel,
): string {
  if (level === "unknown") return "no forecast";
  const kinds = new Set(
    corridor.points
      .filter((point) => point.levels[hour] === level)
      .flatMap((point) => point.hazards[hour])
      .filter((hazard) => hazard.level === level)
      .map((hazard) => hazard.kind),
  );
  return inWords(HAZARD_ORDER.filter((kind) => kinds.has(kind)));
}

/** Each distinct reason the corridor isn't low risk at an hour, worst first. */
export function reasonsAt(corridor: Corridor, hour: number): string[] {
  return [...new Set(hazardsAt(corridor, hour).map(({ title }) => title))];
}

function decidingKind(
  level: RiskLevel,
  hazards: Hazard[],
): HazardKind | "unknown" {
  if (level === "unknown") return "unknown";
  return hazards.find((hazard) => hazard.level === level)?.kind ?? "unknown";
}

/** "wind", "wind and rain", "wind, rain and snow". */
function inWords(words: string[]): string {
  if (words.length < 2) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
