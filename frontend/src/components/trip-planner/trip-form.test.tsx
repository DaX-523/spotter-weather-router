import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TripForm } from "@/components/trip-planner/trip-form";
import { searchPlaces } from "@/lib/api";
import type { TripFormErrors } from "@/lib/trip-form";
import type { TripQuery } from "@/lib/trip-query";
import { CHICAGO, DENVER, NOW, TRIP_QUERY } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  searchPlaces: vi.fn(),
}));

const EMPTY: TripQuery = {
  origin: null,
  destination: null,
  departureAt: null,
  loadWeightLb: null,
};

function renderForm(
  props: {
    initial?: TripQuery;
    serverErrors?: TripFormErrors;
    pending?: boolean;
  } = {},
) {
  const onSubmit = vi.fn();
  renderWithProviders(
    <TripForm
      initial={props.initial ?? EMPTY}
      serverErrors={props.serverErrors ?? {}}
      pending={props.pending ?? false}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit };
}

async function pick(
  user: ReturnType<typeof userEvent.setup>,
  field: string,
  text: string,
  name: string,
) {
  await user.type(screen.getByLabelText(field), text);
  await user.click(await screen.findByRole("button", { name }));
}

describe("TripForm", () => {
  beforeEach(() => {
    // Only the clock is fake: the place search's debounce still runs on real timers.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.mocked(searchPlaces).mockImplementation(async (query) =>
      query.startsWith("Chi") ? [CHICAGO] : [DENVER],
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts from the trip in the URL", () => {
    renderForm({ initial: TRIP_QUERY });

    expect(screen.getByLabelText("Origin")).toHaveValue("Chicago, IL");
    expect(screen.getByLabelText("Destination")).toHaveValue("Denver, CO");
    expect(screen.getByLabelText("Departure")).toHaveValue("2026-11-14T09:00");
    expect(screen.getByLabelText("Load weight (lb)")).toHaveValue(30_000);
  });

  it("departs now unless told otherwise", () => {
    renderForm();

    expect(screen.getByLabelText("Departure")).toHaveValue("2026-11-14T09:00");
  });

  it("plans the trip once everything is filled in", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await pick(user, "Origin", "Chicago", "Chicago, IL");
    await pick(user, "Destination", "Denver", "Denver, CO");
    await user.type(screen.getByLabelText("Load weight (lb)"), "30000");
    await user.click(screen.getByRole("button", { name: "Plan trip" }));

    expect(onSubmit).toHaveBeenCalledWith(TRIP_QUERY);
  });

  it("explains what is missing instead of planning", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: "Plan trip" }));

    expect(screen.getByLabelText("Origin")).toHaveAccessibleDescription(
      "Pick the origin from the suggestions",
    );
    expect(
      screen.getByLabelText("Load weight (lb)"),
    ).toHaveAccessibleDescription("Enter the load weight in pounds");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the server's objections on the right fields", () => {
    renderForm({
      initial: TRIP_QUERY,
      serverErrors: {
        departure_at: "Departure must be between now and 48 hours from now",
      },
    });

    expect(screen.getByLabelText("Departure")).toHaveAccessibleDescription(
      "Departure must be between now and 48 hours from now",
    );
  });

  it("cannot be sent again while a plan is on its way", () => {
    renderForm({ initial: TRIP_QUERY, pending: true });

    expect(screen.getByRole("button", { name: "Planning…" })).toBeDisabled();
  });

  it("checks a departure the driver changes", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initial: TRIP_QUERY });

    await user.clear(screen.getByLabelText("Departure"));
    await user.type(screen.getByLabelText("Departure"), "2026-11-17T09:00");
    await user.click(screen.getByRole("button", { name: "Plan trip" }));

    expect(screen.getByLabelText("Departure")).toHaveAccessibleDescription(
      "Departure must be between now and 48 hours from now",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
