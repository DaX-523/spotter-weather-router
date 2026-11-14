import { describe, expect, it } from "vitest";

import { boundsOf, selectedRouteId, toLatLng } from "@/lib/map";
import { TRIP_PLAN } from "@/test/fixtures";

describe("toLatLng", () => {
  it("orders a point the way Leaflet expects: latitude first", () => {
    expect(toLatLng({ lat: 41.8781, lon: -87.6298 })).toEqual([
      41.8781, -87.6298,
    ]);
  });
});

describe("boundsOf", () => {
  it("spans every point of every route", () => {
    expect(boundsOf(TRIP_PLAN.routes)).toEqual([
      [39.7392, -104.9903],
      [42.5, -87.6298],
    ]);
  });

  it("is null when there is nothing to show", () => {
    expect(boundsOf([])).toBeNull();
  });
});

describe("selectedRouteId", () => {
  it("keeps the driver's choice while that route exists", () => {
    expect(selectedRouteId(TRIP_PLAN.routes, 2)).toBe(2);
  });

  it.each([
    ["nothing is chosen", null],
    ["the chosen route is gone", 7],
  ])("falls back to the first route when %s", (_, chosen) => {
    expect(selectedRouteId(TRIP_PLAN.routes, chosen)).toBe(0);
  });

  it("is null without routes", () => {
    expect(selectedRouteId([], 1)).toBeNull();
  });
});
