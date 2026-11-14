import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CheckpointDetails } from "@/components/trip-planner/checkpoint-details";
import { TRIP_PLAN } from "@/test/fixtures";

const [, MILE_50] = TRIP_PLAN.routes[0].checkpoints;

/** The <dd> that follows a <dt>. */
function detail(term: string) {
  return screen.getByText(term, { selector: "dt" }).nextElementSibling;
}

describe("CheckpointDetails", () => {
  it("names the checkpoint by its mile marker", () => {
    render(<CheckpointDetails checkpoint={MILE_50} />);

    expect(screen.getByText("Mile 50")).toBeInTheDocument();
  });

  it("shows when the truck gets there and the weather it meets", () => {
    render(<CheckpointDetails checkpoint={MILE_50} />);

    expect(detail("ETA")).toHaveTextContent("Sat, 9:45 AM CST");
    expect(detail("Wind")).toHaveTextContent("26 mph");
    expect(detail("Rain")).toHaveTextContent("0.12 in/hr");
    expect(detail("Snow")).toHaveTextContent("Unknown");
  });
});
