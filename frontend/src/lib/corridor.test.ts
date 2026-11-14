import { describe, expect, it } from "vitest";

import {
  CORRIDOR_HOURS,
  corridorRadiusMeters,
  forecastHourLabel,
  sliderHour,
} from "@/lib/corridor";

const START = "2026-11-14T15:00:00Z"; // 9:00 AM in Chicago

describe("forecastHourLabel", () => {
  it.each([
    [0, "Now · Sat, 9:00 AM CST"],
    [1, "+1 h · Sat, 10:00 AM CST"],
    [CORRIDOR_HOURS, "+48 h · Mon, 9:00 AM CST"],
  ])("labels hour %i as %s", (hour, expected) => {
    expect(forecastHourLabel(START, hour)).toBe(expected);
  });
});

describe("corridorRadiusMeters", () => {
  it.each([
    [10, 9_656],
    [50, 48_280],
  ])(
    "makes neighbouring checkpoints %i mi apart overlap into one band",
    (spacingMi, expected) => {
      expect(corridorRadiusMeters(spacingMi)).toBe(expected);
    },
  );
});

describe("sliderHour", () => {
  it.each([
    [7, 7],
    [[7], 7],
  ])("reads the slider's value %o as hour %i", (value, expected) => {
    expect(sliderHour(value)).toBe(expected);
  });
});
