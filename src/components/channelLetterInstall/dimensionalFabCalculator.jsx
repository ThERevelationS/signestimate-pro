// Auto-build pricing for Dimensional Letters: Material + CNC + Paint.
// Pulls rates from project settings (CNC + Paint module defaults).
// Pure functions — no React, no entity calls.

const num = (v, fb = 0) => {
  const n = parseFloat(v);
  return isNaN(n) ? fb : n;
};

// Default fab config for a brand-new dimensional letter row
export const emptyFabConfig = () => ({
  material_id: null, // selected DimensionalLetterMaterial.id
  material_name: "",
  material_thickness_inches: 0.5,
  material_cost_per_sqin: 0, // resolved/cached at config time
  sheet_yield_factor: 0.7,

  // Letter geometry — used for area + cut length
  letter_height_inches: 24,
  letter_width_inches: 18, // average width per letter (for area calculation)
  letter_perimeter_inches: 0, // 0 = auto-estimate from H + W (rectangle bound)

  // CNC params (rates pulled from settings)
  cnc_cut_speed_ipm: 50,
  cnc_setup_minutes: 15, // fixed setup minutes per job (split across all letters)

  // Paint params
  paint_letters: true,
  paint_sides: "front_and_edges", // none | front | front_and_edges | all
  num_paint_colors: 1,

  // Resolved cost breakdown (filled by calculator)
  unit_material_cost: 0,
  unit_cnc_cost: 0,
  unit_paint_cost: 0,
  unit_total_cost: 0,
});

// Estimate perimeter from height & width if user didn't override.
// Uses 2*(H+W) * 1.4 to roughly account for typical letter shape complexity.
const estimatePerimeter = (h, w, override) => {
  if (num(override) > 0) return num(override);
  const boundingPerim = 2 * (num(h) + num(w));
  return boundingPerim * 1.4;
};

// Estimate letter face area in sq inches.
// Letters don't fill their bounding box, so we apply a typical fill factor of 0.55.
const estimateFaceArea = (h, w) => {
  return num(h) * num(w) * 0.55;
};

// Compute the cost of one dimensional letter using the fab config + settings
export const calcDimensionalUnitCost = (fab, qty, settings) => {
  const safe = { ...emptyFabConfig(), ...fab };
  const letterQty = Math.max(1, num(qty, 1));

  // === 1) Material cost per letter ===
  const faceAreaSqin = estimateFaceArea(safe.letter_height_inches, safe.letter_width_inches);
  // material_cost_per_sqin already accounts for sheet_yield_factor when resolved.
  const unit_material_cost = faceAreaSqin * num(safe.material_cost_per_sqin);

  // === 2) CNC cost per letter ===
  const cncMachineRate = num(settings.machine_rate_per_hour, 75); // CNC machine $/hr
  const cncLaborRate = num(settings.labor_rate, 45); // CNC operator $/hr
  const cutLengthIn = estimatePerimeter(safe.letter_height_inches, safe.letter_width_inches, safe.letter_perimeter_inches);
  const cutSpeed = Math.max(1, num(safe.cnc_cut_speed_ipm, 50)); // in/min
  const cutMinutes = cutLengthIn / cutSpeed;
  // Setup time is split across all letters
  const setupMinutesPerLetter = num(safe.cnc_setup_minutes, 0) / letterQty;
  const totalCncMinutes = cutMinutes + setupMinutesPerLetter;
  const cncHours = totalCncMinutes / 60;
  // Combined rate (machine + operator)
  const unit_cnc_cost = cncHours * (cncMachineRate + cncLaborRate);

  // === 3) Paint cost per letter ===
  let unit_paint_cost = 0;
  if (safe.paint_letters && safe.paint_sides !== "none") {
    const paintLaborRate = num(settings.paint_labor_rate, 60); // Paint shop $/hr
    const paintSuppliesPerSqft = num(settings.paint_supplies_rate_per_sqft, 2.5);
    const liquidPaintPerSqft = num(settings.paint_liquid_paint_per_sqft, 1.25);
    const perSqftCost = paintSuppliesPerSqft + liquidPaintPerSqft;

    // Painted area depends on which sides
    const faceSqft = faceAreaSqin / 144;
    const thickness = num(safe.material_thickness_inches, 0.5);
    const edgeSqft = (cutLengthIn * thickness) / 144;

    let paintedSqft = 0;
    if (safe.paint_sides === "front") paintedSqft = faceSqft;
    else if (safe.paint_sides === "front_and_edges") paintedSqft = faceSqft + edgeSqft;
    else if (safe.paint_sides === "all") paintedSqft = (faceSqft * 2) + edgeSqft;

    // Multi-color premium: each extra color adds 15% to the paint cost
    const colorMultiplier = 1 + Math.max(0, num(safe.num_paint_colors, 1) - 1) * 0.15;

    const paintMaterialsCost = paintedSqft * perSqftCost * colorMultiplier;
    // Labor: ~3 minutes per sqft as a baseline
    const paintLaborHours = (paintedSqft * 3) / 60;
    const paintLaborCost = paintLaborHours * paintLaborRate * colorMultiplier;

    unit_paint_cost = paintMaterialsCost + paintLaborCost;
  }

  const unit_total_cost = unit_material_cost + unit_cnc_cost + unit_paint_cost;

  return {
    ...safe,
    face_area_sqin: faceAreaSqin,
    cut_length_inches: cutLengthIn,
    unit_material_cost,
    unit_cnc_cost,
    unit_paint_cost,
    unit_total_cost,
  };
};

// Resolve cost_per_sqin from a material record (taking yield into account)
export const materialCostPerSqin = (material) => {
  if (!material) return 0;
  const sheetArea = num(material.sheet_length_inches) * num(material.sheet_width_inches);
  const yieldFactor = Math.max(0.05, Math.min(1, num(material.yield_factor, 0.7)));
  const usableArea = sheetArea * yieldFactor;
  if (usableArea <= 0) return 0;
  return num(material.cost_per_sheet) / usableArea;
};

export const PAINT_SIDES_LABELS = {
  none: "No Paint",
  front: "Front Only",
  front_and_edges: "Front + Edges",
  all: "All Sides",
};