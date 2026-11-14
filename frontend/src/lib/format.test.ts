import { describe, expect, it } from "vitest";

import {
  formatClock,
  formatDuration,
  formatMileMarker,
  formatMiles,
  formatPerHour,
  formatWind,
} from "@/lib/format";

describe("formatMiles", () => {
  it.each([
    [0, "0 mi"],
    [49.4, "49 mi"],
    [999.6, "1,000 mi"],
    [1234.4, "1,234 mi"],
  ])("shows %d as %s", (miles, expected) => {
    expect(formatMiles(miles)).toBe(expected);
  });
});

describe("formatMileMarker", () => {
  it.each([
    [0, "Mile 0"],
    [920.3, "Mile 920"],
    [1250, "Mile 1,250"],
  ])("shows %d as %s", (miles, expected) => {
    expect(formatMileMarker(miles)).toBe(expected);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0 min"],
    [2_700, "45 min"],
    [3_599, "1 h"],
    [54_000, "15 h"],
    [55_800, "15 h 30 min"],
  ])("shows %d seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("formatClock", () => {
  it.each([
    ["America/Chicago", "Sun, 12:00 AM CST"],
    ["America/Denver", "Sat, 11:00 PM MST"],
    ["America/New_York", "Sun, 1:00 AM EST"],
  ])(
    "shows the weekday and local time in %s, with the zone",
    (zone, expected) => {
      expect(formatClock("2026-11-15T06:00:00Z", zone)).toBe(expected);
    },
  );
});

// As precise as the forecast, like the backend's hazard reasons, so a value just under a risk
// threshold never looks like it is over it.
describe("formatWind", () => {
  it.each([
    [5, "5 mph"],
    [44.6, "44.6 mph"],
    [null, "Unknown"],
  ])("shows %s as %s", (mph, expected) => {
    expect(formatWind(mph)).toBe(expected);
  });
});

describe("formatPerHour", () => {
  it.each([
    [0, "0.00 in/hr"],
    [0.12, "0.12 in/hr"],
    [0.249, "0.249 in/hr"],
    [1.2, "1.20 in/hr"],
    [null, "Unknown"],
  ])("shows %s as %s", (inches, expected) => {
    expect(formatPerHour(inches)).toBe(expected);
  });
});
