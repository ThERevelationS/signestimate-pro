// Adapt Inventory entity rows flagged `is_pole=true` into the shape the
// Concrete | Masonry | Poles estimator expects (it was built around
// FoundationInventory pole rows).
//
// Auto-derived fields:
//   • pole_shape           from product_type (Tube_Square → square,
//                          Tube_Round / Pipe → round, others → square)
//   • pole_width_inches    parsed from `size` string ("4x4" → 4, "3 OD" → 3)
//   • pole_depth_inches    parsed from `size` string ("4x6" → 6)
//   • pole_wall_thickness  parsed from `thickness_gauge` ("1/8" → 0.125)
//   • cost_per_unit        carried over as $/ft (we force per_foot pricing)
//   • paint_rate_per_lf    from Settings (pole_paint_cost_per_lf +
//                          pole_paint_labor_per_lf — the estimator already
//                          falls back to Settings if this is missing)
//
// The synthesized record carries `material_type: 'pole'` and a stable
// `id` (the original Inventory id) so saved estimates keep working.

// Parse a fraction or decimal: "1/8" → 0.125, "0.125" → 0.125, "1/2" → 0.5.
const parseDim = (str) => {
  if (!str) return 0;
  const s = String(str).trim();
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : 0;
};

// Extract first two numeric dimensions from a size string.
//   "4x4" → [4, 4]      "4 x 6 x 1/4" → [4, 6]
//   "3 OD" → [3, 0]     "2.5x2.5" → [2.5, 2.5]
const parseSize = (sizeStr) => {
  if (!sizeStr) return [0, 0];
  const tokens = String(sizeStr).split(/[xX×*\s]+/).filter(Boolean);
  const dims = tokens.map(parseDim).filter((n) => n > 0);
  return [dims[0] || 0, dims[1] || dims[0] || 0];
};

const deriveShape = (productType) => {
  if (productType === "Tube_Round" || productType === "Pipe" || productType === "Round_Bar") {
    return "round";
  }
  return "square";
};

// Convert one Inventory row → synthetic pole record.
export function inventoryRowToPole(row) {
  const [w, d] = parseSize(row.size);
  const wall = parseDim(row.thickness_gauge);
  return {
    id: row.id, // KEEP the original id — selected_pole_id in saved estimates refers to this
    material_name: `${row.material_type || ""} ${row.product_type || ""} ${row.size || ""}`
      .replace(/_/g, " ").trim() || "Pole",
    material_type: "pole",
    pole_shape: deriveShape(row.product_type),
    pole_width_inches: w,
    pole_depth_inches: d,
    pole_wall_thickness_inches: wall,
    pole_stock_length_ft: row.standard_length || 20,
    pole_pricing_mode: "per_foot",
    cost_per_unit: row.cost_per_unit || 0,
    pole_stock_price: 0,
    paint_rate_per_linear_ft: 0, // estimator falls back to Settings rates when 0
    supplier: row.supplier || "",
    notes: row.notes || "",
    _source: "inventory_is_pole",
  };
}

// Filter + map a list of Inventory rows into synthetic poles.
export function extractInventoryPoles(inventoryRows) {
  return (inventoryRows || [])
    .filter((r) => r && r.is_pole === true)
    .map(inventoryRowToPole);
}