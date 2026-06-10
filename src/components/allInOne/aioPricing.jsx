// ============================================================================
// All-In-One pricing waterfall — the SINGLE source of truth for customer
// pricing math, used by the Cost Summary tab, Customer View tab, exports,
// the page header and the saved quote_total.
//
//   adjusted section  = section total × (1 + adjustment% ÷ 100)
//   subtotal          = Σ adjusted sections
//   discount          = subtotal × discount%
//   contingency       = (subtotal − discount) × contingency%
//   fees              = shipping fee + permit fee
//   taxable base      = subtotal − discount + contingency + fees
//   tax               = taxable base × tax%
//   quote total       = taxable base + tax
//   deposit due       = quote total × deposit%
//   balance due       = quote total − deposit
// ============================================================================

export function adjustedSectionTotal(li) {
  const base = Number(li.total_snapshot) || 0;
  const adj = Number(li.adjustment_percent) || 0;
  return base * (1 + adj / 100);
}

export function computeQuote(project) {
  const items = (project.line_items || []).filter((li) => !li.missing);
  const sectionsBase = items.reduce((s, li) => s + (Number(li.total_snapshot) || 0), 0);
  const subtotal = items.reduce((s, li) => s + adjustedSectionTotal(li), 0);
  const adjustments = subtotal - sectionsBase;

  const discountPct = Number(project.discount_percent) || 0;
  const discount = subtotal * (discountPct / 100);

  const contingencyPct = Number(project.contingency_percent) || 0;
  const contingency = (subtotal - discount) * (contingencyPct / 100);

  const shippingFee = Number(project.shipping_fee) || 0;
  const permitFee = Number(project.permit_fee) || 0;
  const fees = shippingFee + permitFee;

  const taxableBase = subtotal - discount + contingency + fees;
  const taxPct = Number(project.tax_percent) || 0;
  const tax = taxableBase * (taxPct / 100);
  const total = taxableBase + tax;

  const depositPct = Number(project.deposit_percent) || 0;
  const deposit = total * (depositPct / 100);
  const balance = total - deposit;

  return {
    sectionsBase, adjustments, subtotal,
    discountPct, discount,
    contingencyPct, contingency,
    shippingFee, permitFee, fees,
    taxableBase, taxPct, tax, total,
    depositPct, deposit, balance,
  };
}

// Waterfall rows for display / CSV export. Zero-value optional lines are
// skipped so the quote stays clean.
export function quoteWaterfallRows(quote) {
  const rows = [];
  if (quote.adjustments !== 0) {
    rows.push({ label: "Section adjustments", amount: quote.adjustments, kind: "adjust" });
  }
  rows.push({ label: "Subtotal", amount: quote.subtotal, kind: "subtotal" });
  if (quote.discount > 0) rows.push({ label: `Discount (${quote.discountPct}%)`, amount: -quote.discount, kind: "discount" });
  if (quote.contingency > 0) rows.push({ label: `Contingency (${quote.contingencyPct}%)`, amount: quote.contingency, kind: "fee" });
  if (quote.shippingFee > 0) rows.push({ label: "Shipping / freight", amount: quote.shippingFee, kind: "fee" });
  if (quote.permitFee > 0) rows.push({ label: "Permits / admin", amount: quote.permitFee, kind: "fee" });
  if (quote.tax > 0) rows.push({ label: `Tax (${quote.taxPct}%)`, amount: quote.tax, kind: "tax" });
  rows.push({ label: "Total", amount: quote.total, kind: "total" });
  if (quote.deposit > 0) {
    rows.push({ label: `Deposit due (${quote.depositPct}%)`, amount: quote.deposit, kind: "deposit" });
    rows.push({ label: "Balance on completion", amount: quote.balance, kind: "balance" });
  }
  return rows;
}