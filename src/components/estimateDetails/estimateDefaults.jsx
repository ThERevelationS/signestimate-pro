// ============================================================================
// Makes the Estimate Settings lists MEAN something on a brand-new estimate.
// Each list value flagged "Default" (star) is auto-applied, and the logged-in
// user is matched to a salesperson by email so their name/email land on the
// estimate and the customer quote automatically.
//
//   default Tax Group    → tax_group + tax_percent  (drives the pricing waterfall tax)
//   default Terms        → terms + payment_terms    (printed on the customer quote)
//   default Sales Center → sales_center
//   Salesperson          → matched by signed-in email, else the default one
//   Salesperson email    → company_email on the quote header (contact for the customer)
// ============================================================================
const defaultOf = (options, type) =>
  options.find((o) => o.option_type === type && o.is_default && o.is_active !== false);

export function findSalespersonForUser(options, user) {
  const rows = options.filter((o) => o.option_type === "salesperson" && o.is_active !== false);
  const email = (user?.email || "").toLowerCase();
  return (
    (email && rows.find((o) => (o.email || "").toLowerCase() === email)) ||
    (user?.full_name && rows.find((o) => o.label.toLowerCase() === user.full_name.toLowerCase())) ||
    rows.find((o) => o.is_default) ||
    null
  );
}

// Returns only the fields that are still empty, so we never overwrite the
// values that came from a chosen customer or the estimator's own edits.
export function buildEstimateDefaults({ project, options, taxGroups, user }) {
  const patch = {};
  const blank = (k) => !project[k];

  const tax = taxGroups.find((t) => t.is_default && t.is_active !== false);
  if (blank("tax_group") && tax) {
    patch.tax_group = tax.group_name;
    patch.tax_percent = Number(tax.tax_percent) || 0;
  }

  const terms = defaultOf(options, "terms");
  if (blank("terms") && terms) {
    patch.terms = terms.label;
    if (blank("payment_terms")) patch.payment_terms = terms.label;
  }

  const center = defaultOf(options, "sales_center");
  if (blank("sales_center") && center) patch.sales_center = center.label;

  const sp = findSalespersonForUser(options, user);
  if (blank("salesperson") && sp) {
    patch.salesperson = sp.label;
    if (blank("company_email") && sp.email) patch.company_email = sp.email;
  }

  return patch;
}