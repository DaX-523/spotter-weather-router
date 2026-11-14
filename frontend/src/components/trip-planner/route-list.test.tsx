import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RouteList } from "@/components/trip-planner/route-list";
import { TRIP_PLAN } from "@/test/fixtures";

function renderList(selectedRouteId = 0) {
  const onSelect = vi.fn();
  render(
    <RouteList
      routes={TRIP_PLAN.routes}
      selectedRouteId={selectedRouteId}
      onSelect={onSelect}
    />,
  );
  return { onSelect };
}

describe("RouteList", () => {
  it("summarises each route", () => {
    renderList();

    const first = screen.getByRole("button", { name: /Route 1/ });
    expect(first).toHaveTextContent("1,004 mi · 15 h");
    expect(first).toHaveTextContent("Arrives Sun, 12:00 AM CST");
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("marks the selected route", () => {
    renderList(1);

    expect(screen.getByRole("button", { name: /Route 2/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Route 1/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("selects a route when the driver picks it", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderList();

    await user.click(screen.getByRole("button", { name: /Route 3/ }));

    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
