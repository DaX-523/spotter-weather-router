import { afterEach, describe, expect, it } from "vitest";

import { themeColor } from "@/lib/theme";

describe("themeColor", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--map-route");
  });

  it("reads a theme token's current value", () => {
    document.documentElement.style.setProperty(
      "--map-route",
      " oklch(0.55 0.2 262) ",
    );

    expect(themeColor("map-route")).toBe("oklch(0.55 0.2 262)");
  });
});
