import { screen } from "@testing-library/react";

// The forecast slider's thumb. Base UI keeps it hidden until it has measured the track, which
// jsdom never lays out (a browser shows it). A hidden element has no accessible name, so these
// find the app's only slider by role; forecast-panel.test.tsx checks that it is labelled.

export function forecastSlider(): HTMLElement {
  return screen.getByRole("slider", { hidden: true });
}

export function queryForecastSlider(): HTMLElement | null {
  return screen.queryByRole("slider", { hidden: true });
}
