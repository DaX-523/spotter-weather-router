import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ForecastPanel } from "@/components/trip-planner/forecast-panel";
import type { Corridor } from "@/lib/api";
import { TRIP_PLAN } from "@/test/fixtures";
import { forecastSlider } from "@/test/queries";

// Hour 0 is 9:00 AM in Chicago. One checkpoint is clear; the other turns severe at +6 h.
const STORMY = TRIP_PLAN.corridor;
const CALM: Corridor = {
  start_at: STORMY.start_at,
  points: STORMY.points.map((point) => ({
    ...point,
    levels: Array(49).fill("low"),
    hazards: Array(49).fill([]),
  })),
};
// Checkpoints at mile 0 (9:00 AM), mile 50 (9:45 AM) and mile 920 (11:00 PM MST).
const WINDY_ROUTE = TRIP_PLAN.routes[0];

function Harness({
  corridor,
  onChange,
}: {
  corridor: Corridor;
  onChange: (hour: number) => void;
}) {
  const [hour, setHour] = useState(0);
  return (
    <ForecastPanel
      corridor={corridor}
      timeZone="America/Chicago"
      hour={hour}
      onChange={(next) => {
        setHour(next);
        onChange(next);
      }}
      route={WINDY_ROUTE}
      routeName="Route 1"
    />
  );
}

function renderPanel(corridor: Corridor = STORMY) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(
    <Harness corridor={corridor} onChange={onChange} />,
  );
  return { onChange, rerender, slider: forecastSlider(), user };
}

/** The peek runs on timers. They also move with real time, so user-event's own waits finish. */
function renderWithPeekTimers() {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout"],
    shouldAdvanceTime: true,
  });
  const onChange = vi.fn();
  const user = userEvent.setup({
    advanceTimers: (ms) => vi.advanceTimersByTime(ms),
  });
  const { rerender } = render(
    <Harness corridor={STORMY} onChange={onChange} />,
  );
  return { onChange, rerender, user };
}

function detailsToggle() {
  return screen.getByRole("button", { name: "Forecast details" });
}

function details() {
  return screen.getByRole("region", { name: "Forecast details" });
}

function countsAtThisHour() {
  const list = screen.getByRole("list", { name: "Checkpoints at this hour" });
  return within(list)
    .getAllByRole("listitem")
    .map((item) => item.textContent);
}

describe("ForecastPanel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts at now", () => {
    renderPanel();

    expect(screen.getByText("Now · Sat, 9:00 AM CST")).toBeInTheDocument();
  });

  it("is labelled for screen readers", () => {
    const { slider } = renderPanel();

    const labelId = slider.getAttribute("aria-labelledby") ?? "";
    expect(document.getElementById(labelId)).toHaveTextContent("Forecast hour");
  });

  it("steps an hour at a time from the keyboard", async () => {
    const { onChange, slider, user } = renderPanel();

    slider.focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByText("+1 h · Sat, 10:00 AM CST")).toBeInTheDocument();
  });

  it("reaches 48 hours ahead and no further", async () => {
    const { onChange, slider, user } = renderPanel();

    slider.focus();
    await user.keyboard("{End}{ArrowRight}");

    expect(onChange).toHaveBeenLastCalledWith(48);
    expect(screen.getByText("+48 h · Mon, 9:00 AM CST")).toBeInTheDocument();
  });

  it("counts the checkpoints at each level for the hour on the slider", async () => {
    const { slider, user } = renderPanel();
    await user.click(detailsToggle());
    expect(countsAtThisHour()).toEqual(["Low 2"]);

    slider.focus();
    await user.keyboard("{End}");

    expect(countsAtThisHour()).toEqual(["Low 1", "Severe 1"]);
  });

  it("says what makes the corridor risky at the hour on the slider", async () => {
    const { slider, user } = renderPanel();
    await user.click(detailsToggle());
    expect(
      screen.queryByRole("list", { name: "Why at this hour" }),
    ).not.toBeInTheDocument();

    slider.focus();
    await user.keyboard("{End}");

    const reasons = screen.getByRole("list", { name: "Why at this hour" });
    expect(
      within(reasons)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Severe: Wind 48 mph"]);
  });

  it("lists the three worst reasons and counts the rest", async () => {
    const reasons = [
      "Wind 30 mph",
      "Wind 31 mph",
      "Wind 32 mph",
      "Wind 33 mph",
    ];
    const { user } = renderPanel({
      start_at: STORMY.start_at,
      points: reasons.map((reason, index) => ({
        coordinate: { lat: 40 + index, lon: -90 },
        levels: Array(49).fill("moderate"),
        hazards: Array(49).fill([{ kind: "wind", level: "moderate", reason }]),
      })),
    });

    await user.click(detailsToggle());

    const list = screen.getByRole("list", { name: "Why at this hour" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Moderate: Wind 30 mph",
      "Moderate: Wind 31 mph",
      "Moderate: Wind 32 mph",
      "and 1 more",
    ]);
  });

  it("says when every checkpoint stays low risk for all 48 hours", () => {
    renderPanel(CALM);

    expect(
      screen.getByText(/Low risk at every checkpoint for the next 48 hours/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Show/ }),
    ).not.toBeInTheDocument();
  });

  it("points to the first hour with the worst forecast and goes there", async () => {
    const { onChange, user } = renderPanel();
    expect(screen.getByText(/Worst in the next 48 h/)).toHaveTextContent(
      "Worst in the next 48 h: Severe (wind), first at +6 h · Sat, 3:00 PM CST",
    );

    await user.click(
      screen.getByRole("button", { name: "Show +6 h · Sat, 3:00 PM CST" }),
    );

    expect(onChange).toHaveBeenLastCalledWith(6);
    expect(screen.getByText(/Worst in the next 48 h/)).toHaveTextContent(
      "Worst in the next 48 h: Severe (wind), first at +6 h · Sat, 3:00 PM CST",
    );
    expect(
      screen.queryByRole("button", { name: /^Show \+6 h/ }),
    ).not.toBeInTheDocument();
  });

  it("follows the truck along the selected route as the slider moves", async () => {
    const { slider, user } = renderPanel();
    await user.click(detailsToggle());
    expect(screen.getByText("Your truck · Route 1")).toBeInTheDocument();
    expect(
      screen.getByText("Mile 0 of 1,004 mi · ETA Sat, 9:00 AM CST"),
    ).toHaveTextContent("Low");

    slider.focus();
    await user.keyboard("{ArrowRight}");

    expect(
      screen.getByText("Mile 50 of 1,004 mi · ETA Sat, 9:45 AM CST"),
    ).toHaveTextContent("Severe");
  });

  it("says when the truck has arrived", async () => {
    const { slider, user } = renderPanel();
    await user.click(detailsToggle());

    slider.focus();
    await user.keyboard("{End}");

    expect(
      screen.getByText("Arrived · Sat, 11:00 PM MST"),
    ).not.toHaveTextContent("Unknown");
  });

  it("keeps its details folded away until the driver opens them", async () => {
    const { user } = renderPanel();
    expect(detailsToggle()).toHaveAttribute("aria-expanded", "false");
    expect(details()).toHaveAttribute("inert");

    await user.click(detailsToggle());

    expect(detailsToggle()).toHaveAttribute("aria-expanded", "true");
    expect(details()).not.toHaveAttribute("inert");
  });

  it("peeks at its details just after the plan arrives, then folds them away", () => {
    renderWithPeekTimers();

    act(() => vi.advanceTimersByTime(300));
    const peeking = detailsToggle().getAttribute("aria-expanded");
    act(() => vi.advanceTimersByTime(1_300));

    expect(peeking).toBe("true");
    expect(detailsToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the details open when the driver catches the peek", async () => {
    const { user } = renderWithPeekTimers();
    act(() => vi.advanceTimersByTime(300));

    await user.click(detailsToggle());
    act(() => vi.advanceTimersByTime(2_000));

    expect(detailsToggle()).toHaveAttribute("aria-expanded", "true");
  });

  it("closes open details at once, even while the next plan's peek runs", async () => {
    const { onChange, rerender, user } = renderWithPeekTimers();
    await user.click(detailsToggle());
    rerender(<Harness corridor={CALM} onChange={onChange} />);
    act(() => vi.advanceTimersByTime(300));

    await user.click(detailsToggle());

    expect(detailsToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("credits the live forecast to Open-Meteo", () => {
    renderPanel();

    expect(
      screen.getByRole("link", { name: /Live forecast · Open-Meteo/ }),
    ).toHaveAttribute("href", "https://open-meteo.com/");
  });

  it("explains what the shading and the truck ring show", async () => {
    const { user } = renderPanel();

    await user.click(detailsToggle());

    expect(screen.getByText("What am I looking at?")).toBeInTheDocument();
    expect(
      screen.getByText(/The blue ring is where your truck will be/),
    ).toBeInTheDocument();
  });
});
