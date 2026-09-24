/**
 * Turns a stored status value into something readable.
 *
 * Statuses are stored as lower-case identifiers ("in_progress",
 * "route_deviation"), and several screens printed them straight out, so the UI
 * showed "in_progress" where it meant "In progress".
 */
export function formatStatus(status: string | null | undefined, fallback = "—"): string {
  if (!status) return fallback;
  const words = status.replace(/[_-]+/g, " ").trim();
  if (!words) return fallback;
  return words.charAt(0).toUpperCase() + words.slice(1);
}
