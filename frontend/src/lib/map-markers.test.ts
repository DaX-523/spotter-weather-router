import { describe, expect, it } from "vitest";

import { markerHtml } from "@/lib/map-markers";

function render(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

describe("markerHtml", () => {
  it("draws the symbol inside a marker coloured for its level", () => {
    const marker = render(markerHtml("snow", "severe"));

    expect(marker).toHaveClass("risk-marker");
    expect(marker).toHaveAttribute("data-level", "severe");
    expect(marker.querySelector("svg")).toHaveClass("lucide-snowflake");
  });

  it.each([
    ["wind", "lucide-wind"],
    ["rain", "lucide-cloud-rain"],
    ["no-travel", "lucide-octagon-x"],
    ["unknown", "lucide-circle-question-mark"],
  ] as const)("uses a distinct symbol for %s", (symbol, iconClass) => {
    expect(render(markerHtml(symbol, "high")).querySelector("svg")).toHaveClass(
      iconClass,
    );
  });

  it("hides the drawing from screen readers; the marker's title names the risk", () => {
    expect(render(markerHtml("wind", "high"))).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
