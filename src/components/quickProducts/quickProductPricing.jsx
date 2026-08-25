// ============================================================================
// Quick Product pricing engine (registered in the Formula Viewer → Quick
// Products tab). Pure functions — no I/O — so the editor, the list page and
// the Formula Viewer all price a product identically.
//
//   part line total = override ?? ((part_price + modifier_price) × part_qty)
//   parts total     = Σ part line totals
//   product retail  = price_override ?? (parts total + setup_fee − discount)
//   extended total  = product retail × product_quantity
// ============================================================================

const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
const hasOverride = (v) => v !== null && v !== undefined && v !== "";

export function partLineTotal(part = {}) {
  if (hasOverride(part.price_override)) return num(part.price_override);
  return (num(part.part_price) + num(part.modifier_price)) * (num(part.part_qty) || 1);
}

export function priceQuickProduct(product = {}) {
  const parts = product.parts || [];
  const partTotals = parts.map(partLineTotal);
  const partsTotal = partTotals.reduce((s, v) => s + v, 0);
  const setupFee = num(product.setup_fee);
  const discount = num(product.discount);
  const calculatedRetail = partsTotal + setupFee - discount;
  const retailEach = hasOverride(product.price_override)
    ? num(product.price_override)
    : calculatedRetail;
  const qty = num(product.product_quantity) || 1;

  return {
    partTotals,
    partsTotal,
    setupFee,
    discount,
    calculatedRetail,
    retailEach,
    quantity: qty,
    total: retailEach * qty,
  };
}

export const PART_TYPES = [
  { value: "fabrication", label: "Fabrication" },
  { value: "material", label: "Material" },
  { value: "design_production", label: "Layout & Production" },
  { value: "service", label: "Service" },
  { value: "installation", label: "Installation" },
  { value: "equipment", label: "Equipment" },
  { value: "permit", label: "Permit" },
  { value: "other", label: "Other" },
];