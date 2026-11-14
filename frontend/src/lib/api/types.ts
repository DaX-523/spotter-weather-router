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

/** The owner's risk levels. Unknown means no usable forecast: never safe. */
export type RiskLevel =
  "low" | "moderate" | "high" | "severe" | "no_travel" | "unknown";

export type HazardKind = "wind" | "rain" | "snow";

export type Hazard = { kind: HazardKind; level: RiskLevel; reason: string };

export type CheckpointRisk = {
  level: RiskLevel;
  /** Worst first; conditions that are low risk are left out. */
  hazards: Hazard[];
};

export type Checkpoint = {
  coordinate: Coordinate;
  mile_marker_mi: number;
  eta: string;
  weather: Conditions;
  risk: CheckpointRisk;
};

export type RouteRisk = {
  level: RiskLevel;
  no_travel_mi: number;
  severe_mi: number;
  /** Includes miles whose risk is unknown. */
  high_mi: number;
  /** Distance-weighted, from 0 (all low) to 4 (all no travel). */
  average_score: number;
};

export type Route = {
  id: number;
  distance_mi: number;
  duration_s: number;
  arrival_at: string;
  polyline: Coordinate[];
  checkpoints: Checkpoint[];
  risk: RouteRisk;
};

export type Recommendation = {
  /** null when every route crosses No Travel conditions. */
  route_id: number | null;
  reason: string;
};

export type TripPlan = {
  departure_at: string;
  spacing_mi: number;
  routes: Route[];
  recommendation: Recommendation;
};

export type TripPlanRequest = {
  origin: Coordinate;
  destination: Coordinate;
  departure_at: string;
  load_weight_lb: number;
};

export type Place = { name: string; coordinate: Coordinate };
