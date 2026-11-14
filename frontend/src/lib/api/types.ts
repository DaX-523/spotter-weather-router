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
  /** IANA zone where the truck is at its ETA; the ETA is shown in local time there. */
  time_zone: string;
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

export type CorridorPoint = {
  coordinate: Coordinate;
  /** One level per hour from the corridor's start: 49 of them, for 0 to 48 h. */
  levels: RiskLevel[];
  /** Per hour, what makes it more than Low, worst first; empty when it is Low. */
  hazards: Hazard[][];
};

/** The heatmap: the risk around every checkpoint, hour by hour, from now to 48 h ahead. */
export type Corridor = { start_at: string; points: CorridorPoint[] };

export type TripPlan = {
  departure_at: string;
  spacing_mi: number;
  routes: Route[];
  recommendation: Recommendation;
  corridor: Corridor;
  /** Departure is shown in the origin's local time, arrival in the destination's. */
  origin_time_zone: string;
  destination_time_zone: string;
};

export type TripPlanRequest = {
  origin: Coordinate;
  destination: Coordinate;
  departure_at: string;
  load_weight_lb: number;
};

export type Place = {
  name: string;
  coordinate: Coordinate;
  /** IANA zone, e.g. "America/Chicago". */
  time_zone: string;
};
