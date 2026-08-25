import { fmtCurrency } from "@/lib/formatters";

// Display-only helpers driven by the Quote Settings toggles. None of this
// changes stored totals — it only controls what the customer sees.

export const on = (project, key) => project[key] !== false; // default-on
export const accent = (project) => project.quote_accent_color || "#4f46e5";

/** Money formatter honoring "round prices to whole dollars". */
export const quoteMoney = (project) => (n) =>
  project.round_prices_to_dollar ? fmtCurrency(Math.round(Number(n) || 0)).replace(/\.\d{2}$/, "") : fmtCurrency(n);

const KIND_TOGGLE = {
  subtotal: "show_subtotal_line",
  discount: "show_discount_line",
  fees: "show_fees_line",
  shipping: "show_fees_line",
  permit: "show_fees_line",
  tax: "show_tax_line",
  deposit: "show_deposit_lines",
  balance: "show_deposit_lines",
};

/** Filters the pricing waterfall rows by the display toggles. */
export const visibleWaterfall = (rows, project) =>
  rows.filter((r) => {
    const key = KIND_TOGGLE[r.kind];
    return !key || on(project, key);
  });