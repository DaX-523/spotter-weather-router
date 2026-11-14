import { useCallback, useEffect, useState } from "react";

import {
  parseTripQuery,
  tripQueryToSearch,
  type TripQuery,
} from "@/lib/trip-query";

/** The trip in the URL, and a way to change it that adds a history entry, so Back works. */
export function useTripQuery(): [TripQuery, (next: TripQuery) => void] {
  const [query, setQuery] = useState(() =>
    parseTripQuery(window.location.search),
  );

  useEffect(() => {
    const followHistory = () =>
      setQuery(parseTripQuery(window.location.search));
    window.addEventListener("popstate", followHistory);
    return () => window.removeEventListener("popstate", followHistory);
  }, []);

  const navigate = useCallback((next: TripQuery) => {
    window.history.pushState(null, "", `?${tripQueryToSearch(next)}`);
    setQuery(next);
  }, []);

  return [query, navigate];
}
