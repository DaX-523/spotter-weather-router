import { useCallback, useEffect, useRef, useState } from "react";

// A nudge: shut for a blink, open for about a second, then shut again, so the driver sees there
// is more inside.
const PEEK_DELAY_MS = 300;
// Includes the 300 ms it takes to slide open.
const PEEK_OPEN_MS = 1_300;

function prefersReducedMotion(): boolean {
  // jsdom and some older browsers have no matchMedia.
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

/** Whether to show something briefly open, each time `trigger` changes. `stop` ends the peek
 * for good, for when the driver takes over. Drivers who prefer reduced motion get no peek. */
export function usePeek(trigger: unknown): {
  peeking: boolean;
  stop: () => void;
} {
  const [peeking, setPeeking] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPeeking(false);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    timers.current = [
      setTimeout(() => setPeeking(true), PEEK_DELAY_MS),
      setTimeout(() => setPeeking(false), PEEK_DELAY_MS + PEEK_OPEN_MS),
    ];
    return stop;
  }, [trigger, stop]);

  return { peeking, stop };
}
