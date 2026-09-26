import { useMotionEnabled } from "@/lib/motion";
import { useEffect, useRef } from "react";

const DURATION_MS = 700;

/** Decelerating curve, so the count slows as it lands rather than stopping dead. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A number that counts to its value instead of appearing.
 *
 * Used for the dashboard figures, where the movement is what tells you the
 * value arrived and roughly how large it is. The text is written straight to
 * the DOM node, so a count does not re-render the tree once per frame, and the
 * rendered markup is always the final value - correct before the effect runs
 * and for anything reading the DOM without JavaScript.
 *
 * With reduced motion requested it does nothing at all.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const enabled = useMotionEnabled();
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;

    const format = (n: number) =>
      n.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) + suffix;

    // Count on from whatever is displayed, so a refetch nudges the figure
    // rather than restarting it from zero.
    const from = shown.current;
    if (from === value) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const current = from + (value - from) * easeOut(t);
      shown.current = current;
      node.textContent = format(current);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        shown.current = value;
        node.textContent = format(value);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, decimals, suffix, enabled]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
