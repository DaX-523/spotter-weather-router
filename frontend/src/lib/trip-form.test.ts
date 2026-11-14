import { describe, expect, it } from "vitest";

import {
  departureZone,
  validateTripForm,
  type TripFormValues,
} from "@/lib/trip-form";
import { CHICAGO, DENVER, NOW, TRIP_QUERY } from "@/test/fixtures";

// NOW is 9:00 AM in Chicago, the origin's time zone.
const VALUES: TripFormValues = {
  origin: CHICAGO,
  destination: DENVER,
  departureLocal: "2026-11-14T09:00",
  loadAmount: "30000",
  loadUnit: "lb",
};

describe("departureZone", () => {
  it("is the origin's time zone", () => {
    expect(departureZone(DENVER)).toBe("America/Denver");
  });

  it("is US Central time until an origin is picked", () => {
    expect(departureZone(null)).toBe("America/Chicago");
  });
});

describe("validateTripForm", () => {
  it("turns a complete form into the trip query", () => {
    expect(validateTripForm(VALUES, NOW)).toEqual({
      ok: true,
      query: TRIP_QUERY,
    });
  });

  it("reads the departure in the origin's local time", () => {
    // 8:00 AM in Denver is 9:00 AM in Chicago: the same moment as NOW.
    const result = validateTripForm(
      {
        ...VALUES,
        origin: DENVER,
        destination: CHICAGO,
        departureLocal: "2026-11-14T08:00",
      },
      NOW,
    );

    expect(result.ok && result.query.departureAt).toBe(
      "2026-11-14T15:00:00.000Z",
    );
  });

  it("takes the load in kilograms and plans in pounds", () => {
    const result = validateTripForm(
      { ...VALUES, loadAmount: "10000", loadUnit: "kg" },
      NOW,
    );

    // 10,000 kg is 22,046.2 lb.
    expect(result.ok && result.query.loadWeightLb).toBe(22_046);
  });

  it.each([
    ["5 minutes ago", "2026-11-14T08:55"],
    ["48 hours ahead", "2026-11-16T09:00"],
  ])("accepts a departure %s", (_, departureLocal) => {
    expect(validateTripForm({ ...VALUES, departureLocal }, NOW).ok).toBe(true);
  });

  it.each([
    ["80,000 lb", "80000", "lb"],
    ["36,287 kg", "36287", "kg"],
  ] as const)("accepts a load of exactly %s", (_, loadAmount, loadUnit) => {
    expect(validateTripForm({ ...VALUES, loadAmount, loadUnit }, NOW).ok).toBe(
      true,
    );
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
      { loadAmount: "" },
      { load_weight_lb: "Enter the load weight" },
    ],
    [
      "a load of zero",
      { loadAmount: "0" },
      { load_weight_lb: "Load weight must be more than 0 lb" },
    ],
    [
      "a load over the federal limit",
      { loadAmount: "80001" },
      {
        load_weight_lb:
          "Load weight can be at most 80,000 lb, the federal limit",
      },
    ],
    [
      "a load in the trillions",
      { loadAmount: "183024823092434" },
      {
        load_weight_lb:
          "Load weight can be at most 80,000 lb, the federal limit",
      },
    ],
    [
      "a load over the limit in kilograms",
      { loadAmount: "36288", loadUnit: "kg" as const },
      {
        load_weight_lb:
          "Load weight can be at most 36,287 kg, the federal limit",
      },
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
      loadAmount: "",
      loadUnit: "lb",
    };

    expect(validateTripForm(empty, NOW)).toEqual({
      ok: false,
      errors: {
        origin: "Pick the origin from the suggestions",
        destination: "Pick the destination from the suggestions",
        departure_at: "Enter the departure date and time",
        load_weight_lb: "Enter the load weight",
      },
    });
  });
});
