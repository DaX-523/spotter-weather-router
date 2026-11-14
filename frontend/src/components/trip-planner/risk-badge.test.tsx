import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RiskBadge, RiskLegend } from "@/components/trip-planner/risk-badge";

describe("RiskBadge", () => {
  it("names the level in words, not only in colour", () => {
    render(<RiskBadge level="no_travel" />);

    expect(screen.getByText("No Travel")).toBeInTheDocument();
  });
});

describe("RiskLegend", () => {
  it("lists every risk level", () => {
    render(<RiskLegend />);

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Low", "Moderate", "High", "Severe", "No Travel", "Unknown"]);
  });
});
