import { describe, expect, it } from "vitest";

import {
  fromZonedInputValue,
  isValidTimeZone,
  toZonedInputValue,
  zoneAbbreviation,
} from "@/lib/datetime";

// Tests run in Chicago; these zones are all different from it, or from each other in summer.
const NOVEMBER = new Date("2026-11-14T15:00:00Z");
const JULY = new Date("2026-07-01T15:00:00Z");

describe("toZonedInputValue", () => {
  it.each([
    ["America/New_York", NOVEMBER, "2026-11-14T10:00"],
    ["America/Chicago", NOVEMBER, "2026-11-14T09:00"],
    ["America/Denver", JULY, "2026-07-01T09:00"],
    ["America/Phoenix", JULY, "2026-07-01T08:00"],
    ["America/Los_Angeles", NOVEMBER, "2026-11-14T07:00"],
  ])(
    "shows a moment as the local date and time in %s",
    (zone, moment, expected) => {
      expect(toZonedInputValue(moment, zone)).toBe(expected);
    },
  );

  it("drops the seconds", () => {
    expect(
      toZonedInputValue(new Date("2026-11-14T15:00:59Z"), "America/Chicago"),
    ).toBe("2026-11-14T09:00");
  });
});

describe("fromZonedInputValue", () => {
  it.each([
    ["America/New_York", "2026-11-14T10:00", "2026-11-14T15:00:00.000Z"],
    ["America/Denver", "2026-07-01T09:00", "2026-07-01T15:00:00.000Z"],
    ["America/Phoenix", "2026-07-01T08:00", "2026-07-01T15:00:00.000Z"],
    // Daylight saving time starts on March 8 and ends on November 1, 2026.
    ["America/Chicago", "2026-03-08T12:00", "2026-03-08T17:00:00.000Z"],
    ["America/Chicago", "2026-11-01T12:00", "2026-11-01T18:00:00.000Z"],
  ])("reads a local date and time in %s", (zone, value, expected) => {
    expect(fromZonedInputValue(value, zone)?.toISOString()).toBe(expected);
  });

  it.each(["", "tomorrow morning", "2026-11-14"])(
    "returns null for %j",
    (value) => {
      expect(fromZonedInputValue(value, "America/Chicago")).toBeNull();
    },
  );
});

describe("zoneAbbreviation", () => {
  it.each([
    ["America/Chicago", NOVEMBER, "CST"],
    ["America/Denver", JULY, "MDT"],
    ["America/Phoenix", JULY, "MST"],
    ["America/New_York", NOVEMBER, "EST"],
  ])("names %s's time as drivers see it", (zone, moment, expected) => {
    expect(zoneAbbreviation(zone, moment)).toBe(expected);
  });
});

describe("isValidTimeZone", () => {
  it.each([
    ["America/Chicago", true],
    ["Mars/Olympus_Mons", false],
    ["", false],
  ])("says whether %j is a time zone", (zone, expected) => {
    expect(isValidTimeZone(zone)).toBe(expected);
  });
});
