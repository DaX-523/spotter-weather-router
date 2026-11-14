import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ForecastSlider } from "@/components/trip-planner/forecast-slider";
import { forecastSlider } from "@/test/queries";

const START = "2026-11-14T15:00:00Z"; // 9:00 AM in Chicago

function Harness({ onChange }: { onChange: (hour: number) => void }) {
  const [hour, setHour] = useState(0);
  return (
    <ForecastSlider
      startAt={START}
      hour={hour}
      onChange={(next) => {
        setHour(next);
        onChange(next);
      }}
    />
  );
}

function renderSlider() {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  return { onChange, slider: forecastSlider() };
}

describe("ForecastSlider", () => {
  it("starts at now", () => {
    renderSlider();

    expect(screen.getByText("Now · Sat, 9:00 AM CST")).toBeInTheDocument();
  });

  it("is labelled for screen readers", () => {
    const { slider } = renderSlider();

    const labelId = slider.getAttribute("aria-labelledby") ?? "";
    expect(document.getElementById(labelId)).toHaveTextContent("Forecast hour");
  });

  it("steps an hour at a time from the keyboard", async () => {
    const user = userEvent.setup();
    const { onChange, slider } = renderSlider();

    slider.focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByText("+1 h · Sat, 10:00 AM CST")).toBeInTheDocument();
  });

  it("reaches 48 hours ahead and no further", async () => {
    const user = userEvent.setup();
    const { onChange, slider } = renderSlider();

    slider.focus();
    await user.keyboard("{End}{ArrowRight}");

    expect(onChange).toHaveBeenLastCalledWith(48);
    expect(screen.getByText("+48 h · Mon, 9:00 AM CST")).toBeInTheDocument();
  });
});
