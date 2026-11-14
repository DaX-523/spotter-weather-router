import type { Checkpoint, Route } from "@/lib/api";
import {
  formatClock,
  formatDuration,
  formatMileMarker,
  formatMiles,
} from "@/lib/format";

// The slider moves an hour at a time, so each of its hours covers half an hour either side.
const HALF_HOUR_MS = 30 * 60 * 1000;

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

/** Where the truck is at a moment: not left yet (at the start), at the checkpoint whose ETA is
 * nearest, or arrived (at the end). */
export type TruckPosition = {
  state: "waiting" | "driving" | "arrived";
  checkpoint: Checkpoint;
};

export function truckPosition(route: Route, at: string): TruckPosition {
  const moment = new Date(at).getTime();
  const { checkpoints } = route;
  const first = checkpoints[0];
  const last = checkpoints[checkpoints.length - 1];
  if (moment < etaMs(first) - HALF_HOUR_MS) {
    return { state: "waiting", checkpoint: first };
  }
  if (moment > etaMs(last) + HALF_HOUR_MS) {
    return { state: "arrived", checkpoint: last };
  }
  const nearest = checkpoints.reduce((best, checkpoint) =>
    Math.abs(etaMs(checkpoint) - moment) < Math.abs(etaMs(best) - moment)
      ? checkpoint
      : best,
  );
  return { state: "driving", checkpoint: nearest };
}

/** "Mile 50 of 1,004 mi · ETA Sat, 9:45 AM CST", in local time where the truck is. */
export function truckSummary(route: Route, position: TruckPosition): string {
  const { checkpoint } = position;
  const clock = formatClock(checkpoint.eta, checkpoint.time_zone);
  if (position.state === "waiting")
    return `Not on the road yet · leaves ${clock}`;
  if (position.state === "arrived") return `Arrived · ${clock}`;
  const mile = formatMileMarker(checkpoint.mile_marker_mi);
  return `${mile} of ${formatMiles(route.distance_mi)} · ETA ${clock}`;
}

function etaMs(checkpoint: Checkpoint): number {
  return new Date(checkpoint.eta).getTime();
}
