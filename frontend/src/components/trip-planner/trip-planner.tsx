import { ChevronLeft } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { TripMap } from "@/components/map";
import { ForecastPanel } from "@/components/trip-planner/forecast-panel";
import { PlanStatus } from "@/components/trip-planner/plan-status";
import { PlanningOverlay } from "@/components/trip-planner/planning-overlay";
import { RiskLegend } from "@/components/trip-planner/risk-badge";
import { RouteList } from "@/components/trip-planner/route-list";
import { TripForm } from "@/components/trip-planner/trip-form";
import { useTripQuery } from "@/hooks/use-trip-query";
import { ApiError, type Route } from "@/lib/api";
import { hourMoment } from "@/lib/corridor";
import { DEFAULT_TIME_ZONE } from "@/lib/datetime";
import { selectedRouteId, type Endpoints } from "@/lib/map";
import { routeName, truckPosition } from "@/lib/routes";
import { tripQueryToSearch, tripRequestFrom } from "@/lib/trip-query";
import { cn } from "@/lib/utils";
import { useTripPlan } from "@/queries/trip-plan";

// Stable empties, so the memoised map doesn't redraw when nothing changed.
const NO_ERRORS = {};
const NO_ROUTES: Route[] = [];
const PANEL_ID = "trip-panel";
// The panel and the map slide together; the map follows its box as it resizes (trip-map.tsx).
const SLIDE = "duration-300 ease-in-out motion-reduce:transition-none";

/** The whole planner: the trip form and route list beside the map. */
export function TripPlanner() {
  const [query, setQuery] = useTripQuery();
  const trip = useMemo(() => tripRequestFrom(query), [query]);
  const plan = useTripPlan(trip);
  const [chosenRouteId, setChosenRouteId] = useState<number | null>(null);
  const [forecastHour, setForecastHour] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  // The slider answers at once; the map catches up when React has a moment.
  const mapHour = useDeferredValue(forecastHour);

  const endpoints = useMemo<Endpoints | null>(
    () =>
      query.origin && query.destination
        ? { origin: query.origin, destination: query.destination }
        : null,
    [query.origin, query.destination],
  );

  const routes = plan.data?.routes ?? NO_ROUTES;
  const recommendedRouteId = plan.data?.recommendation.route_id ?? null;
  const selected = selectedRouteId(routes, chosenRouteId, recommendedRouteId);
  const selectedRoute = routes.find((route) => route.id === selected);
  const serverErrors =
    plan.error instanceof ApiError ? plan.error.fieldErrors : NO_ERRORS;
  const truck =
    plan.data && selectedRoute
      ? truckPosition(
          selectedRoute,
          hourMoment(plan.data.corridor.start_at, mapHour),
        )
      : null;

  return (
    <main
      className={cn(
        "grid flex-1 grid-rows-[auto_minmax(60svh,1fr)] transition-[grid-template-columns] md:grid-rows-1",
        SLIDE,
        panelOpen ? "md:grid-cols-[26rem_1fr]" : "md:grid-cols-[0rem_1fr]",
      )}
    >
      {/* Phones stack the panel above the map, so there it folds up; wider screens slide it
          left. Folded away it is inert: nothing in it can be focused or read. */}
      <aside
        id={PANEL_ID}
        aria-label="Trip"
        inert={!panelOpen}
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] md:grid-rows-1",
          SLIDE,
          panelOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden border-b transition-transform md:w-[26rem] md:overflow-y-auto md:border-r md:border-b-0",
            SLIDE,
            !panelOpen && "md:-translate-x-full",
          )}
        >
          <div className="space-y-4 p-4">
            {/* Keyed on the trip, so after any navigation the form shows what was planned. */}
            <TripForm
              key={tripQueryToSearch(query)}
              initial={query}
              onSubmit={setQuery}
              serverErrors={serverErrors}
              pending={plan.isFetching}
            />
            <PlanStatus hasTrip={trip !== null} plan={plan} />
            <RouteList
              routes={routes}
              recommendedRouteId={recommendedRouteId}
              destinationTimeZone={
                plan.data?.destination_time_zone ?? DEFAULT_TIME_ZONE
              }
              selectedRouteId={selected}
              onSelect={setChosenRouteId}
            />
            {routes.length > 0 && <RiskLegend />}
          </div>
        </div>
      </aside>
      <div className="relative">
        <TripMap
          routes={routes}
          selectedRouteId={selected}
          onSelectRoute={setChosenRouteId}
          endpoints={endpoints}
          corridor={plan.data?.corridor ?? null}
          corridorHour={mapHour}
          spacingMi={plan.data?.spacing_mi ?? 0}
          truckAt={
            truck?.state === "driving" ? truck.checkpoint.coordinate : null
          }
        />
        {/* Above Leaflet's panes and controls (z-index up to 1000). A tab on the panel's edge:
            on top of the map on phones, at its left middle on wider screens. */}
        <button
          type="button"
          aria-controls={PANEL_ID}
          aria-expanded={panelOpen}
          aria-label={panelOpen ? "Hide trip panel" : "Show trip panel"}
          title={panelOpen ? "Hide trip panel" : "Show trip panel"}
          onClick={() => setPanelOpen((open) => !open)}
          className="absolute top-0 left-1/2 z-[1001] flex h-7 w-12 -translate-x-1/2 items-center justify-center rounded-b-md border border-t-0 bg-background text-muted-foreground shadow-sm after:absolute after:-inset-2 hover:text-foreground md:top-1/2 md:left-0 md:h-12 md:w-7 md:translate-x-0 md:-translate-y-1/2 md:rounded-l-none md:rounded-r-md md:border-t md:border-l-0"
        >
          <ChevronLeft
            aria-hidden="true"
            className={cn(
              "size-4 transition-transform",
              SLIDE,
              panelOpen ? "rotate-90 md:rotate-0" : "-rotate-90 md:rotate-180",
            )}
          />
        </button>
        {plan.data && selectedRoute && (
          <div className="absolute inset-x-3 bottom-6 z-[1001] md:right-auto md:w-[25rem]">
            <ForecastPanel
              corridor={plan.data.corridor}
              timeZone={plan.data.origin_time_zone}
              hour={forecastHour}
              onChange={setForecastHour}
              route={selectedRoute}
              routeName={routeName(routes, selectedRoute.id)}
            />
          </div>
        )}
        {plan.isFetching && <PlanningOverlay />}
      </div>
    </main>
  );
}
