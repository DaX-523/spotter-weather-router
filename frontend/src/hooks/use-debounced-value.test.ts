import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "@/hooks/use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the value it is given", () => {
    const { result } = renderHook(() => useDebouncedValue("Chi", 250));

    expect(result.current).toBe("Chi");
  });

  it("follows a change only once it has settled", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 250),
      { initialProps: { value: "Chi" } },
    );

    rerender({ value: "Chica" });
    act(() => vi.advanceTimersByTime(249));
    const beforeSettling = result.current;
    act(() => vi.advanceTimersByTime(1));

    expect(beforeSettling).toBe("Chi");
    expect(result.current).toBe("Chica");
  });
});
