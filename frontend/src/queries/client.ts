import { QueryClient } from "@tanstack/react-query";

// The backend caches forecasts for 15 minutes; asking again within 5 adds nothing.
const STALE_AFTER_MS = 5 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Errors already say whether to try again; the driver decides, rather than waiting on retries.
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: STALE_AFTER_MS,
      },
    },
  });
}
