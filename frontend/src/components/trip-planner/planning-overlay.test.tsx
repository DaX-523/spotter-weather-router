import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlanningOverlay } from "@/components/trip-planner/planning-overlay";
import { STEP_MS } from "@/lib/planning";

describe("PlanningOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts by finding the routes", () => {
    render(<PlanningOverlay />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Finding truck routes…",
    );
  });

  it("walks through what the planner does while the driver waits", () => {
    render(<PlanningOverlay />);

    act(() => vi.advanceTimersByTime(STEP_MS));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Placing weather checkpoints…",
    );
  });

  it("stays on the last step until the plan arrives", () => {
    render(<PlanningOverlay />);

    act(() => vi.advanceTimersByTime(STEP_MS * 20));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Rating the risk on each route…",
    );
  });
});
