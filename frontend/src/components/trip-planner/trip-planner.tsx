import { useDeferredValue, useMemo, useState } from "react";

import { TripMap } from "@/components/map";
import { ForecastSlider } from "@/components/trip-planner/forecast-slider";
import { PlanStatus } from "@/components/trip-planner/plan-status";
import { PlanningOverlay } from "@/components/trip-planner/planning-overlay";
import { RiskLegend } from "@/components/trip-planner/risk-badge";
import { RouteList } from "@/components/trip-planner/route-list";
import { TripForm } from "@/components/trip-planner/trip-form";
import { useTripQuery } from "@/hooks/use-trip-query";
import { ApiError, type Route } from "@/lib/api";
import { DEFAULT_TIME_ZONE } from "@/lib/datetime";
import { selectedRouteId, type Endpoints } from "@/lib/map";
import { tripQueryToSearch, tripRequestFrom } from "@/lib/trip-query";
import { useTripPlan } from "@/queries/trip-plan";

// Stable empties, so the memoised map doesn't redraw when nothing changed.
const NO_ERRORS = {};
const NO_ROUTES: Route[] = [];

/** The whole planner: the trip form and route list beside the map. */
export function TripPlanner() {
  const [query, setQuery] = useTripQuery();
  const trip = useMemo(() => tripRequestFrom(query), [query]);
  const plan = useTripPlan(trip);
  const [chosenRouteId, setChosenRouteId] = useState<number | null>(null);
  const [forecastHour, setForecastHour] = useState(0);
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
  const serverErrors =
    plan.error instanceof ApiError ? plan.error.fieldErrors : NO_ERRORS;

  return (
    <main className="grid flex-1 grid-rows-[auto_minmax(60svh,1fr)] md:grid-cols-[minmax(20rem,26rem)_1fr] md:grid-rows-1">
      <div className="space-y-4 border-b p-4 md:overflow-y-auto md:border-r md:border-b-0">
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
      <div className="relative">
        <TripMap
          routes={routes}
          selectedRouteId={selected}
          onSelectRoute={setChosenRouteId}
          endpoints={endpoints}
          corridor={plan.data?.corridor ?? null}
          corridorHour={mapHour}
          spacingMi={plan.data?.spacing_mi ?? 0}
        />
        {plan.data && (
          // Above Leaflet's panes and controls (z-index up to 1000).
          <div className="absolute inset-x-3 bottom-6 z-[1001] md:right-auto md:w-96">
            <ForecastSlider
              startAt={plan.data.corridor.start_at}
              timeZone={plan.data.origin_time_zone}
              hour={forecastHour}
              onChange={setForecastHour}
            />
          </div>
        )}
        {plan.isFetching && <PlanningOverlay />}
      </div>
    </main>
  );
}
