import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useTripQuery } from "@/hooks/use-trip-query";
import { tripQueryToSearch } from "@/lib/trip-query";
import { CHICAGO, TRIP_QUERY } from "@/test/fixtures";

const EMPTY = {
  origin: null,
  destination: null,
  departureAt: null,
  loadWeightLb: null,
};

describe("useTripQuery", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("reads the trip from the URL", () => {
    window.history.replaceState(null, "", `/?${tripQueryToSearch(TRIP_QUERY)}`);

    const { result } = renderHook(() => useTripQuery());

    expect(result.current[0]).toEqual(TRIP_QUERY);
  });

  it("puts a new trip in the URL as a new history entry", () => {
    const { result } = renderHook(() => useTripQuery());
    const entriesBefore = window.history.length;

    act(() => result.current[1](TRIP_QUERY));

    expect(result.current[0]).toEqual(TRIP_QUERY);
    expect(window.location.search).toBe(`?${tripQueryToSearch(TRIP_QUERY)}`);
    expect(window.history.length).toBe(entriesBefore + 1);
  });

  it("follows the Back and Forward buttons", () => {
    const { result } = renderHook(() => useTripQuery());
    const origin = { ...EMPTY, origin: CHICAGO };

    act(() => {
      window.history.replaceState(null, "", `/?${tripQueryToSearch(origin)}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(result.current[0]).toEqual(origin);
  });
});
