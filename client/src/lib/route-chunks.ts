/**
 * The dynamic imports behind the route-level code splitting.
 *
 * Only the two heavy routes are split. The safety console (44 kB) and the chat
 * client (28.8 kB) are three quarters of what splitting removes from the main
 * bundle; the remaining pages are 1-7 kB each, and giving them their own chunk
 * cost a cold deep link an extra round trip worth more than the bytes saved
 * (/rides LCP measured 1020ms inline against 1276ms split).
 *
 * Kept in one place so App.tsx and the navigation reference the same module
 * specifiers: Vite emits one chunk per specifier, and a second copy of the
 * string elsewhere would produce a second chunk holding the same code.
 */
export const routeChunks: Record<string, () => Promise<unknown>> = {
  "/safety": () => import("@/pages/safety-page"),
  "/chat": () => import("@/pages/chat-page"),
  "/messages": () => import("@/pages/chat-page"),
};

const started = new Set<string>();

/**
 * Starts a route's chunk download before it is needed, on hover or focus.
 *
 * By the time the click lands the code is usually already parsed, so a split
 * route opens as fast as an inline one. Each chunk is requested at most once;
 * the browser cache handles the rest. Routes that are not split are a no-op.
 */
export function prefetchRoute(href: string): void {
  if (started.has(href)) return;
  const load = routeChunks[href];
  if (!load) return;
  started.add(href);
  // A failed prefetch is not an error worth surfacing: the navigation itself
  // will retry the same import and report properly if it fails again.
  void load().catch(() => started.delete(href));
}
