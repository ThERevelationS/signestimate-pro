/**
 * Shared formatting helpers — extracted so we stop redefining
 * `const fmt = n => $${...}` in every list/summary page.
 *
 * These are pure presentation utilities. They do NOT change any math —
 * upstream calculations should hand them the already-correct number.
 */

/** Coerce anything to a safe finite number (NaN/null/undefined → 0). */
export function num(n) {
  const v = typeof n === "number" ? n : parseFloat(n);
  return Number.isFinite(v) ? v : 0;
}

/** "$1,234.56" — used by every project list and summary card. */
export function fmtCurrency(n, fractionDigits = 2) {
  return `$${num(n).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/** Plain number with thousands separators. */
export function fmtNumber(n, fractionDigits = 0) {
  return num(n).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}