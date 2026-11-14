import { describe, expect, it } from "vitest";

import {
  parseTripQuery,
  tripQueryToSearch,
  tripRequestFrom,
  type TripQuery,
} from "@/lib/trip-query";
import { CHICAGO, DENVER, TRIP_QUERY } from "@/test/fixtures";

const EMPTY: TripQuery = {
  origin: null,
  destination: null,
  departureAt: null,
  loadWeightLb: null,
};

describe("trip query in the URL", () => {
  it("survives a round trip through the URL", () => {
    expect(parseTripQuery(tripQueryToSearch(TRIP_QUERY))).toEqual(TRIP_QUERY);
  });

  it("uses short, readable parameter names", () => {
    const params = new URLSearchParams(tripQueryToSearch(TRIP_QUERY));

    expect(Object.fromEntries(params)).toEqual({
      from: "Chicago, IL",
      from_lat: "41.8781",
      from_lon: "-87.6298",
      to: "Denver, CO",
      to_lat: "39.7392",
      to_lon: "-104.9903",
      depart: "2026-11-14T15:00:00.000Z",
      load: "30000",
    });
  });

  it("leaves out what is not chosen yet", () => {
    expect(tripQueryToSearch({ ...EMPTY, loadWeightLb: 20_000 })).toBe(
      "load=20000",
    );
  });

  it("reads an empty URL as an empty trip", () => {
    expect(parseTripQuery("")).toEqual(EMPTY);
  });

  it.each([
    ["from=Chicago&from_lat=91&from_lon=0", "origin"],
    ["from=Chicago&from_lat=41&from_lon=-181", "origin"],
    ["from=&from_lat=41&from_lon=-87", "origin"],
    ["to=Denver&to_lat=abc&to_lon=-104", "destination"],
    ["depart=yesterday", "departureAt"],
    ["load=0", "loadWeightLb"],
    ["load=-5", "loadWeightLb"],
    ["load=heavy", "loadWeightLb"],
  ] as const)("drops %s", (search, field) => {
    expect(parseTripQuery(search)[field]).toBeNull();
  });

  it("keeps the valid parts of a partly broken URL", () => {
    const query = parseTripQuery(
      `${tripQueryToSearch({ ...EMPTY, origin: CHICAGO })}&load=heavy`,
    );

    expect(query).toEqual({ ...EMPTY, origin: CHICAGO });
  });

  it("normalises the departure to UTC", () => {
    expect(parseTripQuery("depart=2026-11-14T09:00:00-06:00").departureAt).toBe(
      "2026-11-14T15:00:00.000Z",
    );
  });
});

describe("tripRequestFrom", () => {
  it("builds the API request from a complete trip", () => {
    expect(tripRequestFrom(TRIP_QUERY)).toEqual({
      origin: CHICAGO.coordinate,
      destination: DENVER.coordinate,
      departure_at: "2026-11-14T15:00:00.000Z",
      load_weight_lb: 30_000,
    });
  });

  it.each(["origin", "destination", "departureAt", "loadWeightLb"] as const)(
    "needs %s",
    (field) => {
      expect(tripRequestFrom({ ...TRIP_QUERY, [field]: null })).toBeNull();
    },
  );
});
