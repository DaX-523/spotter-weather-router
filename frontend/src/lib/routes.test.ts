import { describe, expect, it } from "vitest";

import { isDrivable, routeName } from "@/lib/routes";
import { TRIP_PLAN } from "@/test/fixtures";

const [WINDY, RECOMMENDED, BLOCKED] = TRIP_PLAN.routes;

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
