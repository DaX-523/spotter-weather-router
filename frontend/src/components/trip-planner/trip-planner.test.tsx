import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TripMap } from "@/components/map";
import { TripPlanner } from "@/components/trip-planner/trip-planner";
import { ApiError, planTrip, searchPlaces } from "@/lib/api";
import {
  tripQueryToSearch,
  tripRequestFrom,
  type TripQuery,
} from "@/lib/trip-query";
import { CHICAGO, DENVER, NOW, TRIP_PLAN, TRIP_QUERY } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  planTrip: vi.fn(),
  searchPlaces: vi.fn(),
}));
// Leaflet needs a real browser; the map's own inputs are what matter here.
vi.mock("@/components/map", () => ({ TripMap: vi.fn(() => null) }));

function visit(query: TripQuery | null) {
  window.history.replaceState(
    null,
    "",
    query ? `/?${tripQueryToSearch(query)}` : "/",
  );
  renderWithProviders(<TripPlanner />);
}

function mapProps() {
  return vi.mocked(TripMap).mock.lastCall?.[0];
}

describe("TripPlanner", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, "", "/");
  });

  it("invites the driver to plan a trip when the URL holds none", () => {
    visit(null);

    expect(screen.getByText(/Choose where you're going/)).toBeInTheDocument();
    expect(planTrip).not.toHaveBeenCalled();
  });

  it("says it is planning while the first plan is on its way", () => {
    vi.mocked(planTrip).mockReturnValue(new Promise(() => {}));

    visit(TRIP_QUERY);

    expect(screen.getByRole("status")).toHaveTextContent("Planning your trip…");
  });

  it("plans the trip in the URL and lists its routes", async () => {
    vi.mocked(planTrip).mockResolvedValue(TRIP_PLAN);

    visit(TRIP_QUERY);

    const routes = await screen.findByRole("list", { name: "Routes" });
    expect(within(routes).getAllByRole("button")).toHaveLength(3);
    expect(planTrip).toHaveBeenCalledWith(tripRequestFrom(TRIP_QUERY));
    expect(
      screen.getByText("Weather checked every 50 mi along each route."),
    ).toBeInTheDocument();
  });

  it("shows every route on the map with the recommended one selected", async () => {
    vi.mocked(planTrip).mockResolvedValue(TRIP_PLAN);

    visit(TRIP_QUERY);
    await screen.findByRole("list", { name: "Routes" });

    expect(mapProps()).toMatchObject({
      routes: TRIP_PLAN.routes,
      selectedRouteId: 1,
    });
  });

  it("says which route is recommended and why", async () => {
    vi.mocked(planTrip).mockResolvedValue(TRIP_PLAN);

    visit(TRIP_QUERY);
    await screen.findByRole("list", { name: "Routes" });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Route 2 is recommended. Fewest miles in severe conditions.",
    );
  });

  it("warns when no route is safe to drive", async () => {
    vi.mocked(planTrip).mockResolvedValue({
      ...TRIP_PLAN,
      recommendation: {
        route_id: null,
        reason:
          "Every route crosses No Travel conditions. Try a later departure.",
      },
    });

    visit(TRIP_QUERY);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No route is safe to drive");
    expect(alert).toHaveTextContent(
      "Every route crosses No Travel conditions. Try a later departure.",
    );
  });

  it("highlights the route the driver picks", async () => {
    vi.mocked(planTrip).mockResolvedValue(TRIP_PLAN);
    const user = userEvent.setup();
    visit(TRIP_QUERY);

    await user.click(await screen.findByRole("button", { name: /Route 3/ }));

    expect(screen.getByRole("button", { name: /Route 3/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(mapProps()?.selectedRouteId).toBe(2);
  });

  it("explains the risk levels", async () => {
    vi.mocked(planTrip).mockResolvedValue(TRIP_PLAN);

    visit(TRIP_QUERY);

    expect(
      await screen.findByRole("list", { name: "Risk levels" }),
    ).toBeInTheDocument();
  });

  it.each([
    [1, "Only 1 route found between these places."],
    [2, "Only 2 routes found between these places."],
  ])("says when only %i route(s) exist", async (count, message) => {
    vi.mocked(planTrip).mockResolvedValue({
      ...TRIP_PLAN,
      routes: TRIP_PLAN.routes.slice(0, count),
    });

    visit(TRIP_QUERY);

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("keeps the last plan on screen while the next one loads", async () => {
    vi.mocked(planTrip)
      .mockResolvedValueOnce(TRIP_PLAN)
      .mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    visit(TRIP_QUERY);
    await screen.findByRole("list", { name: "Routes" });

    await user.clear(screen.getByLabelText("Load weight (lb)"));
    await user.type(screen.getByLabelText("Load weight (lb)"), "20000");
    await user.click(screen.getByRole("button", { name: "Plan trip" }));

    expect(await screen.findByText("Updating…")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Routes" })).toBeInTheDocument();
  });

  it("explains a failed plan and lets the driver try again", async () => {
    vi.mocked(planTrip)
      .mockRejectedValueOnce(
        new ApiError(503, "The weather service is not responding right now"),
      )
      .mockResolvedValueOnce(TRIP_PLAN);
    const user = userEvent.setup();
    visit(TRIP_QUERY);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "The weather service is not responding right now",
    );
    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("list", { name: "Routes" }),
    ).toBeInTheDocument();
  });

  it("shows the server's field errors on the form instead of an alert", async () => {
    vi.mocked(planTrip).mockRejectedValue(
      new ApiError(400, "Check the highlighted fields.", {
        destination:
          "Pick a destination that is a different place from the origin",
      }),
    );

    visit(TRIP_QUERY);

    await vi.waitFor(() =>
      expect(screen.getByLabelText("Destination")).toHaveAccessibleDescription(
        "Pick a destination that is a different place from the origin",
      ),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("puts a submitted trip in the URL and plans it", async () => {
    vi.mocked(planTrip).mockResolvedValue(TRIP_PLAN);
    vi.mocked(searchPlaces).mockImplementation(async (query) =>
      query.startsWith("Chi") ? [CHICAGO] : [DENVER],
    );
    const user = userEvent.setup();
    visit(null);

    await user.type(screen.getByLabelText("Origin"), "Chicago");
    await user.click(
      await screen.findByRole("button", { name: "Chicago, IL" }),
    );
    await user.type(screen.getByLabelText("Destination"), "Denver");
    await user.click(await screen.findByRole("button", { name: "Denver, CO" }));
    await user.type(screen.getByLabelText("Load weight (lb)"), "30000");
    await user.click(screen.getByRole("button", { name: "Plan trip" }));

    expect(window.location.search).toBe(`?${tripQueryToSearch(TRIP_QUERY)}`);
    expect(
      await screen.findByRole("list", { name: "Routes" }),
    ).toBeInTheDocument();
  });
});
