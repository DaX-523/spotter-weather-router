import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PlaceField,
  SEARCH_DELAY_MS,
} from "@/components/trip-planner/place-field";
import { ApiError, searchPlaces, type Place } from "@/lib/api";
import { CHICAGO, DENVER } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  searchPlaces: vi.fn(),
}));

/** The field as a form uses it: the form holds the chosen place. */
function Harness({
  initial = null,
  error,
  onChange,
}: {
  initial?: Place | null;
  error?: string;
  onChange: (place: Place | null) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <PlaceField
      id="origin"
      label="Origin"
      value={value}
      error={error}
      onChange={(place) => {
        setValue(place);
        onChange(place);
      }}
    />
  );
}

function renderField(props: { initial?: Place | null; error?: string } = {}) {
  const onChange = vi.fn();
  renderWithProviders(<Harness onChange={onChange} {...props} />);
  return { onChange, input: screen.getByLabelText("Origin") };
}

describe("PlaceField", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("suggests places once the driver pauses typing, and takes the one picked", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([CHICAGO, DENVER]);
    const user = userEvent.setup();
    const { onChange, input } = renderField();

    await user.type(input, "Chica");
    await user.click(
      await screen.findByRole("button", { name: "Chicago, IL" }),
    );

    expect(searchPlaces).toHaveBeenCalledExactlyOnceWith("Chica");
    expect(onChange).toHaveBeenLastCalledWith(CHICAGO);
    expect(input).toHaveValue("Chicago, IL");
    expect(
      screen.queryByRole("button", { name: "Denver, CO" }),
    ).not.toBeInTheDocument();
  });

  it("forgets the chosen place as soon as the driver edits it", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([]);
    const user = userEvent.setup();
    const { onChange, input } = renderField({ initial: CHICAGO });

    await user.type(input, "x");

    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("does not search for a single letter", async () => {
    // Only the debounce's timer is faked, and it still moves with real time, so nothing that
    // React or user-event schedules can stall; the jump below passes the debounce at once.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout"],
      shouldAdvanceTime: true,
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { input } = renderField();

    await user.type(input, "C");
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS));

    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("says when nothing matches", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([]);
    const user = userEvent.setup();
    const { input } = renderField();

    await user.type(input, "Zzyzx");

    expect(
      await screen.findByText("No places match “Zzyzx”."),
    ).toBeInTheDocument();
  });

  it("explains when place search is down", async () => {
    vi.mocked(searchPlaces).mockRejectedValue(
      new ApiError(503, "The place search service is not responding right now"),
    );
    const user = userEvent.setup();
    const { input } = renderField();

    await user.type(input, "Chicago");

    expect(
      await screen.findByText(
        "The place search service is not responding right now",
      ),
    ).toBeInTheDocument();
  });

  it("starts from the chosen place without searching", () => {
    const { input } = renderField({ initial: CHICAGO });

    expect(input).toHaveValue("Chicago, IL");
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("shows its error and marks itself invalid", () => {
    const { input } = renderField({
      error: "Pick the origin from the suggestions",
    });

    expect(input).toHaveAccessibleDescription(
      "Pick the origin from the suggestions",
    );
    expect(input).toBeInvalid();
  });
});
