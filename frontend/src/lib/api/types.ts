// Mirrors the backend's /api/v1 contract (backend/trips/api/serializers.py). US units throughout.

/** A point on the map. Always named, never a [lat, lon] pair: vendors disagree on the order. */
export type Coordinate = { lat: number; lon: number };

/** The weather at a checkpoint when the truck gets there. null means unknown, never calm. */
export type Conditions = {
  wind_speed_mph: number | null;
  /** Rain and snow are inches in the hour the truck is there. */
  rain_in: number | null;
  snowfall_in: number | null;
};

export type Checkpoint = {
  coordinate: Coordinate;
  mile_marker_mi: number;
  eta: string;
  weather: Conditions;
};

export type Route = {
  id: number;
  distance_mi: number;
  duration_s: number;
  arrival_at: string;
  polyline: Coordinate[];
  checkpoints: Checkpoint[];
};

export type TripPlan = {
  departure_at: string;
  spacing_mi: number;
  routes: Route[];
};

export type TripPlanRequest = {
  origin: Coordinate;
  destination: Coordinate;
  departure_at: string;
  load_weight_lb: number;
};

export type Place = { name: string; coordinate: Coordinate };
