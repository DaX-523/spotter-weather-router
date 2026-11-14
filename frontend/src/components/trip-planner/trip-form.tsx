import { useState, type FormEvent } from "react";

import { FieldError } from "@/components/field-error";
import { PlaceField } from "@/components/trip-planner/place-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalInputValue } from "@/lib/datetime";
import {
  validateTripForm,
  type TripFormErrors,
  type TripFormField,
} from "@/lib/trip-form";
import type { TripQuery } from "@/lib/trip-query";

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
  const [departureLocal, setDepartureLocal] = useState(() =>
    toLocalInputValue(
      initial.departureAt ? new Date(initial.departureAt) : now,
    ),
  );
  const [loadWeightLb, setLoadWeightLb] = useState(
    initial.loadWeightLb ? String(initial.loadWeightLb) : "",
  );
  const [errors, setErrors] = useState<TripFormErrors>({});

  const errorFor = (field: TripFormField) =>
    errors[field] ?? serverErrors[field];

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateTripForm(
      { origin, destination, departureLocal, loadWeightLb },
      new Date(),
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSubmit(result.query);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <PlaceField
        id="origin"
        label="Origin"
        value={origin}
        onChange={setOrigin}
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
          <Label htmlFor="departure">Departure</Label>
          <Input
            id="departure"
            type="datetime-local"
            value={departureLocal}
            min={toLocalInputValue(now)}
            max={toLocalInputValue(
              new Date(now.getTime() + MAX_DEPARTURE_AHEAD_MS),
            )}
            onChange={(event) => setDepartureLocal(event.target.value)}
            aria-invalid={errorFor("departure_at") ? true : undefined}
            aria-describedby={
              errorFor("departure_at") ? "departure-error" : undefined
            }
          />
          <FieldError id="departure-error" message={errorFor("departure_at")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="load">Load weight (lb)</Label>
          <Input
            id="load"
            type="number"
            inputMode="numeric"
            min={1}
            value={loadWeightLb}
            onChange={(event) => setLoadWeightLb(event.target.value)}
            aria-invalid={errorFor("load_weight_lb") ? true : undefined}
            aria-describedby={
              errorFor("load_weight_lb") ? "load-error" : undefined
            }
          />
          <FieldError id="load-error" message={errorFor("load_weight_lb")} />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Planning…" : "Plan trip"}
      </Button>
    </form>
  );
}
