import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "@/app/app";
import { renderWithProviders } from "@/test/render";

vi.mock("@/components/map", () => ({ TripMap: vi.fn(() => null) }));

describe("App", () => {
  it("names the app in its main heading", () => {
    renderWithProviders(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Spotter Weather Router" }),
    ).toBeInTheDocument();
  });

  it("says up front that it plans US routes", () => {
    renderWithProviders(<App />);

    expect(
      within(screen.getByRole("banner")).getByText("US routes only"),
    ).toBeInTheDocument();
  });

  it("opens on the trip planner", () => {
    renderWithProviders(<App />);

    expect(
      screen.getByRole("button", { name: "Plan trip" }),
    ).toBeInTheDocument();
  });
});
