// Everything the map shows is computed here, so the Leaflet components stay thin.
import type { Checkpoint, Coordinate, Place, Route } from "@/lib/api";
import { formatClock, formatMileMarker } from "@/lib/format";
import { riskHeading } from "@/lib/risk";

/** Where the trip starts and ends, as the driver picked them. */
export type Endpoints = { origin: Place; destination: Place };

/** Leaflet's point order: latitude first. The one place our named points become pairs. */
export type LatLng = [number, number];

// Room around the routes when the map frames them.
const FIT_MARGIN_PX = 32;
// The forecast panel, folded, covers the bottom of the map up to about this tall. Where the map is
// tall enough, the routes are framed above it; on a phone that would leave too little room.
const FORECAST_PANEL_HEIGHT_PX = 200;
const MIN_ROUTES_HEIGHT_PX = 280;

/** Leaflet's padding for fitting the routes, in pixels from each side. */
export type FitPadding = {
  paddingTopLeft: [number, number];
  paddingBottomRight: [number, number];
};

export function fitPadding(mapHeightPx: number): FitPadding {
  const roomAbovePanel = mapHeightPx - FORECAST_PANEL_HEIGHT_PX - FIT_MARGIN_PX;
  const bottom =
    roomAbovePanel >= MIN_ROUTES_HEIGHT_PX
      ? FORECAST_PANEL_HEIGHT_PX
      : FIT_MARGIN_PX;
  return {
    paddingTopLeft: [FIT_MARGIN_PX, FIT_MARGIN_PX],
    paddingBottomRight: [FIT_MARGIN_PX, bottom],
  };
}

export function toLatLng(point: Coordinate): LatLng {
  return [point.lat, point.lon];
}

/** South-west and north-east corners around every route, or null when there are none. */
export function boundsOf(routes: Route[]): [LatLng, LatLng] | null {
  const points = routes.flatMap((route) => route.polyline);
  if (points.length === 0) return null;
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];
}

/** The route to highlight: the driver's choice while it exists, otherwise the recommended
 * route, otherwise the first. */
export function selectedRouteId(
  routes: Route[],
  chosen: number | null,
  recommended: number | null,
): number | null {
  const exists = (id: number | null) => routes.some((route) => route.id === id);
  if (exists(chosen)) return chosen;
  if (exists(recommended)) return recommended;
  return routes[0]?.id ?? null;
}

/** What hovering a sign on the map says: a heading in bold, then a few short lines. */
export type MapTooltip = { heading: string; lines: string[] };

/** A checkpoint at a glance: its risk and why, where it is and when the truck gets there. */
export function checkpointTooltip(checkpoint: Checkpoint): MapTooltip {
  const { risk } = checkpoint;
  const eta = formatClock(checkpoint.eta, checkpoint.time_zone);
  return {
    heading: riskHeading(risk),
    lines: [
      ...risk.hazards.map((hazard) => hazard.reason),
      `${formatMileMarker(checkpoint.mile_marker_mi)} · ETA ${eta}`,
      "Click for details",
    ],
  };
}
