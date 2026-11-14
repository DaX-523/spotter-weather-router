import type { Place, Route, TripPlan } from "@/lib/api";
import type { TripQuery } from "@/lib/trip-query";

// 15:00 UTC is 9:00 AM in Chicago, the zone the tests run in.
export const NOW = new Date("2026-11-14T15:00:00Z");

export const CHICAGO: Place = {
  name: "Chicago, IL",
  coordinate: { lat: 41.8781, lon: -87.6298 },
};
export const DENVER: Place = {
  name: "Denver, CO",
  coordinate: { lat: 39.7392, lon: -104.9903 },
};

export const TRIP_QUERY: TripQuery = {
  origin: CHICAGO,
  destination: DENVER,
  departureAt: "2026-11-14T15:00:00.000Z",
  loadWeightLb: 30_000,
};

function route(id: number, overrides: Partial<Route> = {}): Route {
  return {
    id,
    distance_mi: 1004.2,
    duration_s: 54_000,
    arrival_at: "2026-11-15T06:00:00Z",
    polyline: [
      CHICAGO.coordinate,
      { lat: 41.2, lon: -95.9 },
      DENVER.coordinate,
    ],
    checkpoints: [
      {
        coordinate: CHICAGO.coordinate,
        mile_marker_mi: 0,
        eta: "2026-11-14T15:00:00Z",
        weather: { wind_speed_mph: 12.4, rain_in: 0, snowfall_in: 0 },
      },
      {
        coordinate: { lat: 41.2, lon: -95.9 },
        mile_marker_mi: 50,
        eta: "2026-11-14T15:45:00Z",
        weather: { wind_speed_mph: 26, rain_in: 0.12, snowfall_in: null },
      },
      {
        coordinate: DENVER.coordinate,
        mile_marker_mi: 920.3,
        eta: "2026-11-15T06:00:00Z",
        weather: { wind_speed_mph: null, rain_in: null, snowfall_in: null },
      },
    ],
    ...overrides,
  };
}

export const TRIP_PLAN: TripPlan = {
  departure_at: "2026-11-14T15:00:00Z",
  spacing_mi: 50,
  routes: [
    route(0),
    route(1, {
      distance_mi: 1031.6,
      duration_s: 55_800,
      arrival_at: "2026-11-15T06:30:00Z",
      polyline: [
        CHICAGO.coordinate,
        { lat: 40.8, lon: -96.7 },
        DENVER.coordinate,
      ],
    }),
    route(2, {
      distance_mi: 1062.9,
      duration_s: 57_600,
      arrival_at: "2026-11-15T07:00:00Z",
      polyline: [
        CHICAGO.coordinate,
        { lat: 42.5, lon: -96.4 },
        DENVER.coordinate,
      ],
    }),
  ],
};
