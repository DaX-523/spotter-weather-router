// The only place the frontend talks to the backend.
import { request } from "./client";
import type { Place, TripPlan, TripPlanRequest } from "./types";

export { ApiError } from "./client";
export type * from "./types";

export function planTrip(trip: TripPlanRequest): Promise<TripPlan> {
  return request("POST", "/trip-plans", { body: trip });
}

export function searchPlaces(query: string): Promise<Place[]> {
  return request("GET", "/places", { query: { query } });
}
