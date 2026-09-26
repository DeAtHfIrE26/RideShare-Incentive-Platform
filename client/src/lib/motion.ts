import { useEffect, useState } from "react";

/**
 * Motion vocabulary.
 *
 * Implemented with CSS animations and requestAnimationFrame rather than an
 * animation library. framer-motion was tried first, since it was already a
 * dependency: with LazyMotion and the domAnimation feature set it still added
 * 77.8 kB raw / 27 kB gzip to the main chunk and cost 388ms of LCP on a
 * throttled phone (2520ms to 2908ms), which put the page back over the 2.5s
 * target that the code splitting had just brought it under. Nothing here needs
 * gestures, drag or layout projection, so the library was not buying anything
 * the platform does not already do.
 *
 * Everything animates transform and opacity only. Both are composited, so a
 * transition never triggers layout or paint, and nothing runs in a loop.
 *
 * Durations sit between 150ms and 400ms. Anything slower reads as lag on a
 * screen people use repeatedly.
 */

/** Matches the keyframes and custom properties declared in index.css. */
export const MOTION_CLASS = {
  /** Fades and rises content in. Used for route bodies and cards. */
  riseIn: "motion-rise-in",
  /** A card that lifts slightly under the pointer. */
  liftOnHover: "motion-lift",
} as const;

/** Per-row delay for a staggered list, capped so a long list never crawls. */
export function staggerDelay(index: number, step = 35, max = 280): string {
  return `${Math.min(index * step, max)}ms`;
}

/**
 * Whether to animate at all.
 *
 * False when the viewer has asked their system for reduced motion, in which
 * case the helpers render their final state and no animation is scheduled.
 * index.css carries the matching media query for animations declared purely in
 * CSS, so a component that forgets to ask is still covered.
 */
export function useMotionEnabled(): boolean {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setEnabled(!query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return enabled;
}

/**
 * Props for a staggered list row: the entrance class and its delay.
 * Returns nothing when motion is off, so the row renders in its final state.
 */
export function listItemMotion(enabled: boolean, index: number) {
  if (!enabled) return {};
  return {
    className: MOTION_CLASS.riseIn,
    style: { animationDelay: staggerDelay(index) },
  };
}
