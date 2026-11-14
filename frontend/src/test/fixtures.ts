import type { Checkpoint, Place, Route, RouteRisk, TripPlan } from "@/lib/api";
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

export const CLEAR_START: Checkpoint = {
  coordinate: CHICAGO.coordinate,
  mile_marker_mi: 0,
  eta: "2026-11-14T15:00:00Z",
  weather: { wind_speed_mph: 12.4, rain_in: 0, snowfall_in: 0 },
  risk: { level: "low", hazards: [] },
};

export const WINDY_MILE_50: Checkpoint = {
  coordinate: { lat: 41.2, lon: -95.9 },
  mile_marker_mi: 50,
  eta: "2026-11-14T15:45:00Z",
  weather: { wind_speed_mph: 48, rain_in: 0.12, snowfall_in: 0 },
  risk: {
    level: "severe",
    hazards: [
      { kind: "wind", level: "severe", reason: "Wind 48 mph" },
      { kind: "rain", level: "moderate", reason: "Rain 0.12 in/hr" },
    ],
  },
};

export const UNKNOWN_END: Checkpoint = {
  coordinate: DENVER.coordinate,
  mile_marker_mi: 920.3,
  eta: "2026-11-15T06:00:00Z",
  weather: { wind_speed_mph: null, rain_in: null, snowfall_in: null },
  risk: {
    level: "unknown",
    hazards: [
      { kind: "wind", level: "unknown", reason: "No wind forecast" },
      { kind: "rain", level: "unknown", reason: "No rain forecast" },
      { kind: "snow", level: "unknown", reason: "No snow forecast" },
    ],
  },
};

const CLEAR: RouteRisk = {
  level: "low",
  no_travel_mi: 0,
  severe_mi: 0,
  high_mi: 0,
  average_score: 0,
};

function route(id: number, overrides: Partial<Route>): Route {
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
    checkpoints: [CLEAR_START, WINDY_MILE_50, UNKNOWN_END],
    risk: CLEAR,
    ...overrides,
  };
}

/** Route 1 is fastest but windy, route 2 is recommended, route 3 crosses No Travel conditions. */
export const TRIP_PLAN: TripPlan = {
  departure_at: "2026-11-14T15:00:00Z",
  spacing_mi: 50,
  routes: [
    route(0, {
      risk: {
        level: "severe",
        no_travel_mi: 0,
        severe_mi: 100,
        high_mi: 870.3,
        average_score: 2.1,
      },
    }),
    route(1, {
      distance_mi: 1031.6,
      duration_s: 55_800,
      arrival_at: "2026-11-15T06:30:00Z",
      polyline: [
        CHICAGO.coordinate,
        { lat: 40.8, lon: -96.7 },
        DENVER.coordinate,
      ],
      checkpoints: [CLEAR_START],
      risk: { ...CLEAR, level: "moderate", average_score: 0.8 },
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
      checkpoints: [CLEAR_START],
      risk: {
        ...CLEAR,
        level: "no_travel",
        no_travel_mi: 25,
        average_score: 0.5,
      },
    }),
  ],
  recommendation: { route_id: 1, reason: "Fewest miles in severe conditions" },
  corridor: {
    start_at: "2026-11-14T15:00:00Z",
    points: [
      { coordinate: CHICAGO.coordinate, levels: Array(49).fill("low") },
      {
        coordinate: { lat: 41.2, lon: -95.9 },
        // Clear for the first 6 hours, then a storm.
        levels: [...Array(6).fill("low"), ...Array(43).fill("severe")],
      },
    ],
  },
};
