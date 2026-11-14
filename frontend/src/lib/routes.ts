import type { Route } from "@/lib/api";
import { formatDuration, formatMiles } from "@/lib/format";

/** "Route 2": routes are numbered from 1 in the order the plan lists them. */
export function routeName(routes: Route[], routeId: number): string {
  return `Route ${routes.findIndex((route) => route.id === routeId) + 1}`;
}

/** A route that crosses No Travel conditions must not be driven (owner's rule). */
export function isDrivable(route: Route): boolean {
  return route.risk.no_travel_mi === 0;
}

/** What hovering a route on the map says: which one, how long, and that it can be picked. */
export function routeTooltip(routes: Route[], route: Route): string {
  const summary = `${formatMiles(route.distance_mi)} · ${formatDuration(route.duration_s)}`;
  return `${routeName(routes, route.id)} · ${summary} · click to select`;
}
