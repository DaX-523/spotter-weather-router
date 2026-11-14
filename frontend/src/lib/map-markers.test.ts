import { describe, expect, it } from "vitest";

import {
  checkpointMarkerHtml,
  endpointMarkerHtml,
  truckPositionMarkerHtml,
} from "@/lib/map-markers";

function render(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

describe("checkpointMarkerHtml", () => {
  it("draws a plain dot where the risk is low", () => {
    const marker = render(checkpointMarkerHtml(null, "low"));

    expect(marker).toHaveClass("checkpoint-dot");
    expect(marker.querySelector("svg")).toBeNull();
  });

  it("draws the symbol inside a marker coloured for its level", () => {
    const marker = render(checkpointMarkerHtml("snow", "severe"));

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
    expect(
      render(checkpointMarkerHtml(symbol, "high")).querySelector("svg"),
    ).toHaveClass(iconClass);
  });

  it("hides the drawing from screen readers; the marker's title names the risk", () => {
    expect(render(checkpointMarkerHtml("wind", "high"))).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("endpointMarkerHtml", () => {
  it.each([
    ["origin", "lucide-truck"],
    ["destination", "lucide-flag"],
  ] as const)("marks the %s with its own symbol", (endpoint, iconClass) => {
    const marker = render(endpointMarkerHtml(endpoint, "low"));

    expect(marker).toHaveClass("endpoint-marker");
    expect(marker).toHaveAttribute("data-endpoint", endpoint);
    expect(marker.querySelector("svg")).toHaveClass(iconClass);
  });

  it("carries the risk there, so a storm at either end still shows", () => {
    expect(render(endpointMarkerHtml("destination", "severe"))).toHaveAttribute(
      "data-level",
      "severe",
    );
  });
});

describe("truckPositionMarkerHtml", () => {
  it("rings the checkpoint where the truck is, with a truck on the ring", () => {
    const marker = render(truckPositionMarkerHtml());

    expect(marker).toHaveClass("truck-position");
    expect(marker.querySelector("svg")).toHaveClass("lucide-truck");
  });
});
