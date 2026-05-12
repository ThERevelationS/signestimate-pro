// Pricing math + helpers for the Letters Purchase tab.
// All pricing pulls from project settings, with sensible defaults that
// match the user's price sheet (Excel rows 12-19).

export const LETTER_TYPE_LABELS = {
  raceway: "Raceway",
  channel_raceway_mounted: "Raceway Mounted Letters",
  channel_flush_mounted: "Flush Mounted Letters",
  channel_halo_lit: "Channel Letters — Halo-Lit",
  capsule_logo_pillbox: "Capsule / Logo / Pillbox",
  dimensional_letters: "Dimensional Letters (fabricated in-house)",
};

// What "size_value" means for each letter type
export const SIZE_UNITS = {
  raceway: "ft", // linear feet
  channel_raceway_mounted: "in", // vertical inches per letter
  channel_flush_mounted: "in",
  channel_halo_lit: "in",
  capsule_logo_pillbox: "sqft", // square feet
  dimensional_letters: "sqft",
};

// Default pricing (matches the Excel pricing sheet)
const DEFAULTS = {
  letters_raceway_1st_per_ft: 22.53,
  letters_raceway_2nd_per_ft: 23.53,
  letters_raceway_3rd_per_ft: 24.53,
  letters_raceway_4th_per_ft: 25.53,
  letters_channel_raceway_per_inch: 7.10,
  letters_channel_flush_per_inch: 9.03,
  letters_channel_halo_per_inch: 11.75, // ~30% premium over flush
  letters_capsule_logo_per_sqft: 45.37,
  letters_dimensional_per_sqft: 65.00, // placeholder — in-house fab
  letters_default_delivery_fee: 90,
  letters_default_design_fee: 150,
  letters_default_install_supplies_fee: 100,
  letters_default_permitting_fee: 750,
  letters_default_markup_percent: 86.2, // tier 1 markup from the Excel
};

export const getLettersDefault = (key) => DEFAULTS[key];

const num = (v, fallback = 0) => {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
};

export const emptyLetterPurchase = (type = "channel_flush_mounted") => ({
  id: `lp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  letter_type: type,
  description: "",
  raceway_index: 1,
  qty: type === "raceway" ? 1 : 5,
  size_value: type === "raceway" ? 8 : type.startsWith("channel_") ? 24 : 6,
  unit_cost: 0,
  unit_cost_override: false,
  total_cost: 0,
  create_install_item: type !== "raceway", // raceway is purchase-only by default
  install_height_feet: 12,
  wall_material: "eifs",
});

// Resolve the unit cost for a purchase row from settings
export const resolveUnitCost = (purchase, settings) => {
  if (purchase.unit_cost_override) return num(purchase.unit_cost);
  switch (purchase.letter_type) {
    case "raceway": {
      const idx = Math.max(1, Math.min(4, num(purchase.raceway_index, 1)));
      const key = ["letters_raceway_1st_per_ft", "letters_raceway_2nd_per_ft", "letters_raceway_3rd_per_ft", "letters_raceway_4th_per_ft"][idx - 1];
      return num(settings[key], DEFAULTS[key]);
    }
    case "channel_raceway_mounted":
      return num(settings.letters_channel_raceway_per_inch, DEFAULTS.letters_channel_raceway_per_inch);
    case "channel_flush_mounted":
      return num(settings.letters_channel_flush_per_inch, DEFAULTS.letters_channel_flush_per_inch);
    case "channel_halo_lit":
      return num(settings.letters_channel_halo_per_inch, DEFAULTS.letters_channel_halo_per_inch);
    case "capsule_logo_pillbox":
      return num(settings.letters_capsule_logo_per_sqft, DEFAULTS.letters_capsule_logo_per_sqft);
    case "dimensional_letters":
      return num(settings.letters_dimensional_per_sqft, DEFAULTS.letters_dimensional_per_sqft);
    default:
      return 0;
  }
};

// Compute totals for a single purchase row
export const calcLetterPurchase = (purchase, settings) => {
  const unit_cost = resolveUnitCost(purchase, settings);
  const qty = num(purchase.qty);
  const size = num(purchase.size_value);
  // total = unit_cost × size × qty
  // (per-foot × ft × #raceways) OR (per-inch × in × #letters) OR (per-sqft × sqft × #logos)
  const total_cost = unit_cost * size * qty;
  return {
    ...purchase,
    unit_cost,
    total_cost,
  };
};

// Project-level totals for the Letters tab
export const calcLettersTotals = (project, settings) => {
  const purchases = (project.letter_purchases || []).map(p => calcLetterPurchase(p, settings));
  const purchasesTotal = purchases.reduce((s, p) => s + num(p.total_cost), 0);

  const delivery = num(project.letters_delivery_fee);
  const design = num(project.letters_design_fee);
  const supplies = num(project.letters_install_supplies_fee);
  const permitting = num(project.letters_permitting_fee);
  const other = num(project.letters_other_fee);

  const letters_subtotal = purchasesTotal + delivery + design + supplies + permitting + other;
  const markupPct = num(project.letters_markup_percent);
  const total_letters_cost = letters_subtotal * (1 + markupPct / 100);

  return {
    letter_purchases: purchases,
    letters_subtotal,
    total_letters_cost,
  };
};

// Map a letter purchase row to an install line item type
const purchaseTypeToInstallType = (letter_type) => {
  switch (letter_type) {
    case "channel_raceway_mounted":
    case "raceway":
      return "raceway";
    case "channel_halo_lit":
      return "halo_lit";
    case "dimensional_letters":
      return "dimensional_lettering";
    case "channel_flush_mounted":
    case "capsule_logo_pillbox":
    default:
      return "flush_mount";
  }
};

// Pick a letter_size enum from vertical inches
const inchesToLetterSize = (inches) => {
  const n = num(inches);
  if (n <= 8) return "extra_small";
  if (n <= 12) return "small";
  if (n <= 24) return "medium";
  if (n <= 48) return "large";
  if (n <= 60) return "extra_large";
  return "extra_extra_large";
};

// Build (or update) install line items from the letter_purchases array.
// Items linked via source_letter_purchase_id are kept in sync;
// items the user added by hand on the Installation tab are left untouched.
export const syncInstallItemsFromPurchases = (existingItems, purchases, emptyLineItemFn) => {
  const items = [...(existingItems || [])];
  const byPurchaseId = new Map();
  items.forEach((it, idx) => {
    if (it.source_letter_purchase_id) byPurchaseId.set(it.source_letter_purchase_id, idx);
  });

  const validPurchaseIds = new Set();

  for (const p of (purchases || [])) {
    if (!p.create_install_item) continue;
    if (p.letter_type === "raceway") continue; // raceway is a hardware purchase, not an install line

    validPurchaseIds.add(p.id);

    const installType = purchaseTypeToInstallType(p.letter_type);
    const sizeUnit = SIZE_UNITS[p.letter_type];

    // Map sizing fields based on what the purchase row means
    const letter_height_inches = sizeUnit === "in" ? num(p.size_value, 24) : 24;
    const letter_size = sizeUnit === "in" ? inchesToLetterSize(p.size_value) : "medium";
    const raceway_length_feet = 0; // raceway hardware is its own purchase row

    const patch = {
      description: p.description || LETTER_TYPE_LABELS[p.letter_type],
      installation_type: installType,
      qty_letters: num(p.qty),
      letter_size,
      letter_height_inches,
      installation_height_feet: num(p.install_height_feet, 12),
      raceway_length_feet,
      wall_material: p.wall_material || "eifs",
      source_letter_purchase_id: p.id,
    };

    if (byPurchaseId.has(p.id)) {
      const idx = byPurchaseId.get(p.id);
      items[idx] = { ...items[idx], ...patch };
    } else {
      // Create a fresh item using the project's empty template, then apply the patch
      const fresh = emptyLineItemFn();
      items.push({ ...fresh, ...patch, materials: [] });
    }
  }

  // Remove auto-linked items whose purchase row was deleted
  return items.filter(it => !it.source_letter_purchase_id || validPurchaseIds.has(it.source_letter_purchase_id));
};