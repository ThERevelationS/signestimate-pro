// Calculation logic for Channel Letter Installation estimates
// Pure functions — no React, no entity calls.

import { getWallMaterialMultiplier } from "./wallMaterials";

export const TYPE_LABELS = {
  flush_mount: "Flush Mount",
  halo_lit: "Halo-Lit",
  raceway: "Raceway",
  dimensional_lettering: "Dimensional Lettering",
};

export const SIZE_LABELS = {
  extra_small: 'XS (2"-8")',
  small: 'Small (8"-12")',
  medium: 'Medium (12"-24")',
  large: 'Large (24"-48")',
  extra_large: 'XL (48"-60")',
  extra_extra_large: 'XXL (60"+)',
};

export const emptyLineItem = () => ({
  description: "",
  installation_type: "flush_mount",
  qty_letters: 10,
  letter_size: "medium",
  letter_height_inches: 24,
  installation_height_feet: 12,
  raceway_length_feet: 0,
  wall_material: "eifs",
  thick_hollow_walls: false,
  parapet: false,
  poor_electrical_access: false,
  escort_required: false,
  badging_checkin: false,
  after_hours_weekend: false,
  set_hours_installation: false,
  poor_site_access: false,
  materials: [],
});

// Decide which inventory items should auto-attach to a new line item
export const defaultMaterialsForItem = (item, inventory) => {
  return (inventory || [])
    .filter(inv => {
      if (!inv.is_default) return false;
      // Prefer the new multi-select field; fall back to legacy single-value field.
      const list = Array.isArray(inv.applies_to_list) ? inv.applies_to_list : [];
      if (list.length > 0) return list.includes(item.installation_type);
      if (!inv.applies_to || inv.applies_to === "all") return true;
      return inv.applies_to === item.installation_type;
    })
    .map(inv => materialFromInventory(inv, item));
};

// Build a material line from an inventory record + line item context
export const materialFromInventory = (inv, item) => {
  const m = {
    inventory_item_id: inv.id,
    item_name: inv.item_name,
    pricing_mode: inv.pricing_mode,
    unit_cost: 0,
    quantity: 0,
    total_cost: 0,
  };

  if (inv.pricing_mode === "per_letter_flat") {
    m.unit_cost = parseFloat(inv.cost_per_letter) || 0;
    m.quantity = parseFloat(item.qty_letters) || 0;
  } else if (inv.pricing_mode === "per_letter_by_size") {
    const sizeKey = `cost_${item.letter_size}`;
    m.unit_cost = parseFloat(inv[sizeKey]) || 0;
    m.quantity = parseFloat(item.qty_letters) || 0;
  } else if (inv.pricing_mode === "per_raceway_foot") {
    m.unit_cost = parseFloat(inv.cost_per_foot) || 0;
    m.quantity = parseFloat(item.raceway_length_feet) || 0;
  } else if (inv.pricing_mode === "per_project_flat") {
    m.unit_cost = parseFloat(inv.cost_flat) || 0;
    m.quantity = 1;
  }

  m.total_cost = m.unit_cost * m.quantity;
  return m;
};

// Re-cost a single line item: labor hours, labor cost, materials, total
export const calcLineItem = (item, settings, inventory) => {
  const laborRate = parseFloat(settings.install_labor_rate) || 65;

  // Base rates are stored in MINUTES — convert to hours when reading.
  // Each letter size has two components: Drill Pattern/Drill Time + Installation/Prep Time.
  const MIN_TO_HR = 1 / 60;
  const sizeMinutes = (size, drillDefault, prepDefault) => {
    const drill = parseFloat(settings[`install_drill_rate_${size}`]);
    const prep = parseFloat(settings[`install_prep_rate_${size}`]);
    const d = isNaN(drill) ? drillDefault : drill;
    const p = isNaN(prep) ? prepDefault : prep;
    return d + p;
  };
  const letterSizeRates = {
    extra_small: sizeMinutes("extra_small", 15, 30) * MIN_TO_HR,
    small: sizeMinutes("small", 30, 60) * MIN_TO_HR,
    medium: sizeMinutes("medium", 50, 100) * MIN_TO_HR,
    large: sizeMinutes("large", 80, 160) * MIN_TO_HR,
    extra_large: sizeMinutes("extra_large", 120, 240) * MIN_TO_HR,
    extra_extra_large: sizeMinutes("extra_extra_large", 170, 340) * MIN_TO_HR,
  };

  let baseHours = 0;

  if (item.installation_type === "raceway") {
    // Raceway: base + extra minutes per foot, plus per-letter mounting minutes.
    const basePerFt = (parseFloat(settings.install_raceway_base_minutes_per_foot) || 30) * MIN_TO_HR;
    const extraPerFt = (parseFloat(settings.install_raceway_extra_minutes_per_foot) || 0) * MIN_TO_HR;
    const racewayHoursPerFoot = basePerFt + extraPerFt;
    baseHours = (parseFloat(item.raceway_length_feet) || 0) * racewayHoursPerFoot;
    const letterMountingHours = (parseFloat(settings.install_raceway_letter_mounting_rate) || 18) * MIN_TO_HR;
    baseHours += (parseFloat(item.qty_letters) || 0) * letterMountingHours;
  } else {
    const baseRate = letterSizeRates[item.letter_size] || (150 * MIN_TO_HR);
    baseHours = (parseFloat(item.qty_letters) || 0) * baseRate;
    if (item.installation_type === "halo_lit") {
      const haloMultiplier = parseFloat(settings.install_halo_multiplier) || 1.3;
      baseHours *= haloMultiplier;
    } else if (item.installation_type === "dimensional_lettering") {
      const dimMultiplier = parseFloat(settings.install_dimensional_lettering_multiplier) || 0.85;
      baseHours *= dimMultiplier;
    }
  }

  // Height multiplier
  const h = parseFloat(item.installation_height_feet) || 0;
  let heightMultiplier = 1.0;
  if (h <= 12) heightMultiplier = parseFloat(settings.install_height_0_12ft) || 1.0;
  else if (h <= 20) heightMultiplier = parseFloat(settings.install_height_12_20ft) || 1.3;
  else if (h <= 30) heightMultiplier = parseFloat(settings.install_height_20_30ft) || 1.6;
  else heightMultiplier = parseFloat(settings.install_height_30plus_ft) || 2.0;
  baseHours *= heightMultiplier;

  // Wall material multiplier
  baseHours *= getWallMaterialMultiplier(item.wall_material, settings);

  if (item.thick_hollow_walls) baseHours *= parseFloat(settings.install_thick_walls_multiplier) || 1.2;
  if (item.parapet) baseHours *= parseFloat(settings.install_parapet_multiplier) || 1.4;
  if (item.poor_electrical_access) baseHours *= parseFloat(settings.install_poor_electrical_multiplier) || 1.3;
  if (item.escort_required) baseHours *= parseFloat(settings.install_escort_multiplier) || 1.15;
  if (item.badging_checkin) baseHours *= parseFloat(settings.install_badging_multiplier) || 1.1;
  if (item.after_hours_weekend) baseHours *= parseFloat(settings.install_after_hours_multiplier) || 1.5;
  if (item.set_hours_installation) baseHours *= parseFloat(settings.install_set_hours_multiplier) || 1.15;
  if (item.poor_site_access) baseHours *= parseFloat(settings.install_poor_site_access_multiplier) || 1.25;

  // Recompute material quantities based on current item state (qty/size/raceway changed)
  const materials = (item.materials || []).map(mat => {
    const inv = (inventory || []).find(i => i.id === mat.inventory_item_id);
    if (!inv) {
      // detached/manual material — leave as-is
      return { ...mat, total_cost: (parseFloat(mat.unit_cost) || 0) * (parseFloat(mat.quantity) || 0) };
    }
    return materialFromInventory(inv, item);
  });

  const materialsCost = materials.reduce((sum, m) => sum + (parseFloat(m.total_cost) || 0), 0);
  const laborCost = baseHours * laborRate;
  const itemTotalCost = laborCost + materialsCost;

  return {
    ...item,
    materials,
    labor_hours: baseHours,
    labor_cost: laborCost,
    materials_cost: materialsCost,
    item_total_cost: itemTotalCost,
  };
};

// Project-level rollup
export const calcProjectTotals = (project) => {
  const items = project.items || [];
  const total_materials_cost = items.reduce((s, it) => s + (parseFloat(it.materials_cost) || 0), 0);
  const labor_cost = items.reduce((s, it) => s + (parseFloat(it.labor_cost) || 0), 0);
  const labor_hours = items.reduce((s, it) => s + (parseFloat(it.labor_hours) || 0), 0);

  // Equipment rollup
  const total_equipment_cost = (project.selected_equipment || []).reduce(
    (s, e) => s + (parseFloat(e.total_cost) || 0), 0
  );

  // Personnel rollup
  const total_personnel_cost = (project.personnel || []).reduce(
    (s, p) => s + (parseFloat(p.total_cost) || 0), 0
  );

  // Letters purchase rollup (calculated by lettersCalculator separately;
  // we just read the already-stored project.total_letters_cost here)
  const total_letters_cost = parseFloat(project.total_letters_cost) || 0;

  // Supplies are derived from materials cost (percent) + an optional manual extra amount
  const pct = parseFloat(project.supplies_percent_of_materials);
  const suppliesPct = isNaN(pct) ? 10 : pct; // default 10% of materials
  const extra = parseFloat(project.extra_supplies_cost) || 0;
  const supplies_from_materials = total_materials_cost * (suppliesPct / 100);
  const total_supplies_cost = supplies_from_materials + extra;

  const subtotal =
    labor_cost +
    total_materials_cost +
    total_supplies_cost +
    total_equipment_cost +
    total_personnel_cost +
    total_letters_cost;
  const markupPct = parseFloat(project.markup_percent) || 0;
  const markup_amount = subtotal * (markupPct / 100);
  const total_cost = subtotal + markup_amount;

  return {
    labor_hours,
    labor_cost,
    total_materials_cost,
    total_supplies_cost,
    total_equipment_cost,
    total_personnel_cost,
    subtotal,
    markup_amount,
    total_cost,
  };
};