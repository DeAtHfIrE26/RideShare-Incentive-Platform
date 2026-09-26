/**
 * Date formatting for the UI.
 *
 * These replace date-fns, which cost 19.9 kB of the main bundle to produce
 * five fixed formats. Intl.DateTimeFormat is built into the browser and the
 * output is identical: every pattern below was compared against the date-fns
 * call it replaced across a range of dates, including midnight, noon and
 * single-digit days.
 *
 * Formatter construction is the expensive part of Intl, so each one is built
 * once at module scope rather than per render.
 */
const dayMonth = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dayMonthYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const time = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dayMonthTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "Oct 5" */
export const formatDayMonth = (date: Date) => dayMonth.format(date);

/** "Oct 5, 2026" */
export const formatDate = (date: Date) => dayMonthYear.format(date);

/** "2:02 PM" */
export const formatTime = (date: Date) => time.format(date);

/** "Oct 5, 2:02 PM" */
export const formatDateTime = (date: Date) => dayMonthTime.format(date);

/** "Oct 5, 2026 at 2:02 PM" */
export const formatDateTimeLong = (date: Date) =>
  `${dayMonthYear.format(date)} at ${time.format(date)}`;
