import { describe, expect, it } from "vitest";

import { fromLocalInputValue, toLocalInputValue } from "@/lib/datetime";

describe("toLocalInputValue", () => {
  it("formats a moment as the driver's local date and time, to the minute", () => {
    expect(toLocalInputValue(new Date("2026-11-14T15:00:59Z"))).toBe(
      "2026-11-14T09:00",
    );
  });
});

describe("fromLocalInputValue", () => {
  it("reads a local date and time", () => {
    expect(fromLocalInputValue("2026-11-14T09:00")).toEqual(
      new Date("2026-11-14T15:00:00Z"),
    );
  });

  it.each(["", "tomorrow morning"])("returns null for %j", (value) => {
    expect(fromLocalInputValue(value)).toBeNull();
  });
});
