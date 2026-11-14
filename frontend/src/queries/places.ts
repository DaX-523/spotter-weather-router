import { skipToken, useQuery } from "@tanstack/react-query";

import { searchPlaces } from "@/lib/api";

// The backend's minimum (backend/trips/api/serializers.py).
export const MIN_QUERY_LENGTH = 2;
// Place names don't move; a search made a while ago is still right.
const STALE_AFTER_MS = 30 * 60 * 1000;

export const placesKey = (query: string) => ["places", query] as const;

export function usePlaceSearch(query: string) {
  return useQuery({
    queryKey: placesKey(query),
    queryFn:
      query.length >= MIN_QUERY_LENGTH ? () => searchPlaces(query) : skipToken,
    staleTime: STALE_AFTER_MS,
  });
}
