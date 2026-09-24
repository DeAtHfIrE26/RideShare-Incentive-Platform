/**
 * Currency formatting for fares.
 *
 * Prices were rendered as `${Number(ride.price).toFixed(2)}` at three separate
 * call sites, hardcoding a dollar sign onto amounts the app treats as local
 * currency. Routing every fare through one Intl formatter keeps the symbol,
 * grouping and decimals consistent, and makes the currency a single change.
 */
const LOCALE = "en-IN";
const CURRENCY = "INR";

export function formatCurrency(amount: number | string): string {
  const value = Number(amount);

  if (!Number.isFinite(value)) return "—";

  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}
