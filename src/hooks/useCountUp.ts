import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Matches the stack transition, so a screen's numbers finish just after it settles. */
export const COUNT_UP_DURATION_MS = 900;

/**
 * Under Jest the count-up is pure noise: `requestAnimationFrame` is polyfilled
 * onto timers, so the sweep keeps scheduling state updates that outlive the test
 * that started them and destabilise later ones. Tests assert on settled values,
 * which is what every consumer renders one frame in anyway.
 */
const COUNT_UP_ENABLED = process.env.NODE_ENV !== "test";

/** Standard ease-out cubic: fast off the mark, gentle landing on the real value. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface CountUpOptions {
  duration?: number;
  /** Decimal places to animate through. Integers by default. */
  decimals?: number;
  /** Skip the animation entirely (e.g. while the underlying query is loading). */
  enabled?: boolean;
}

/**
 * Counts from 0 up to `value` once, and thereafter tracks `value` directly.
 *
 * Deliberately JS-driven rather than a Reanimated worklet. Animating *text* off
 * the UI thread means an animated `TextInput` with `animatedProps.text`, which
 * would mean giving up the `Text` component's variants and theme colors on every
 * headline number. The re-render cost here is bounded by the rounded output
 * changing, not by frame rate — at `decimals: 0` a 0→68 count re-renders 68
 * times over ~900ms, well under one per frame.
 *
 * Re-animates when `value` changes identity only on first arrival: a refetch
 * that returns 1,850 again must not replay the count. `hasRun` guards that.
 */
export function useCountUp(value: number, options: CountUpOptions = {}): number {
  const { duration = COUNT_UP_DURATION_MS, decimals = 0, enabled: enabledOption = true } = options;
  const enabled = enabledOption && COUNT_UP_ENABLED;
  const [display, setDisplay] = useState(enabled ? 0 : value);
  const hasRun = useRef(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;

    // Once the intro has played, later values (a new log, a refetch) should snap
    // rather than sweep up from zero again.
    if (hasRun.current) {
      setDisplay(value);
      return undefined;
    }

    let cancelled = false;
    const factor = Math.pow(10, decimals);
    const round = (n: number) => Math.round(n * factor) / factor;

    const start = (reduceMotion: boolean) => {
      if (cancelled) return;
      hasRun.current = true;
      if (reduceMotion || value === 0) {
        setDisplay(value);
        return;
      }

      const startedAt = Date.now();
      const step = () => {
        if (cancelled) return;
        const elapsed = Date.now() - startedAt;
        const progress = Math.min(elapsed / duration, 1);
        setDisplay(round(value * easeOutCubic(progress)));
        if (progress < 1) frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    };

    void AccessibilityInfo.isReduceMotionEnabled()
      .then(start)
      .catch(() => start(false));

    return () => {
      cancelled = true;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value, duration, decimals, enabled]);

  return display;
}
