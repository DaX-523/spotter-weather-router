import { describe, expect, it } from "vitest";

import { fromPounds, maxLoad, toPounds } from "@/lib/load";

describe("toPounds", () => {
  it.each([
    [30_000, "lb", 30_000],
    [10_000, "kg", 22_046],
    [36_287, "kg", 79_999],
  ] as const)("reads %d %s as %d lb", (amount, unit, expected) => {
    expect(toPounds(amount, unit)).toBe(expected);
  });
});

describe("fromPounds", () => {
  it.each([
    [30_000, "lb", 30_000],
    [30_000, "kg", 13_608],
  ] as const)("shows %d lb as %d %s", (pounds, unit, expected) => {
    expect(fromPounds(pounds, unit)).toBe(expected);
  });
});

describe("maxLoad", () => {
  it.each([
    ["lb", 80_000],
    // Rounded down, so the most a driver can enter in kg is still within 80,000 lb.
    ["kg", 36_287],
  ] as const)("is the federal limit in %s", (unit, expected) => {
    expect(maxLoad(unit)).toBe(expected);
  });
});
