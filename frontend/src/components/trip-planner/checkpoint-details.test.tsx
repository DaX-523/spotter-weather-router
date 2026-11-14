import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CheckpointDetails } from "@/components/trip-planner/checkpoint-details";
import { CLEAR_START, UNKNOWN_END, WINDY_MILE_50 } from "@/test/fixtures";

/** The <dd> that follows a <dt>. */
function detail(term: string) {
  return screen.getByText(term, { selector: "dt" }).nextElementSibling;
}

describe("CheckpointDetails", () => {
  it("names the checkpoint by its mile marker and its risk", () => {
    render(<CheckpointDetails checkpoint={WINDY_MILE_50} />);

    expect(screen.getByText("Mile 50")).toBeInTheDocument();
    expect(screen.getByText("Severe")).toBeInTheDocument();
  });

  it("shows when the truck gets there and the weather it meets", () => {
    render(<CheckpointDetails checkpoint={WINDY_MILE_50} />);

    expect(detail("ETA")).toHaveTextContent("Sat, 9:45 AM CST");
    expect(detail("Wind")).toHaveTextContent("48 mph");
    expect(detail("Rain")).toHaveTextContent("0.12 in/hr");
    expect(detail("Snow")).toHaveTextContent("0.00 in/hr");
  });

  it("explains what makes the checkpoint risky, worst first", () => {
    render(<CheckpointDetails checkpoint={WINDY_MILE_50} />);

    const hazards = screen.getByRole("list", { name: "Hazards" });
    expect(
      within(hazards)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Wind 48 mph", "Rain 0.12 in/hr"]);
  });

  it("says why a risk is unknown", () => {
    render(<CheckpointDetails checkpoint={UNKNOWN_END} />);

    expect(detail("Wind")).toHaveTextContent("Unknown");
    expect(screen.getByText("No wind forecast")).toBeInTheDocument();
  });

  it("lists no hazards where the risk is low", () => {
    render(<CheckpointDetails checkpoint={CLEAR_START} />);

    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Hazards" }),
    ).not.toBeInTheDocument();
  });
});
