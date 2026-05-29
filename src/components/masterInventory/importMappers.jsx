// Excel → Inventory mapping engine for the Master Inventory importer.
//
// Input: rows from the user's external system's "PartDetailsExport" XLSX.
// Output: routing decisions { target_entity, payload, group_key, name_key, action }
//
// The router uses "Part Group" + "Pricing Units" + name heuristics to pick the
// correct destination entity. Anything we can't confidently route goes to
// "metal_inventory" (the generic Inventory entity) as a safe fallback so the
// user never silently loses data.

import {
  Inventory,
  DimensionalLetterMaterial,
  VinylInventory,
} from "@/entities/all";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const cleanStr = (v) => (v === null || v === undefined ? "" : String(v).trim());
const cleanNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
};
const cleanBool = (v) => {
  const s = cleanStr(v).toLowerCase();
  return s === "yes" || s === "true" || s === "1";
};

// Convert "feet" / "inches" parent dimensions into a consistent inches value
const toInches = (val, units) => {
  const n = cleanNum(val);
  const u = cleanStr(units).toLowerCase();
  if (!n) return 0;
  if (u.startsWith("ft") || u === "feet" || u === "foot") return n * 12;
  return n; // assume inches
};

// Normalize a name into a comparison key (case-insensitive, trim whitespace)
export const nameKey = (s) => cleanStr(s).toLowerCase().replace(/\s+/g, " ");

// Group key: identifies the SAME product across different roll widths / thicknesses.
// Used so the importer can recognize that "Banner - 13oz (54in)" and
// "Banner - 13oz (63in)" are the same product group.
export const groupKey = (name) => {
  let s = cleanStr(name).toLowerCase();
  // strip size suffixes like "54\"", "13oz", " - 4x8", trailing dims
  s = s.replace(/\b\d+(\.\d+)?\s*(in|inches|"|'|ft|feet|oz|mil|mm)\b/g, "");
  s = s.replace(/\b\d+\s*x\s*\d+\b/g, "");
  s = s.replace(/[,\-]+\s*$/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
};

// ----------------------------------------------------------------------------
// Category detection
// ----------------------------------------------------------------------------

// Map the user's "Part Group" column to our internal target_entity key.
// Anything not in this map falls through to keyword detection on the name.
const PART_GROUP_MAP = {
  // Vinyl-ish
  "vinyl": "vinyl",
  "cut vinyl": "vinyl",
  "print vinyl": "vinyl",
  "printed vinyl": "vinyl",
  "wrap": "vinyl",
  "wrap vinyl": "vinyl",
  "laminate": "vinyl",
  "transfer tape": "vinyl",
  "window film": "vinyl",
  "perforated": "vinyl",
  "reflective": "vinyl",
  "banner": "vinyl", // banners are printed media, route to vinyl
  "banner material": "vinyl",

  // Substrates (sheet stock for dimensional letters / lobby signs)
  "acrylic": "substrate",
  "pvc": "substrate",
  "sintra": "substrate",
  "aluminum composite": "substrate",
  "acm": "substrate",
  "dibond": "substrate",
  "alumalite": "substrate",
  "mdf": "substrate",
  "hdu": "substrate",
  "foam": "substrate",
  "wood": "substrate",
  "coroplast": "substrate",
  "gatorboard": "substrate",
  "polycarbonate": "substrate",
  "lexan": "substrate",
  "styrene": "substrate",

  // Metal / sign materials
  "aluminum": "metal",
  "steel": "metal",
  "stainless": "metal",
  "angle": "metal",
  "tube": "metal",
  "channel": "metal",
  "flat bar": "metal",
  "sheet metal": "metal",
};

// Keyword fallbacks if Part Group is empty or unknown.
const KEYWORD_RULES = [
  { rx: /\b(vinyl|wrap|laminate|transfer tape|banner|window film|perforated|reflective|3m\s*ij|oracal|avery)/i, target: "vinyl" },
  { rx: /\b(acrylic|sintra|pvc|acm|dibond|alumalite|mdf|hdu|coroplast|gatorboard|polycarbonate|lexan|styrene|foam)/i, target: "substrate" },
  { rx: /\b(aluminum|steel|stainless|angle|tube|channel|flat bar|sheet metal|extrusion|tubing|square tube)/i, target: "metal" },
];

export const detectTarget = (row) => {
  const pg = cleanStr(row["Part Group"]).toLowerCase();
  if (PART_GROUP_MAP[pg]) return PART_GROUP_MAP[pg];

  const name = cleanStr(row["Part Name"]);
  for (const r of KEYWORD_RULES) {
    if (r.rx.test(name) || r.rx.test(pg)) return r.target;
  }

  // Last resort: route to metal (generic sign materials)
  return "metal";
};

// ----------------------------------------------------------------------------
// Per-target transformers
// ----------------------------------------------------------------------------

// Vinyl rows → VinylInventory schema
const toVinylPayload = (row) => {
  const name = cleanStr(row["Part Name"]);
  const widthIn = toInches(row["Parent Width"], row["Parent Width Units"]);
  const heightUnits = cleanStr(row["Parent Height Units"]).toLowerCase();
  const heightVal = cleanNum(row["Parent Height"]);
  // "Parent Height" for roll stock is usually in feet → convert to yards
  let rollLenYards = 0;
  if (heightUnits.startsWith("ft") || heightUnits === "feet") {
    rollLenYards = heightVal / 3;
  } else if (heightUnits.startsWith("yd")) {
    rollLenYards = heightVal;
  } else if (heightUnits === "inches" || heightUnits === "in") {
    rollLenYards = heightVal / 36;
  }

  const materialIs = cleanStr(row["Material Is"]).toLowerCase();
  const pricingMode = materialIs === "roll stock" ? "per_sqft" : "per_sqft";

  return {
    vinyl_name: name,
    product_group_key: groupKey(name),
    color_name: cleanStr(row["Color"]),
    finish: cleanStr(row["Finish"]).toLowerCase() || "gloss",
    roll_width_inches: widthIn || 24,
    roll_length_yards: rollLenYards || 50,
    pricing_mode: pricingMode,
    cost_per_sqft: cleanNum(row["Part Cost"]),
    supplier: cleanStr(row["Part Group"]),
    supplier_sku: cleanStr(row["Part Number"]),
    is_active: cleanBool(row["Is Active"]),
    show_in_vinyl_estimator: true,
    show_in_master_only: false,
    notes: `Imported from external system on ${new Date().toLocaleDateString()}`,
  };
};

// Substrate rows → DimensionalLetterMaterial schema
const toSubstratePayload = (row) => {
  const name = cleanStr(row["Part Name"]);
  const pg = cleanStr(row["Part Group"]).toLowerCase();

  // Guess material_type from the Part Group / name
  let materialType = "other";
  if (/acrylic/i.test(pg + name)) materialType = "acrylic";
  else if (/(pvc|sintra)/i.test(pg + name)) materialType = "pvc";
  else if (/(acm|dibond|alumalite|composite)/i.test(pg + name)) materialType = "aluminum_composite";
  else if (/aluminum/i.test(pg + name)) materialType = "aluminum_solid";
  else if (/mdf/i.test(pg + name)) materialType = "mdf";
  else if (/hdu/i.test(pg + name)) materialType = "hdu";
  else if (/foam/i.test(pg + name)) materialType = "foam";
  else if (/wood/i.test(pg + name)) materialType = "wood";

  // Try to pull thickness out of the name (e.g. 1/4", 1/8", 0.5")
  let thicknessIn = cleanNum(row["Thickness"]);
  if (!thicknessIn) {
    const m = name.match(/(\d+\/\d+|\d+\.\d+|\d+)\s*"/);
    if (m) {
      const t = m[1];
      if (t.includes("/")) {
        const [a, b] = t.split("/").map(Number);
        thicknessIn = a / b;
      } else {
        thicknessIn = parseFloat(t);
      }
    }
  }

  return {
    material_name: name,
    material_type: materialType,
    thickness_inches: thicknessIn || 0.5,
    sheet_length_inches: toInches(row["Parent Height"], row["Parent Height Units"]) || 96,
    sheet_width_inches: toInches(row["Parent Width"], row["Parent Width Units"]) || 48,
    cost_per_sheet: cleanNum(row["Part Cost"]),
    color: cleanStr(row["Color"]),
    supplier: cleanStr(row["Part Group"]),
    is_active: cleanBool(row["Is Active"]),
    show_in_dimensional_letters: true,
    show_in_lobby_sign_backer: true,
    notes: `Imported from external system on ${new Date().toLocaleDateString()}`,
  };
};

// Metal / generic sign materials → Inventory schema
const toMetalPayload = (row) => {
  const name = cleanStr(row["Part Name"]);
  const pg = cleanStr(row["Part Group"]);
  const pricingUnits = cleanStr(row["Pricing Units"]).toLowerCase();

  let unitType = "per_piece";
  if (pricingUnits.includes("foot") || pricingUnits.includes("linear")) unitType = "per_foot";
  else if (pricingUnits.includes("sqft") || pricingUnits.includes("square")) unitType = "per_sqft";
  else if (pricingUnits.includes("pound") || pricingUnits.includes("lb")) unitType = "per_pound";

  return {
    material_type: pg || "Other",
    product_type: name,
    size: cleanStr(row["Color"]) || cleanStr(row["Thickness"]) || "Standard",
    thickness_gauge: cleanStr(row["Thickness"]),
    cost_per_unit: cleanNum(row["Part Cost"]),
    unit_type: unitType,
    supplier: cleanStr(row["Part Group"]),
    notes: `Imported from external system on ${new Date().toLocaleDateString()}`,
  };
};

// ----------------------------------------------------------------------------
// Router — maps a raw Excel row to a routed import action
// ----------------------------------------------------------------------------

export const TARGETS = {
  vinyl: {
    label: "Vinyl",
    entity: VinylInventory,
    nameField: "vinyl_name",
    transform: toVinylPayload,
  },
  substrate: {
    label: "Substrates",
    entity: DimensionalLetterMaterial,
    nameField: "material_name",
    transform: toSubstratePayload,
  },
  metal: {
    label: "Metal / Sign Materials",
    entity: Inventory,
    nameField: "product_type",
    transform: toMetalPayload,
  },
};

export const routeRow = (row) => {
  const target = detectTarget(row);
  const conf = TARGETS[target];
  const payload = conf.transform(row);
  return {
    target_key: target,
    target_label: conf.label,
    nameField: conf.nameField,
    name: payload[conf.nameField],
    payload,
  };
};

// ----------------------------------------------------------------------------
// File validation — ensure this is the right XLSX before we touch the data
// ----------------------------------------------------------------------------

export const REQUIRED_COLUMNS = [
  "Part Name",
  "Part Group",
  "Part Cost",
  "Is Active",
];

export const validateColumns = (headers) => {
  const set = new Set(headers.map((h) => cleanStr(h)));
  const missing = REQUIRED_COLUMNS.filter((c) => !set.has(c));
  return { ok: missing.length === 0, missing };
};