// The trip lives in the URL, so a plan survives a reload, can be shared, and works with Back.
import type { Coordinate, Place, TripPlanRequest } from "@/lib/api";

export type TripQuery = {
  origin: Place | null;
  destination: Place | null;
  /** ISO 8601 in UTC. */
  departureAt: string | null;
  loadWeightLb: number | null;
};

const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

/** Reads the URL's search string. Anything missing or invalid comes back as null. */
export function parseTripQuery(search: string): TripQuery {
  const params = new URLSearchParams(search);
  return {
    origin: readPlace(params, "from"),
    destination: readPlace(params, "to"),
    departureAt: readMoment(params.get("depart")),
    loadWeightLb: readPositive(params.get("load")),
  };
}

export function tripQueryToSearch(query: TripQuery): string {
  const params = new URLSearchParams();
  writePlace(params, "from", query.origin);
  writePlace(params, "to", query.destination);
  if (query.departureAt) params.set("depart", query.departureAt);
  if (query.loadWeightLb) params.set("load", String(query.loadWeightLb));
  return params.toString();
}

/** The API request for a complete trip, or null while something is missing. */
export function tripRequestFrom(query: TripQuery): TripPlanRequest | null {
  const { origin, destination, departureAt, loadWeightLb } = query;
  if (!origin || !destination || !departureAt || !loadWeightLb) return null;
  return {
    origin: origin.coordinate,
    destination: destination.coordinate,
    departure_at: departureAt,
    load_weight_lb: loadWeightLb,
  };
}

function readPlace(params: URLSearchParams, prefix: string): Place | null {
  const name = params.get(prefix);
  const coordinate = readCoordinate(
    params.get(`${prefix}_lat`),
    params.get(`${prefix}_lon`),
  );
  return name && coordinate ? { name, coordinate } : null;
}

function writePlace(
  params: URLSearchParams,
  prefix: string,
  place: Place | null,
) {
  if (!place) return;
  params.set(prefix, place.name);
  params.set(`${prefix}_lat`, String(place.coordinate.lat));
  params.set(`${prefix}_lon`, String(place.coordinate.lon));
}

function readCoordinate(
  lat: string | null,
  lon: string | null,
): Coordinate | null {
  const latitude = Number(lat ?? Number.NaN);
  const longitude = Number(lon ?? Number.NaN);
  const valid =
    Math.abs(latitude) <= MAX_LATITUDE && Math.abs(longitude) <= MAX_LONGITUDE;
  return valid ? { lat: latitude, lon: longitude } : null;
}

function readMoment(value: string | null): string | null {
  const moment = new Date(value ?? Number.NaN);
  return Number.isNaN(moment.getTime()) ? null : moment.toISOString();
}

function readPositive(value: string | null): number | null {
  const number = Number(value ?? Number.NaN);
  return number > 0 ? number : null;
}
