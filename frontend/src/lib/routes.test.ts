import { describe, expect, it } from "vitest";

import {
  isDrivable,
  routeName,
  routeTooltip,
  truckPosition,
  truckSummary,
} from "@/lib/routes";
import {
  CLEAR_START,
  TRIP_PLAN,
  UNKNOWN_END,
  WINDY_MILE_50,
} from "@/test/fixtures";

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

// WINDY's checkpoints: mile 0 at 15:00 UTC, mile 50 at 15:45, and mile 920.3 at 06:00 next day.
describe("truckPosition", () => {
  it.each([
    [
      "more than half an hour before it leaves",
      "2026-11-14T14:29:00Z",
      "waiting",
      CLEAR_START,
    ],
    [
      "half an hour before it leaves",
      "2026-11-14T14:30:00Z",
      "driving",
      CLEAR_START,
    ],
    [
      "closer to one checkpoint's ETA",
      "2026-11-14T15:30:00Z",
      "driving",
      WINDY_MILE_50,
    ],
    [
      "halfway between two ETAs",
      "2026-11-14T15:22:30Z",
      "driving",
      CLEAR_START,
    ],
    [
      "half an hour after it arrives",
      "2026-11-15T06:30:00Z",
      "driving",
      UNKNOWN_END,
    ],
    [
      "more than half an hour after it arrives",
      "2026-11-15T06:31:00Z",
      "arrived",
      UNKNOWN_END,
    ],
  ])("places the truck %s", (_, at, state, checkpoint) => {
    expect(truckPosition(WINDY, at)).toEqual({ state, checkpoint });
  });
});

describe("truckSummary", () => {
  it.each([
    ["waiting", CLEAR_START, "Not on the road yet · leaves Sat, 9:00 AM CST"],
    ["driving", WINDY_MILE_50, "Mile 50 of 1,004 mi · ETA Sat, 9:45 AM CST"],
    ["arrived", UNKNOWN_END, "Arrived · Sat, 11:00 PM MST"],
  ] as const)(
    "says where the truck is when %s, in local time",
    (state, checkpoint, expected) => {
      expect(truckSummary(WINDY, { state, checkpoint })).toBe(expected);
    },
  );
});
