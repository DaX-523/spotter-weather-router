import { RiskBadge } from "@/components/trip-planner/risk-badge";
import type { Route } from "@/lib/api";
import { formatClock, formatDuration, formatMiles } from "@/lib/format";
import { riskMiles } from "@/lib/risk";
import { isDrivable } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Props = {
  routes: Route[];
  recommendedRouteId: number | null;
  selectedRouteId: number | null;
  onSelect: (routeId: number) => void;
};

/** One card per route; picking one highlights it on the map. */
export function RouteList({
  routes,
  recommendedRouteId,
  selectedRouteId,
  onSelect,
}: Props) {
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
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  Route {index + 1}
                  {route.id === recommendedRouteId && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      Recommended
                    </span>
                  )}
                </span>
                <RiskBadge level={route.risk.level} />
              </span>
              <span>
                {formatMiles(route.distance_mi)} ·{" "}
                {formatDuration(route.duration_s)}
              </span>
              <span className="text-muted-foreground">
                Arrives {formatClock(route.arrival_at)}
              </span>
              <span className="text-muted-foreground">
                {riskMiles(route.risk)}
              </span>
              {!isDrivable(route) && (
                <span className="font-medium text-destructive">
                  Not allowed: crosses No Travel conditions
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
