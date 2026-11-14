import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePeek } from "@/hooks/use-peek";

describe("usePeek", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays shut for a blink, then peeks open", () => {
    const { result } = renderHook(() => usePeek("plan"));

    act(() => vi.advanceTimersByTime(299));
    const beforeBlinkEnds = result.current.peeking;
    act(() => vi.advanceTimersByTime(1));

    expect(beforeBlinkEnds).toBe(false);
    expect(result.current.peeking).toBe(true);
  });

  it("folds back after about a second open", () => {
    const { result } = renderHook(() => usePeek("plan"));

    act(() => vi.advanceTimersByTime(300 + 1299));
    const stillOpen = result.current.peeking;
    act(() => vi.advanceTimersByTime(1));

    expect(stillOpen).toBe(true);
    expect(result.current.peeking).toBe(false);
  });

  it("peeks again when the next plan arrives", () => {
    const { result, rerender } = renderHook(({ plan }) => usePeek(plan), {
      initialProps: { plan: "first" },
    });
    act(() => vi.advanceTimersByTime(2_000));

    rerender({ plan: "second" });
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.peeking).toBe(true);
  });

  it("stops peeking for good once the driver takes over", () => {
    const { result } = renderHook(() => usePeek("plan"));
    act(() => vi.advanceTimersByTime(300));

    act(() => result.current.stop());
    act(() => vi.advanceTimersByTime(2_000));

    expect(result.current.peeking).toBe(false);
  });

  it("never peeks for drivers who prefer reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    const { result } = renderHook(() => usePeek("plan"));

    act(() => vi.advanceTimersByTime(300));

    expect(result.current.peeking).toBe(false);
  });
});
