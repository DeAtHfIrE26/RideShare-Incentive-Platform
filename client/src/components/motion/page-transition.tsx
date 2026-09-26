import { MOTION_CLASS, useMotionEnabled } from "@/lib/motion";
import { ReactNode } from "react";
import { useLocation } from "wouter";

/**
 * Fades the page body in on a route change.
 *
 * Navigation used to swap one screen for another between frames, which reads
 * as a flicker rather than as movement. Keying the wrapper on the location
 * makes React replace the node, which restarts the CSS animation: a 220ms fade
 * with an 8px rise. Only opacity and transform move, so the browser composites
 * it and the page is never re-laid-out.
 *
 * With reduced motion requested the children render with no wrapper class and
 * nothing animates.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const enabled = useMotionEnabled();

  if (!enabled) return <>{children}</>;

  return (
    <div key={location} className={MOTION_CLASS.riseIn}>
      {children}
    </div>
  );
}
