import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RouteList } from "@/components/trip-planner/route-list";
import { TRIP_PLAN } from "@/test/fixtures";

function renderList(selectedRouteId = 1) {
  const onSelect = vi.fn();
  render(
    <RouteList
      routes={TRIP_PLAN.routes}
      recommendedRouteId={1}
      selectedRouteId={selectedRouteId}
      onSelect={onSelect}
    />,
  );
  return { onSelect };
}

const card = (name: RegExp) => screen.getByRole("button", { name });

describe("RouteList", () => {
  it("summarises each route's distance, time and arrival", () => {
    renderList();

    expect(card(/Route 1/)).toHaveTextContent("1,004 mi · 15 h");
    expect(card(/Route 1/)).toHaveTextContent("Arrives Sun, 12:00 AM CST");
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("shows each route's risk and the miles behind it", () => {
    renderList();

    expect(card(/Route 1/)).toHaveTextContent("Severe");
    expect(card(/Route 1/)).toHaveTextContent(
      "100 mi severe · 870 mi high or unknown",
    );
    expect(card(/Route 2/)).toHaveTextContent("No severe or high-risk miles");
  });

  it("marks the recommended route", () => {
    renderList();

    expect(card(/Route 2/)).toHaveTextContent("Recommended");
    expect(card(/Route 1/)).not.toHaveTextContent("Recommended");
  });

  it("warns that a route crossing No Travel conditions must not be driven", () => {
    renderList();

    expect(card(/Route 3/)).toHaveTextContent(
      "Not allowed: crosses No Travel conditions",
    );
  });

  it("marks the selected route", () => {
    renderList(2);

    expect(card(/Route 3/)).toHaveAttribute("aria-pressed", "true");
    expect(card(/Route 2/)).toHaveAttribute("aria-pressed", "false");
  });

  it("selects a route when the driver picks it", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderList();

    await user.click(card(/Route 3/));

    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
