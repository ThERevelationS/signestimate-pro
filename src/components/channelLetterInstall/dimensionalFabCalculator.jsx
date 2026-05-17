// Auto-build pricing for Dimensional Letters: Material + (CNC or Laser) + Paint.
// Pulls rates from the SAME settings used by the CNC, Laser, and Paint estimators —
// so any change there flows through here.
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
  letter_height_inches: 0,
  letter_width_inches: 0, // average width per letter (for area calculation)
  letter_perimeter_inches: 0, // 0 = auto-estimate from H + W (rectangle bound)

  // Cutting method — drives which estimator's rates we pull from
  cutting_method: "cnc", // "cnc" | "laser"

  // Cut params — initially seeded from settings on material/method change,
  // but the user can override.
  cut_speed_ipm: 50,
  setup_minutes: 15, // fixed setup minutes per job (split across all letters)

  // Material/cut multiplier — typically resolved from material type, but stored
  // so changes to settings are reflected next time the modal opens.
  cut_multiplier: 1.0,

  // Paint params
  paint_letters: true,
  paint_sides: "front_and_edges", // none | front | front_and_edges | all
  num_paint_colors: 1,

  // Resolved cost breakdown (filled by calculator)
  unit_material_cost: 0,
  unit_cut_cost: 0,
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

// ===== Rate accessors — keyed off the actual setting_name strings used by =====
// =====   pages/CNCSettings, pages/LaserSettings, and pages/PaintSettings  =====

export const getCncRates = (settings) => ({
  machine_rate: num(settings.cnc_machine_rate, 75),
  labor_rate: num(settings.cnc_labor_rate, 45),
  letter_perimeter_factor: num(settings.cnc_letter_perimeter_factor, 3.5),
});

export const getLaserRates = (settings) => ({
  machine_rate: num(settings.parameter_laser_machine_rate, 100),
  labor_rate: num(settings.parameter_laser_labor_rate, 45),
  letter_perimeter_factor: num(settings.laser_letter_perimeter_factor, 3.5),
});

export const getActiveRates = (cuttingMethod, settings) =>
  cuttingMethod === "laser" ? getLaserRates(settings) : getCncRates(settings);

// Compute mixed liquid paint $/sqft from the same formula PaintSettings.jsx uses.
const computeLiquidPaintPerSqft = (settings) => {
  const unitFactors = { oz: 1 / 128, pint: 1 / 8, quart: 1 / 4, liter: 1 / 3.78541, gallon: 1 };
  const perGallon = (cost, unit) => {
    const c = num(cost);
    const f = unitFactors[unit] || unitFactors.gallon;
    return f > 0 ? c / f : 0;
  };
  const paintG = perGallon(settings.paint_cost_per_unit, settings.paint_unit);
  const hardG = perGallon(settings.hardener_cost_per_unit, settings.hardener_unit);
  const redG = perGallon(settings.reducer_cost_per_unit, settings.reducer_unit);

  const pR = num(settings.paint_mix_ratio);
  const hR = num(settings.hardener_mix_ratio);
  const rR = num(settings.reducer_mix_ratio);
  const total = pR + hR + rR;
  if (total === 0) return 0;
  const costPerMixedGallon = (paintG * pR + hardG * hR + redG * rR) / total;
  const coverage = num(settings.mixed_paint_coverage_sqft_per_gallon, 1);
  return coverage > 0 ? costPerMixedGallon / coverage : 0;
};

export const getPaintRates = (settings) => ({
  labor_rate: num(settings.default_labor_rate, 60),
  supplies_per_sqft: num(settings.default_paint_supplies_per_sqft, 1.25),
  liquid_paint_per_sqft: computeLiquidPaintPerSqft(settings),
});

// Compute the cost of one dimensional letter using the fab config + settings
export const calcDimensionalUnitCost = (fab, qty, settings) => {
  const safe = { ...emptyFabConfig(), ...fab };
  const letterQty = Math.max(1, num(qty, 1));

  // === 1) Material cost per letter ===
  const faceAreaSqin = estimateFaceArea(safe.letter_height_inches, safe.letter_width_inches);
  const unit_material_cost = faceAreaSqin * num(safe.material_cost_per_sqin);

  // === 2) Cutting cost per letter (CNC or Laser) ===
  const rates = getActiveRates(safe.cutting_method, settings);
  const cutLengthIn = estimatePerimeter(
    safe.letter_height_inches,
    safe.letter_width_inches,
    safe.letter_perimeter_inches
  );
  const cutSpeed = Math.max(1, num(safe.cut_speed_ipm, 50));
  const cutMultiplier = Math.max(0.01, num(safe.cut_multiplier, 1));
  const cutMinutes = (cutLengthIn / cutSpeed) * cutMultiplier;
  const setupMinutesPerLetter = num(safe.setup_minutes, 0) / letterQty;
  const cutHours = (cutMinutes + setupMinutesPerLetter) / 60;
  const unit_cut_cost = cutHours * (rates.machine_rate + rates.labor_rate);

  // === 3) Paint cost per letter ===
  let unit_paint_cost = 0;
  if (safe.paint_letters && safe.paint_sides !== "none") {
    const paint = getPaintRates(settings);
    const perSqftCost = paint.supplies_per_sqft + paint.liquid_paint_per_sqft;

    const faceSqft = faceAreaSqin / 144;
    const thickness = num(safe.material_thickness_inches, 0.5);
    const edgeSqft = (cutLengthIn * thickness) / 144;

    let paintedSqft = 0;
    if (safe.paint_sides === "front") paintedSqft = faceSqft;
    else if (safe.paint_sides === "front_and_edges") paintedSqft = faceSqft + edgeSqft;
    else if (safe.paint_sides === "all") paintedSqft = faceSqft * 2 + edgeSqft;

    // Multi-color premium: each extra color adds 15% to the paint cost
    const colorMultiplier = 1 + Math.max(0, num(safe.num_paint_colors, 1) - 1) * 0.15;

    const paintMaterialsCost = paintedSqft * perSqftCost * colorMultiplier;
    const paintLaborHours = (paintedSqft * 3) / 60; // 3 minutes per sqft baseline
    const paintLaborCost = paintLaborHours * paint.labor_rate * colorMultiplier;

    unit_paint_cost = paintMaterialsCost + paintLaborCost;
  }

  const unit_total_cost = unit_material_cost + unit_cut_cost + unit_paint_cost;

  return {
    ...safe,
    face_area_sqin: faceAreaSqin,
    cut_length_inches: cutLengthIn,
    unit_material_cost,
    unit_cut_cost,
    // Back-compat alias: older code reads unit_cnc_cost
    unit_cnc_cost: unit_cut_cost,
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

// Look up the per-thickness cut speed setting for the active method.
// Thickness keys mirror what CNCSettings / LaserSettings write:
//   CNC:   cnc_cut_speed_<thickness>   (e.g. cnc_cut_speed_1_2, cnc_cut_speed_1_1_4)
//   Laser: cut_speed_<thickness>       (e.g. cut_speed_1_8, cut_speed_3_4)
// Thicknesses are converted using the same replace rules:
//   "/" -> "_", "-" -> "_"
export const lookupCutSpeed = (cuttingMethod, thicknessInches, settings) => {
  if (!thicknessInches) return null;
  // Convert decimal thickness back to imperial-style string key.
  // We round to the nearest 1/16 then try common fraction strings.
  const candidates = decimalToImperialKeys(thicknessInches);
  const prefix = cuttingMethod === "laser" ? "cut_speed_" : "cnc_cut_speed_";
  for (const c of candidates) {
    const v = settings[`${prefix}${c}`];
    if (v !== undefined && v !== null && v !== "") return num(v);
  }
  return null;
};

// Lookup material cut multiplier from settings.
// CNC: <material>_cnc_cut_multiplier (e.g. wood_cnc_cut_multiplier)
// Laser: <material>_cut_multiplier (e.g. wood_cut_multiplier)
export const lookupCutMultiplier = (cuttingMethod, materialType, settings) => {
  if (!materialType) return 1;
  const mat = materialType.toLowerCase();
  const key = cuttingMethod === "laser" ? `${mat}_cut_multiplier` : `${mat}_cnc_cut_multiplier`;
  const v = settings[key];
  return v !== undefined && v !== null && v !== "" ? num(v, 1) : 1;
};

// Map common decimal thicknesses → key strings used in settings.
// We try a few formats since the user might have set it under "1/2" → "1_2"
// or under fractional approximations.
const decimalToImperialKeys = (decimal) => {
  const map = {
    0.0625: ["1_16"],
    0.125: ["1_8"],
    0.1875: ["3_16"],
    0.25: ["1_4"],
    0.375: ["3_8"],
    0.5: ["1_2"],
    0.625: ["5_8"],
    0.75: ["3_4"],
    0.875: ["7_8"],
    1: ["1"],
    1.25: ["1_1_4"],
    1.5: ["1_1_2"],
    2: ["2"],
    2.5: ["2_1_2"],
    3: ["3"],
    3.5: ["3_1_2"],
    4: ["4"],
  };
  // Snap to nearest 1/16
  const snap = Math.round(decimal * 16) / 16;
  return map[snap] || [];
};

export const PAINT_SIDES_LABELS = {
  none: "No Paint",
  front: "Front Only",
  front_and_edges: "Front + Edges",
  all: "All Sides",
};

export const CUTTING_METHOD_LABELS = {
  cnc: "CNC Routing",
  laser: "Laser Cutting",
};