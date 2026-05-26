// Pure helpers for the Repaint action.
// Given an item's repaint_config + the Settings entity, compute:
//   - paintable square footage (face + retainers/returns based on mode)
//   - feature & condition multipliers
//   - estimated paint quantity (gallons) and paint material cost
//   - prep+paint labor hours (sqft / sqft-per-hour, multiplied by feature & condition)
//
// Returns null when the item is not a monument-sign repaint with a config.

import {
  REPAINT_FEATURES, PAINT_CONDITION_LABELS,
} from "./repaintDefaults";

const num = (v, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

// Default fallbacks (mirror REPAINT_DEFAULTS) so calc still works if settings haven't been written yet.
const SETTING_FALLBACKS = {
  maintenance_repaint_coverage_sqft_per_gallon: 350,
  maintenance_repaint_paint_cost_per_gallon: 55,
  maintenance_repaint_primer_coats: 1,
  maintenance_repaint_finish_coats: 2,
  maintenance_repaint_sqft_per_hour: 60,
  maintenance_repaint_feat_dimensional_letters: 1.35,
  maintenance_repaint_feat_painted_letters: 1.25,
  maintenance_repaint_feat_applied_vinyl: 1.15,
  maintenance_repaint_feat_complex_layering: 1.40,
  maintenance_repaint_condition_step_pct: 8,
};

const settingNum = (settings, key) => num(settings?.[key], SETTING_FALLBACKS[key]);

export const isMonumentRepaint = (item) => {
  if (!item) return false;
  if (item.sign_type !== "monument_sign") return false;
  return (item.actions || []).includes("repaint");
};

// Default config seeded onto a service item the first time monument + repaint
// is selected.
export const defaultMonumentRepaintConfig = () => ({
  length_ft: 8,
  height_ft: 4,
  return_depth_in: 6,
  paint_mode: "entire_panel",  // "entire_panel" | "returns_only"
  features: [],                // ids from REPAINT_FEATURES (only used when entire_panel)
  retainer_width_in: 2,        // only used when returns_only
  paint_condition: 3,          // 1-10
  paint_both_sides: true,      // monument typically has 2 painted faces
});

// SQFT computation. Length/Height in feet, return_depth in inches.
// Mode "entire_panel"  → face area × (1 or 2 sides) + perimeter band of returns
//                       (perimeter × return_depth converted to ft)
// Mode "returns_only"  → perimeter × retainer_width converted to ft
export const computeRepaintSqft = (cfg) => {
  if (!cfg) return { face_sqft: 0, returns_sqft: 0, total_sqft: 0, perimeter_ft: 0 };
  const L = Math.max(0, num(cfg.length_ft));
  const H = Math.max(0, num(cfg.height_ft));
  const perimeter_ft = 2 * (L + H);
  const sides = cfg.paint_both_sides ? 2 : 1;

  if (cfg.paint_mode === "returns_only") {
    const retainerFt = Math.max(0, num(cfg.retainer_width_in)) / 12;
    const returns_sqft = perimeter_ft * retainerFt;
    return { face_sqft: 0, returns_sqft, total_sqft: returns_sqft, perimeter_ft };
  }

  // entire_panel
  const face_sqft = L * H * sides;
  const returnDepthFt = Math.max(0, num(cfg.return_depth_in)) / 12;
  const returns_sqft = perimeter_ft * returnDepthFt;
  return { face_sqft, returns_sqft, total_sqft: face_sqft + returns_sqft, perimeter_ft };
};

// Feature multiplier — multiplicative across features when paint_mode = entire_panel.
export const featureMultiplier = (cfg, settings) => {
  if (!cfg || cfg.paint_mode !== "entire_panel") return 1;
  const selected = new Set(cfg.features || []);
  let mult = 1;
  REPAINT_FEATURES.forEach(f => {
    if (selected.has(f.id)) mult *= settingNum(settings, f.setting);
  });
  return mult;
};

// Condition multiplier — 1 + step% × (level - 1), clamped at level 1..10.
export const conditionMultiplier = (cfg, settings) => {
  const level = Math.min(10, Math.max(1, Math.round(num(cfg?.paint_condition, 1))));
  const stepPct = settingNum(settings, "maintenance_repaint_condition_step_pct");
  return 1 + (stepPct / 100) * (level - 1);
};

// Master compute. Returns null if item isn't a monument repaint.
export const computeMonumentRepaint = (item, settings) => {
  if (!isMonumentRepaint(item)) return null;
  const cfg = item.repaint_config || defaultMonumentRepaintConfig();
  const { face_sqft, returns_sqft, total_sqft, perimeter_ft } = computeRepaintSqft(cfg);

  const coverage = settingNum(settings, "maintenance_repaint_coverage_sqft_per_gallon") || 350;
  const pricePerGal = settingNum(settings, "maintenance_repaint_paint_cost_per_gallon");
  const primerCoats = Math.max(0, settingNum(settings, "maintenance_repaint_primer_coats"));
  const finishCoats = Math.max(0, settingNum(settings, "maintenance_repaint_finish_coats"));
  const sqftPerHour = settingNum(settings, "maintenance_repaint_sqft_per_hour") || 60;

  const totalCoats = primerCoats + finishCoats;
  const paintedSqft = total_sqft * totalCoats;
  const gallons = paintedSqft / coverage;
  const paintMaterialCost = gallons * pricePerGal;

  const featMult = featureMultiplier(cfg, settings);
  const condMult = conditionMultiplier(cfg, settings);
  const labor_hours = (total_sqft / sqftPerHour) * featMult * condMult;

  return {
    cfg,
    face_sqft, returns_sqft, total_sqft, perimeter_ft,
    coverage, pricePerGal, primerCoats, finishCoats, totalCoats,
    gallons,
    paint_material_cost: paintMaterialCost,
    feature_multiplier: featMult,
    condition_multiplier: condMult,
    paint_condition_label: PAINT_CONDITION_LABELS[Math.min(9, Math.max(0, (cfg.paint_condition || 1) - 1))],
    labor_hours,
  };
};