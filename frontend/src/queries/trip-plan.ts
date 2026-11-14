import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query";

import { planTrip, type TripPlanRequest } from "@/lib/api";

export const tripPlanKey = (trip: TripPlanRequest | null) =>
  ["trip-plan", trip] as const;

/** The plan for a complete trip. While a new plan loads, the previous one stays on screen. */
export function useTripPlan(trip: TripPlanRequest | null) {
  return useQuery({
    queryKey: tripPlanKey(trip),
    queryFn: trip ? () => planTrip(trip) : skipToken,
    placeholderData: keepPreviousData,
  });
}
