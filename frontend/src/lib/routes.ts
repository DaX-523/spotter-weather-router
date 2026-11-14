import type { Route } from "@/lib/api";

/** "Route 2": routes are numbered from 1 in the order the plan lists them. */
export function routeName(routes: Route[], routeId: number): string {
  return `Route ${routes.findIndex((route) => route.id === routeId) + 1}`;
}

/** A route that crosses No Travel conditions must not be driven (owner's rule). */
export function isDrivable(route: Route): boolean {
  return route.risk.no_travel_mi === 0;
}
