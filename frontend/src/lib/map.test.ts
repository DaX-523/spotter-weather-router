import { describe, expect, it } from "vitest";

import {
  boundsOf,
  checkpointTooltip,
  fitPadding,
  selectedRouteId,
  toLatLng,
} from "@/lib/map";
import { CLEAR_START, TRIP_PLAN, WINDY_MILE_50 } from "@/test/fixtures";

const { routes } = TRIP_PLAN;

describe("toLatLng", () => {
  it("orders a point the way Leaflet expects: latitude first", () => {
    expect(toLatLng({ lat: 41.8781, lon: -87.6298 })).toEqual([
      41.8781, -87.6298,
    ]);
  });
});

describe("boundsOf", () => {
  it("spans every point of every route", () => {
    expect(boundsOf(routes)).toEqual([
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
    expect(selectedRouteId(routes, 2, 1)).toBe(2);
  });

  it.each([
    ["nothing is chosen", null],
    ["the chosen route is gone", 7],
  ])("falls back to the recommended route when %s", (_, chosen) => {
    expect(selectedRouteId(routes, chosen, 1)).toBe(1);
  });

  it("falls back to the first route when none is recommended", () => {
    expect(selectedRouteId(routes, null, null)).toBe(0);
  });

  it("is null without routes", () => {
    expect(selectedRouteId([], 1, 1)).toBeNull();
  });
});

describe("fitPadding", () => {
  it.each([
    ["a tall map", 850, 200],
    [
      "the shortest map that fits the routes above the forecast panel",
      512,
      200,
    ],
    ["a map just too short for that", 511, 32],
    ["a phone's map", 506, 32],
  ])("frames the routes on %s", (_, mapHeightPx, bottomPx) => {
    expect(fitPadding(mapHeightPx)).toEqual({
      paddingTopLeft: [32, 32],
      paddingBottomRight: [32, bottomPx],
    });
  });
});

describe("checkpointTooltip", () => {
  it("says what the risk is, why, and where and when the truck is there", () => {
    expect(checkpointTooltip(WINDY_MILE_50)).toEqual({
      heading: "Severe · wind",
      lines: [
        "Wind 48 mph",
        "Rain 0.12 in/hr",
        "Mile 50 · ETA Sat, 9:45 AM CST",
        "Click for details",
      ],
    });
  });

  it("keeps a low-risk checkpoint short", () => {
    expect(checkpointTooltip(CLEAR_START)).toEqual({
      heading: "Low risk",
      lines: ["Mile 0 · ETA Sat, 9:00 AM CST", "Click for details"],
    });
  });
});
