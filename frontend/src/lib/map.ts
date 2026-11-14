// Everything the map shows is computed here, so the Leaflet components stay thin.
import type { Coordinate, Route } from "@/lib/api";

/** Leaflet's point order: latitude first. The one place our named points become pairs. */
export type LatLng = [number, number];

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

/** The route to highlight: the driver's choice while it exists, otherwise the first. */
export function selectedRouteId(
  routes: Route[],
  chosen: number | null,
): number | null {
  if (routes.some((route) => route.id === chosen)) return chosen;
  return routes[0]?.id ?? null;
}
