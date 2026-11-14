import type { Place } from "@/lib/api";
import { fromLocalInputValue } from "@/lib/datetime";
import type { TripQuery } from "@/lib/trip-query";

// Mirrors the backend's window (backend/trips/services/plan_trip.py), which stays the authority:
// from now (a departure picked moments ago counts as now) to 48 hours ahead.
const DEPARTURE_GRACE_MS = 5 * 60 * 1000;
const MAX_DEPARTURE_AHEAD_MS = 48 * 60 * 60 * 1000;

export type TripFormValues = {
  origin: Place | null;
  destination: Place | null;
  /** The datetime-local input's value. */
  departureLocal: string;
  loadWeightLb: string;
};

/** Keyed like the API's fields, so the server's errors land on the same inputs. */
export type TripFormField =
  "origin" | "destination" | "departure_at" | "load_weight_lb";
export type TripFormErrors = Partial<Record<TripFormField, string>>;

export type TripFormResult =
  { ok: true; query: TripQuery } | { ok: false; errors: TripFormErrors };

export function validateTripForm(
  values: TripFormValues,
  now: Date,
): TripFormResult {
  const departure = fromLocalInputValue(values.departureLocal);
  const load =
    values.loadWeightLb.trim() === ""
      ? Number.NaN
      : Number(values.loadWeightLb);
  const errors: TripFormErrors = {};

  if (!values.origin) errors.origin = "Pick the origin from the suggestions";
  if (!values.destination) {
    errors.destination = "Pick the destination from the suggestions";
  }
  if (!departure) {
    errors.departure_at = "Enter the departure date and time";
  } else if (!isWithinDepartureWindow(departure, now)) {
    errors.departure_at = "Departure must be between now and 48 hours from now";
  }
  if (Number.isNaN(load)) {
    errors.load_weight_lb = "Enter the load weight in pounds";
  } else if (load <= 0) {
    errors.load_weight_lb = "Load weight must be more than 0 lb";
  }

  const { origin, destination } = values;
  if (origin && destination && departure && Object.keys(errors).length === 0) {
    return {
      ok: true,
      query: {
        origin,
        destination,
        departureAt: departure.toISOString(),
        loadWeightLb: load,
      },
    };
  }
  return { ok: false, errors };
}

function isWithinDepartureWindow(departure: Date, now: Date): boolean {
  const offset = departure.getTime() - now.getTime();
  return offset >= -DEPARTURE_GRACE_MS && offset <= MAX_DEPARTURE_AHEAD_MS;
}
