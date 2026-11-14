import { useState, type FormEvent } from "react";

import { FieldError } from "@/components/field-error";
import { PlaceField } from "@/components/trip-planner/place-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Place } from "@/lib/api";
import {
  fromZonedInputValue,
  toZonedInputValue,
  zoneAbbreviation,
} from "@/lib/datetime";
import {
  LOAD_UNITS,
  fromPounds,
  maxLoad,
  toPounds,
  type LoadUnit,
} from "@/lib/load";
import {
  departureZone,
  validateTripForm,
  type TripFormErrors,
  type TripFormField,
} from "@/lib/trip-form";
import type { TripQuery } from "@/lib/trip-query";
import { cn } from "@/lib/utils";

const MAX_DEPARTURE_AHEAD_MS = 48 * 60 * 60 * 1000;

type Props = {
  initial: TripQuery;
  onSubmit: (query: TripQuery) => void;
  /** The API's objections to the last plan, keyed by field. */
  serverErrors: TripFormErrors;
  pending: boolean;
};

export function TripForm({ initial, onSubmit, serverErrors, pending }: Props) {
  const now = new Date();
  const [origin, setOrigin] = useState(initial.origin);
  const [destination, setDestination] = useState(initial.destination);
  const zone = departureZone(origin);
  const [departureLocal, setDepartureLocal] = useState(() =>
    toZonedInputValue(
      initial.departureAt ? new Date(initial.departureAt) : now,
      departureZone(initial.origin),
    ),
  );
  const [loadUnit, setLoadUnit] = useState<LoadUnit>("lb");
  const [loadAmount, setLoadAmount] = useState(
    initial.loadWeightLb ? String(initial.loadWeightLb) : "",
  );
  const [errors, setErrors] = useState<TripFormErrors>({});

  const errorFor = (field: TripFormField) =>
    errors[field] ?? serverErrors[field];

  /** A new origin may be in another time zone: keep the same departure moment. */
  function changeOrigin(place: Place | null) {
    const departure = fromZonedInputValue(departureLocal, zone);
    setOrigin(place);
    if (departure) {
      setDepartureLocal(toZonedInputValue(departure, departureZone(place)));
    }
  }

  /** Switching units converts what's typed, so the load stays the same. */
  function changeLoadUnit(unit: LoadUnit) {
    const amount = Number(loadAmount);
    if (loadAmount.trim() !== "" && Number.isFinite(amount)) {
      setLoadAmount(String(fromPounds(toPounds(amount, loadUnit), unit)));
    }
    setLoadUnit(unit);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateTripForm(
      { origin, destination, departureLocal, loadAmount, loadUnit },
      new Date(),
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSubmit(result.query);
  }

  const departureError = errorFor("departure_at");
  const loadError = errorFor("load_weight_lb");

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <PlaceField
        id="origin"
        label="Origin"
        value={origin}
        onChange={changeOrigin}
        error={errorFor("origin")}
      />
      <PlaceField
        id="destination"
        label="Destination"
        value={destination}
        onChange={setDestination}
        error={errorFor("destination")}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="departure">
            Departure ({zoneAbbreviation(zone, now)})
          </Label>
          <Input
            id="departure"
            type="datetime-local"
            value={departureLocal}
            min={toZonedInputValue(now, zone)}
            max={toZonedInputValue(
              new Date(now.getTime() + MAX_DEPARTURE_AHEAD_MS),
              zone,
            )}
            onChange={(event) => setDepartureLocal(event.target.value)}
            aria-invalid={departureError ? true : undefined}
            aria-describedby={
              departureError ? "departure-error" : "departure-hint"
            }
          />
          <p id="departure-hint" className="text-xs text-muted-foreground">
            {origin
              ? "Local time at the origin"
              : "US Central time until you pick an origin"}
          </p>
          <FieldError id="departure-error" message={departureError} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="load">Load weight ({loadUnit})</Label>
            <div
              role="group"
              aria-label="Load unit"
              className="inline-flex rounded-md border p-0.5"
            >
              {LOAD_UNITS.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={unit === loadUnit}
                  onClick={() => changeLoadUnit(unit)}
                  className={cn(
                    "rounded px-2 text-xs font-medium text-muted-foreground",
                    unit === loadUnit && "bg-primary text-primary-foreground",
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
          <Input
            id="load"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxLoad(loadUnit)}
            value={loadAmount}
            onChange={(event) => setLoadAmount(event.target.value)}
            aria-invalid={loadError ? true : undefined}
            aria-describedby={loadError ? "load-error" : undefined}
          />
          <FieldError id="load-error" message={loadError} />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Planning…" : "Plan trip"}
      </Button>
    </form>
  );
}
