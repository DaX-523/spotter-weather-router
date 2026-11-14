import { describe, expect, it } from "vitest";

import { validateTripForm, type TripFormValues } from "@/lib/trip-form";
import { CHICAGO, DENVER, NOW, TRIP_QUERY } from "@/test/fixtures";

// NOW is 9:00 AM local time.
const VALUES: TripFormValues = {
  origin: CHICAGO,
  destination: DENVER,
  departureLocal: "2026-11-14T09:00",
  loadWeightLb: "30000",
};

describe("validateTripForm", () => {
  it("turns a complete form into the trip query", () => {
    expect(validateTripForm(VALUES, NOW)).toEqual({
      ok: true,
      query: TRIP_QUERY,
    });
  });

  it.each([
    ["5 minutes ago", "2026-11-14T08:55"],
    ["48 hours ahead", "2026-11-16T09:00"],
  ])("accepts a departure %s", (_, departureLocal) => {
    expect(validateTripForm({ ...VALUES, departureLocal }, NOW).ok).toBe(true);
  });

  it.each([
    [
      "no origin",
      { origin: null },
      { origin: "Pick the origin from the suggestions" },
    ],
    [
      "no destination",
      { destination: null },
      { destination: "Pick the destination from the suggestions" },
    ],
    [
      "no departure",
      { departureLocal: "" },
      { departure_at: "Enter the departure date and time" },
    ],
    [
      "a departure over 5 minutes ago",
      { departureLocal: "2026-11-14T08:54" },
      { departure_at: "Departure must be between now and 48 hours from now" },
    ],
    [
      "a departure over 48 hours ahead",
      { departureLocal: "2026-11-16T09:01" },
      { departure_at: "Departure must be between now and 48 hours from now" },
    ],
    [
      "no load",
      { loadWeightLb: "" },
      { load_weight_lb: "Enter the load weight in pounds" },
    ],
    [
      "a load of zero",
      { loadWeightLb: "0" },
      { load_weight_lb: "Load weight must be more than 0 lb" },
    ],
  ])("explains %s", (_, changes, errors) => {
    expect(validateTripForm({ ...VALUES, ...changes }, NOW)).toEqual({
      ok: false,
      errors,
    });
  });

  it("reports every problem at once", () => {
    const empty: TripFormValues = {
      origin: null,
      destination: null,
      departureLocal: "",
      loadWeightLb: "",
    };

    expect(validateTripForm(empty, NOW)).toEqual({
      ok: false,
      errors: {
        origin: "Pick the origin from the suggestions",
        destination: "Pick the destination from the suggestions",
        departure_at: "Enter the departure date and time",
        load_weight_lb: "Enter the load weight in pounds",
      },
    });
  });
});
