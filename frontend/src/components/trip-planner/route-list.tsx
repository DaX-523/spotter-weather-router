import type { Route } from "@/lib/api";
import { formatClock, formatDuration, formatMiles } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  routes: Route[];
  selectedRouteId: number | null;
  onSelect: (routeId: number) => void;
};

/** One card per route; picking one highlights it on the map. */
export function RouteList({ routes, selectedRouteId, onSelect }: Props) {
  if (routes.length === 0) return null;
  return (
    <ul aria-label="Routes" className="space-y-2">
      {routes.map((route, index) => {
        const selected = route.id === selectedRouteId;
        return (
          <li key={route.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(route.id)}
              className={cn(
                "flex min-h-11 w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                selected && "border-map-route ring-2 ring-map-route/30",
              )}
            >
              <span className="font-medium">Route {index + 1}</span>
              <span>
                {formatMiles(route.distance_mi)} ·{" "}
                {formatDuration(route.duration_s)}
              </span>
              <span className="text-muted-foreground">
                Arrives {formatClock(route.arrival_at)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
