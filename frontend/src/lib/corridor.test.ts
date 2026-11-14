import { describe, expect, it } from "vitest";

import type { RiskLevel } from "@/lib/api";
import {
  CORRIDOR_HOURS,
  corridorPeak,
  corridorRadiusMeters,
  forecastHourLabel,
  hourOffsetLabel,
  hourlyWorst,
  levelCounts,
  sliderHour,
  worstLevel,
} from "@/lib/corridor";
import { TRIP_PLAN } from "@/test/fixtures";

const START = "2026-11-14T15:00:00Z"; // 9:00 AM in Chicago

describe("forecastHourLabel", () => {
  it.each([
    [0, "Now · Sat, 9:00 AM CST"],
    [1, "+1 h · Sat, 10:00 AM CST"],
    [CORRIDOR_HOURS, "+48 h · Mon, 9:00 AM CST"],
  ])("labels hour %i as %s in the origin's time", (hour, expected) => {
    expect(forecastHourLabel(START, hour, "America/Chicago")).toBe(expected);
  });

  it("uses the origin's time zone, wherever the driver is", () => {
    expect(forecastHourLabel(START, 0, "America/Denver")).toBe(
      "Now · Sat, 8:00 AM MST",
    );
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

describe("hourOffsetLabel", () => {
  it.each([
    [0, "Now"],
    [6, "+6 h"],
    [CORRIDOR_HOURS, "+48 h"],
  ])("calls hour %i %s", (hour, expected) => {
    expect(hourOffsetLabel(hour)).toBe(expected);
  });
});

describe("worstLevel", () => {
  it.each<[RiskLevel[], RiskLevel]>([
    [["low", "moderate"], "moderate"],
    [["moderate", "high"], "high"],
    [["high", "severe"], "severe"],
    [["severe", "no_travel"], "no_travel"],
    [["low", "unknown"], "unknown"],
    [["moderate", "unknown"], "unknown"],
    [["unknown", "high"], "high"],
  ])("picks the worst of %o: %s", (levels, expected) => {
    expect(worstLevel(levels)).toBe(expected);
  });

  it("calls no levels at all unknown, never low", () => {
    expect(worstLevel([])).toBe("unknown");
  });
});

describe("hourlyWorst", () => {
  it("gives the corridor's worst level for each of its 49 hours", () => {
    expect(hourlyWorst(TRIP_PLAN.corridor)).toEqual([
      ...Array(6).fill("low"),
      ...Array(43).fill("severe"),
    ]);
  });
});

describe("levelCounts", () => {
  it.each([
    [0, [{ level: "low", count: 2 }]],
    [
      6,
      [
        { level: "low", count: 1 },
        { level: "severe", count: 1 },
      ],
    ],
  ])(
    "counts the corridor's checkpoints by level at hour %i",
    (hour, expected) => {
      expect(levelCounts(TRIP_PLAN.corridor, hour)).toEqual(expected);
    },
  );
});

describe("corridorPeak", () => {
  it("finds the worst level ahead and the first hour it is forecast", () => {
    expect(corridorPeak(hourlyWorst(TRIP_PLAN.corridor))).toEqual({
      level: "severe",
      hour: 6,
    });
  });

  it("starts at now when every hour is low risk", () => {
    expect(corridorPeak(Array(49).fill("low"))).toEqual({
      level: "low",
      hour: 0,
    });
  });
});
