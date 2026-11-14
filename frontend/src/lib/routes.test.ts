import { describe, expect, it } from "vitest";

import { isDrivable, routeName, routeTooltip } from "@/lib/routes";
import { TRIP_PLAN } from "@/test/fixtures";

const [WINDY, RECOMMENDED, BLOCKED] = TRIP_PLAN.routes;

describe("routeTooltip", () => {
  it("names the route, its length and time, and how to pick it", () => {
    expect(routeTooltip(TRIP_PLAN.routes, RECOMMENDED)).toBe(
      "Route 2 · 1,032 mi · 15 h 30 min · click to select",
    );
  });
});

describe("routeName", () => {
  it("numbers routes from 1, in the order they came", () => {
    expect(routeName(TRIP_PLAN.routes, RECOMMENDED.id)).toBe("Route 2");
  });
});

describe("isDrivable", () => {
  it.each([
    ["a severe route", WINDY, true],
    ["a route crossing No Travel conditions", BLOCKED, false],
  ])("is %s drivable", (_, route, expected) => {
    expect(isDrivable(route)).toBe(expected);
  });
});
