// Logic for suggesting equipment based on project line items.
// Pure functions — no React, no entity calls.

// Equipment types that lift workers to a height (used to match install height)
const LIFT_TYPES = ["ladder", "scissor_lift", "boom_lift", "scaffold"];

// Vehicles needed to transport crew & gear to the site
const VEHICLE_TYPES = ["truck", "van", "flatbed"];

/**
 * Given a list of line items and the equipment inventory, suggest which
 * pieces of equipment should be selected. Returns inventory items.
 */
export function suggestEquipmentForProject(items = [], inventory = []) {
  if (!items.length || !inventory.length) return [];

  const maxHeight = items.reduce(
    (m, it) => Math.max(m, parseFloat(it.installation_height_feet) || 0),
    0
  );

  const active = inventory.filter((e) => e.is_active !== false);
  const suggestions = [];

  // 1) Find the smallest lift that reaches the required height.
  const lifts = active
    .filter((e) => LIFT_TYPES.includes(e.equipment_type))
    .filter((e) => (parseFloat(e.max_height_feet) || 0) >= maxHeight)
    .sort(
      (a, b) =>
        (parseFloat(a.max_height_feet) || 0) -
        (parseFloat(b.max_height_feet) || 0)
    );

  if (lifts.length > 0) {
    suggestions.push(lifts[0]);
  }

  // 2) Add a vehicle for transport (prefer owned for cost efficiency).
  const vehicles = active
    .filter((e) => VEHICLE_TYPES.includes(e.equipment_type))
    .sort((a, b) => {
      const aOwned = a.ownership === "owned" ? 0 : 1;
      const bOwned = b.ownership === "owned" ? 0 : 1;
      return aOwned - bOwned;
    });

  if (vehicles.length > 0) {
    suggestions.push(vehicles[0]);
  }

  return suggestions;
}

/**
 * Build a `selected_equipment` row from an inventory equipment record.
 * Sets a sensible default duration based on the pricing mode and project labor hours.
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

  return {
    equipment_id: inv.id,
    equipment_name: inv.equipment_name,
    equipment_type: inv.equipment_type,
    pricing_mode: inv.pricing_mode,
    duration,
    include_delivery: false,
    delivery_pickup_cost: parseFloat(inv.delivery_pickup_cost) || 0,
    unit_cost: unitCost,
    total_cost: unitCost * duration,
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
  return {
    ...row,
    total_cost: unitCost * duration + delivery,
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