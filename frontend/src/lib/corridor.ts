// The corridor heatmap and its 0-48 h slider. The backend rates every hour; this only labels and
// sizes what the map shades.
import { formatClock } from "@/lib/format";

/** The owner's slider: from now (hour 0) to 48 hours ahead. */
export const CORRIDOR_HOURS = 48;
const MS_PER_HOUR = 60 * 60 * 1000;
// Leaflet sizes circles in metres: the one place the map needs metric.
const METERS_PER_MILE = 1609.344;
// Each checkpoint's shading reaches 60% of the way to its neighbours, so they blend into a band.
const SHADING_REACH = 0.6;

/** "Now · Sat, 9:00 AM CST", "+6 h · Sat, 3:00 PM CST". */
export function forecastHourLabel(startAt: string, hour: number): string {
  const moment = new Date(new Date(startAt).getTime() + hour * MS_PER_HOUR);
  const offset = hour === 0 ? "Now" : `+${hour} h`;
  return `${offset} · ${formatClock(moment.toISOString())}`;
}

export function corridorRadiusMeters(spacingMi: number): number {
  return Math.round(spacingMi * METERS_PER_MILE * SHADING_REACH);
}

/** Base UI's slider reports a number or a list, matching how its value was given. */
export function sliderHour(value: number | readonly number[]): number {
  return typeof value === "number" ? value : value[0];
}
