import { useState } from "react";

import { FieldError } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { Place } from "@/lib/api";
import { MIN_QUERY_LENGTH, usePlaceSearch } from "@/queries/places";

// Search once the driver pauses, not on every keystroke.
export const SEARCH_DELAY_MS = 250;

type Props = {
  id: string;
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  error?: string;
};

/** A place picked from search suggestions. Typed text alone is never a place. */
export function PlaceField({ id, label, value, onChange, error }: Props) {
  const [text, setText] = useState(value?.name ?? "");
  const query = useDebouncedValue(text.trim(), SEARCH_DELAY_MS);
  const searching = value === null && query.length >= MIN_QUERY_LENGTH;
  const search = usePlaceSearch(searching ? query : "");
  const errorId = `${id}-error`;

  function edit(nextText: string) {
    setText(nextText);
    if (value) onChange(null);
  }

  function choose(place: Place) {
    setText(place.name);
    onChange(place);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={text}
        onChange={(event) => edit(event.target.value)}
        placeholder="US city, address or place"
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {searching && search.data && search.data.length > 0 && (
        <ul
          aria-label={`${label} suggestions`}
          className="divide-y rounded-lg border"
        >
          {search.data.map((place) => (
            <li
              key={`${place.name}|${place.coordinate.lat},${place.coordinate.lon}`}
            >
              <button
                type="button"
                onClick={() => choose(place)}
                className="min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {place.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {searching && search.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No places match “{query}”.
        </p>
      )}
      {searching && search.isError && (
        <p className="text-sm text-destructive">{search.error.message}</p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
