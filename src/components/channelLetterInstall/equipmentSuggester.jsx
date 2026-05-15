// Logic for suggesting equipment based on project line items.
// Pure functions — no React, no entity calls.

// Equipment types that lift workers to a height (used to match install height)
const LIFT_TYPES = ["ladder", "scissor_lift", "boom_lift", "boom_truck", "scaffold"];
const BOOM_TYPES = ["boom_lift", "boom_truck"];

// Vehicles needed to transport crew & gear to the site
const VEHICLE_TYPES = ["truck", "van", "flatbed", "boom_truck"];

/**
 * Given a list of line items and the equipment inventory, suggest which
 * pieces of equipment should be selected. Returns inventory items.
 *
 * Height-matching strategy (in order of preference):
 *  1. A boom_lift / boom_truck flagged `is_default_for_height` whose
 *     [default_height_min_feet, default_height_max_feet] range contains the
 *     project's max install height.
 *  2. Otherwise, the smallest active lift whose max_height_feet >= the
 *     project's max install height (legacy behavior).
 */
export function suggestEquipmentForProject(items = [], inventory = []) {
  if (!items.length || !inventory.length) return [];

  const maxHeight = items.reduce(
    (m, it) => Math.max(m, parseFloat(it.installation_height_feet) || 0),
    0
  );

  const active = inventory.filter((e) => e.is_active !== false);
  const suggestions = [];

  // 1) Default-by-height-range boom (user-configured) wins
  const defaultByRange = active.find((e) => {
    if (!BOOM_TYPES.includes(e.equipment_type)) return false;
    if (!e.is_default_for_height) return false;
    const min = parseFloat(e.default_height_min_feet) || 0;
    const max = parseFloat(e.default_height_max_feet) || 0;
    if (max <= 0) return false;
    return maxHeight >= min && maxHeight <= max;
  });

  if (defaultByRange) {
    suggestions.push(defaultByRange);
  } else {
    // 2) Fallback — smallest lift that reaches the required height.
    const lifts = active
      .filter((e) => LIFT_TYPES.includes(e.equipment_type))
      .filter((e) => (parseFloat(e.max_height_feet) || 0) >= maxHeight)
      .sort(
        (a, b) =>
          (parseFloat(a.max_height_feet) || 0) -
          (parseFloat(b.max_height_feet) || 0)
      );
    if (lifts.length > 0) suggestions.push(lifts[0]);
  }

  // 3) Add a vehicle for transport (prefer owned for cost efficiency) —
  //    but skip this if the lift we already picked IS a vehicle (boom truck).
  const haveVehicle = suggestions.some((s) => VEHICLE_TYPES.includes(s.equipment_type));
  if (!haveVehicle) {
    const vehicles = active
      .filter((e) => VEHICLE_TYPES.includes(e.equipment_type))
      .sort((a, b) => {
        const aOwned = a.ownership === "owned" ? 0 : 1;
        const bOwned = b.ownership === "owned" ? 0 : 1;
        return aOwned - bOwned;
      });
    if (vehicles.length > 0) suggestions.push(vehicles[0]);
  }

  return suggestions;
}

/**
 * Build a `selected_equipment` row from an inventory equipment record.
 * Sets a sensible default duration based on the pricing mode and project labor hours.
 * For booms, seeds `idle_running_cost_per_hour` and `idle_hours` (defaults to labor hours).
 */
export function selectedEquipmentFromInventory(inv, projectLaborHours = 0) {
  const laborHours = parseFloat(projectLaborHours) || 0;
  const laborDays = Math.max(1, Math.ceil(laborHours / 8));

  let duration = 1;
  let unitCost = 0;

  switch (inv.pricing_mode) {
    case "per_hour":
      duration = Math.max(1, Math.ceil(laborHours));
      unitCost = parseFloat(inv.cost_per_hour) || 0;
      break;
    case "per_day":
      duration = laborDays;
      unitCost = parseFloat(inv.cost_per_day) || 0;
      break;
    case "per_week":
      duration = Math.max(1, Math.ceil(laborDays / 5));
      unitCost = parseFloat(inv.cost_per_week) || 0;
      break;
    case "per_month":
      duration = 1;
      unitCost = parseFloat(inv.cost_per_month) || 0;
      break;
    case "owned_flat":
    case "per_project_flat":
      duration = 1;
      unitCost = parseFloat(inv.cost_flat) || 0;
      break;
    default:
      duration = 1;
      unitCost = 0;
  }

  // Idle-running fields apply to booms only
  const isBoom = BOOM_TYPES.includes(inv.equipment_type);
  const idleRate = isBoom ? (parseFloat(inv.idle_running_cost_per_hour) || 0) : 0;
  // Default idle to labor hours rounded up — most installs run the boom continuously
  const idleHours = isBoom && idleRate > 0 ? Math.max(0, Math.ceil(laborHours)) : 0;

  return {
    equipment_id: inv.id,
    equipment_name: inv.equipment_name,
    equipment_type: inv.equipment_type,
    pricing_mode: inv.pricing_mode,
    duration,
    include_delivery: false,
    delivery_pickup_cost: parseFloat(inv.delivery_pickup_cost) || 0,
    unit_cost: unitCost,
    idle_running_cost_per_hour: idleRate,
    idle_hours: idleHours,
    idle_cost: idleRate * idleHours,
    total_cost: unitCost * duration + (idleRate * idleHours),
    notes: "",
  };
}

/**
 * Recalculate the total cost of a selected equipment row.
 */
export function recalcEquipmentRow(row) {
  const duration = parseFloat(row.duration) || 0;
  const unitCost = parseFloat(row.unit_cost) || 0;
  const delivery = row.include_delivery ? parseFloat(row.delivery_pickup_cost) || 0 : 0;
  const idleHours = parseFloat(row.idle_hours) || 0;
  const idleRate = parseFloat(row.idle_running_cost_per_hour) || 0;
  const idle_cost = idleHours * idleRate;
  return {
    ...row,
    idle_cost,
    total_cost: unitCost * duration + delivery + idle_cost,
  };
}

/**
 * Recalculate a personnel row's total cost.
 */
export function recalcPersonnelRow(row) {
  const rate = parseFloat(row.hourly_rate) || 0;
  const hours = parseFloat(row.hours) || 0;
  return { ...row, total_cost: rate * hours };
}

/**
 * Display label for a pricing mode's duration unit.
 */
export function durationUnitLabel(pricing_mode) {
  switch (pricing_mode) {
    case "per_hour": return "hours";
    case "per_day": return "days";
    case "per_week": return "weeks";
    case "per_month": return "months";
    case "owned_flat":
    case "per_project_flat":
      return "flat";
    default: return "units";
  }
}

/**
 * Suggest an appropriate crew (Crew Lead / Installer / Helper) for a project.
 * Conservative defaults:
 *   - <= 12 ft and < 12 letters → 2 people (Lead + Installer)
 *   - <= 25 ft OR <= 25 letters → 2 people
 *   - taller / bigger jobs       → 3 people (Lead + Installer + Helper)
 *   - very tall (>= 55 ft) AND big (>= 30 letters) → 3 people
 * Total crew hours = project labor hours, divided evenly per person.
 */
export function suggestPersonnelForProject(items = [], projectLaborHours = 0, rateForRole = () => 0) {
  const maxHeight = items.reduce(
    (m, it) => Math.max(m, parseFloat(it.installation_height_feet) || 0),
    0
  );
  const totalLetters = items.reduce(
    (s, it) => s + (parseFloat(it.qty_letters) || 0),
    0
  );

  let crewSize = 2; // baseline: Lead + Installer
  if (maxHeight >= 55 && totalLetters >= 30) crewSize = 3;
  else if (maxHeight >= 40 || totalLetters >= 30) crewSize = 3;

  const perPersonHours = projectLaborHours && crewSize > 0
    ? +(projectLaborHours / crewSize).toFixed(2)
    : 0;

  const roles = ["Crew Lead", "Installer", "Helper"];
  return Array.from({ length: crewSize }, (_, i) => {
    const role = roles[i] || "Installer";
    return recalcPersonnelRow({
      name: "",
      role,
      hourly_rate: rateForRole(role),
      hours: perPersonHours,
      total_cost: 0,
    });
  });
}