// ============================================================================
// ALL-IN-ONE ESTIMATOR — MODULE REGISTRY (single source of truth)
//
// To add a FUTURE estimator to the All-In-One Estimator, add ONE entry here:
//   - key:             stable id (match components/modulesRegistry key if it exists)
//   - name/shortName:  display labels   - description: one-line card blurb
//   - icon/colors:     visual identity (use literal Tailwind classes)
//   - entityName:      the project entity name (base44.entities[entityName])
//   - newEstimatePage: page name of that module's "New Estimate" page
//   - Page:            lazy-loaded page component — embedded INLINE inside the
//                      All-In-One estimator so sections never leave the page
//   - editParam:       URL param the estimator page uses to load an existing
//                      project ("edit" or "id")
//   - sharedFields:    AIO project-detail fields this module's entity accepts —
//                      auto-filled on section creation AND pushed on every save
//   - getTotal(p):     how that module's saved project rolls up to ONE total
//   - breakdownPairs:  [label, entityField] pairs powering the combined Cost
//                      Summary tab (getBreakdown)
//   - detailArrays:    [entityArrayField, groupLabel] pairs powering the
//                      combined Bill of Materials tab (getDetailLines)
//   - totalFormula:    human-readable description of getTotal — shown in the
//                      Formula Viewer's All-In-One tab automatically
//
// The combiner page, the inline section panel, the combined Cost Summary /
// Bill of Materials / Customer View tabs, and the Formula Viewer all render
// from this list, so a new entry shows up everywhere with no other changes.
// ============================================================================
import { lazy } from "react";
import { base44 } from "@/api/base44Client";
import {
  Wrench, Anchor, ClipboardCheck, Paintbrush, Zap, Router, Droplets,
} from "lucide-react";

const n = (v) => Number(v) || 0;

// Shared project-detail fields every module entity accepts.
export const BASE_SHARED_FIELDS = ["client_name", "estimate_number", "hyperlink"];

// Generic, tolerant extractors for heterogeneous sub-project line arrays.
const NAME_KEYS = ["name", "item_name", "equipment_name", "material_name", "description", "label", "display_name", "sign_type", "product_name", "vinyl_name"];
const QTY_KEYS = ["quantity", "qty", "qty_letters", "duration", "hours"];
const COST_KEYS = ["total_cost", "cost", "total", "line_total", "total_price"];
const firstVal = (obj, keys) => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return undefined;
};

export const ESTIMATOR_MODULES = [
  {
    key: "channel_letter_installation",
    name: "Channel & Dimensional Letters | Lobby Signs",
    shortName: "Channel & Dimensional",
    description: "Letter purchases, install labor, crew, equipment & travel",
    icon: Wrench,
    colors: { text: "text-purple-600", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-800", hex: "#9333ea" },
    entityName: "ChannelLetterInstallation",
    newEstimatePage: "NewChannelLetterInstallation",
    Page: lazy(() => import("@/pages/NewChannelLetterInstallation")),
    editParam: "edit",
    sharedFields: [...BASE_SHARED_FIELDS, "site_address"],
    getTotal: (p) => n(p.total_cost),
    totalFormula: "Saved project grand total (total_cost)",
    breakdownPairs: [
      ["Letters package", "total_letters_cost"],
      ["Install materials", "total_materials_cost"],
      ["Supplies", "total_supplies_cost"],
      ["Equipment", "total_equipment_cost"],
      ["Crew labor", "total_personnel_cost"],
      ["Travel", "total_travel_cost"],
      ["Markup", "markup_amount"],
    ],
    detailArrays: [
      ["letter_purchases", "Letters"],
      ["items", "Install Items"],
      ["selected_equipment", "Equipment"],
      ["personnel", "Crew"],
    ],
  },
  {
    key: "foundation",
    name: "Concrete | Masonry | Poles",
    shortName: "Concrete | Masonry | Poles",
    description: "Foundations, excavation, walls, poles & site landscaping",
    icon: Anchor,
    colors: { text: "text-amber-600", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-800", hex: "#d97706" },
    entityName: "FoundationProject",
    newEstimatePage: "NewFoundationEstimate",
    Page: lazy(() => import("@/pages/NewFoundationEstimate")),
    editParam: "id",
    sharedFields: BASE_SHARED_FIELDS,
    getTotal: (p) =>
      n(p.total_concrete_cost) + n(p.total_rebar_cost) + n(p.total_excavation_cost) +
      n(p.total_labor_cost) + n(p.total_equipment_cost) + n(p.total_forming_materials_cost) +
      n(p.total_pole_cost) + n(p.total_pole_painting_cost) + n(p.total_brick_cost) +
      n(p.total_fill_cost) + n(p.total_wall_cost) + n(p.total_wall_cap_cost),
    totalFormula:
      "concrete + rebar + excavation + labor + equipment + forming materials + poles + pole painting + brick + fill + walls + wall caps",
    breakdownPairs: [
      ["Concrete", "total_concrete_cost"],
      ["Rebar", "total_rebar_cost"],
      ["Excavation", "total_excavation_cost"],
      ["Labor", "total_labor_cost"],
      ["Equipment", "total_equipment_cost"],
      ["Forming materials", "total_forming_materials_cost"],
      ["Poles", "total_pole_cost"],
      ["Pole painting", "total_pole_painting_cost"],
      ["Brick", "total_brick_cost"],
      ["Fill", "total_fill_cost"],
      ["Walls", "total_wall_cost"],
      ["Wall caps", "total_wall_cap_cost"],
    ],
    detailArrays: [["items", "Foundations"]],
  },
  {
    key: "sign_maintenance",
    name: "Sign Maintenance",
    shortName: "Sign Maintenance",
    description: "Service calls, repairs, retrofits, crew & travel",
    icon: ClipboardCheck,
    colors: { text: "text-cyan-600", bg: "bg-cyan-50", badge: "bg-cyan-100 text-cyan-800", hex: "#0891b2" },
    entityName: "MaintenanceProject",
    newEstimatePage: "NewSignMaintenance",
    Page: lazy(() => import("@/pages/NewSignMaintenance")),
    editParam: "edit",
    sharedFields: [...BASE_SHARED_FIELDS, "site_address"],
    getTotal: (p) => n(p.total_cost),
    totalFormula: "Saved project grand total (total_cost)",
    breakdownPairs: [
      ["Materials", "total_materials_cost"],
      ["Supplies", "total_supplies_cost"],
      ["Equipment", "total_equipment_cost"],
      ["Crew labor", "total_personnel_cost"],
      ["Travel", "total_travel_cost"],
      ["Markup", "markup_amount"],
    ],
    detailArrays: [
      ["items", "Service Items"],
      ["selected_equipment", "Equipment"],
      ["personnel", "Crew"],
    ],
  },
  {
    key: "painting",
    name: "Paint Estimator",
    shortName: "Paint",
    description: "Paint masking, liquid paint, supplies & labor",
    icon: Paintbrush,
    colors: { text: "text-blue-600", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-800", hex: "#2563eb" },
    entityName: "Project",
    newEstimatePage: "NewPaintEstimate",
    Page: lazy(() => import("@/pages/NewPaintEstimate")),
    editParam: "edit",
    sharedFields: BASE_SHARED_FIELDS,
    getTotal: (p) =>
      n(p.total_paint_mask_cost) + n(p.total_liquid_paint_and_supplies_cost) + n(p.total_labor_cost),
    totalFormula: "paint mask + liquid paint & supplies + labor",
    breakdownPairs: [
      ["Paint mask", "total_paint_mask_cost"],
      ["Liquid paint & supplies", "total_liquid_paint_and_supplies_cost"],
      ["Labor", "total_labor_cost"],
    ],
    detailArrays: [["items", "Line Items"]],
  },
  {
    key: "laser",
    name: "Laser Cutting & Engraving",
    shortName: "Laser",
    description: "Laser machine time, supplies & labor",
    icon: Zap,
    colors: { text: "text-red-600", bg: "bg-red-50", badge: "bg-red-100 text-red-800", hex: "#dc2626" },
    entityName: "LaserProject",
    newEstimatePage: "NewLaserEstimate",
    Page: lazy(() => import("@/pages/NewLaserEstimate")),
    editParam: "edit",
    sharedFields: BASE_SHARED_FIELDS,
    getTotal: (p) => n(p.total_machine_cost) + n(p.total_supplies_cost) + n(p.total_labor_cost),
    totalFormula: "machine + supplies + labor",
    breakdownPairs: [
      ["Machine time", "total_machine_cost"],
      ["Supplies", "total_supplies_cost"],
      ["Labor", "total_labor_cost"],
    ],
    detailArrays: [["items", "Line Items"]],
  },
  {
    key: "cnc",
    name: "CNC Routing",
    shortName: "CNC",
    description: "CNC machine time & labor",
    icon: Router,
    colors: { text: "text-green-600", bg: "bg-green-50", badge: "bg-green-100 text-green-800", hex: "#16a34a" },
    entityName: "CNCProject",
    newEstimatePage: "NewCNCEstimate",
    Page: lazy(() => import("@/pages/NewCNCEstimate")),
    editParam: "edit",
    sharedFields: BASE_SHARED_FIELDS,
    getTotal: (p) => n(p.total_machine_cost) + n(p.total_labor_cost),
    totalFormula: "machine + labor",
    breakdownPairs: [
      ["Machine time", "total_machine_cost"],
      ["Labor", "total_labor_cost"],
    ],
    detailArrays: [["items", "Line Items"]],
  },
  {
    key: "metal_fabrication",
    name: "Metal Fabrication",
    shortName: "Metal Fab",
    description: "Material, fabrication, welding & finishing",
    icon: Wrench,
    colors: { text: "text-orange-600", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-800", hex: "#ea580c" },
    entityName: "MetalProject",
    newEstimatePage: "NewMetalEstimate",
    Page: lazy(() => import("@/pages/NewMetalEstimate")),
    editParam: "edit",
    sharedFields: BASE_SHARED_FIELDS,
    getTotal: (p) =>
      n(p.total_material_cost) + n(p.total_supplies_cost) + n(p.total_fabrication_cost) +
      n(p.total_welding_cost) + n(p.total_finishing_cost),
    totalFormula: "material + supplies + fabrication + welding + finishing",
    breakdownPairs: [
      ["Material", "total_material_cost"],
      ["Supplies", "total_supplies_cost"],
      ["Fabrication", "total_fabrication_cost"],
      ["Welding", "total_welding_cost"],
      ["Finishing", "total_finishing_cost"],
    ],
    detailArrays: [["items", "Line Items"]],
  },
  {
    key: "vinyl_estimator",
    name: "Vinyl Printing, Cutting & Lamination",
    shortName: "Vinyl",
    description: "Vinyl cutting, printing, lamination workflows",
    icon: Droplets,
    colors: { text: "text-sky-600", bg: "bg-sky-50", badge: "bg-sky-100 text-sky-800", hex: "#0284c7" },
    entityName: "VinylProject",
    newEstimatePage: "NewVinylEstimate",
    Page: lazy(() => import("@/pages/NewVinylEstimate")),
    editParam: "edit",
    sharedFields: BASE_SHARED_FIELDS,
    getTotal: (p) => n(p.total_cost),
    totalFormula: "Saved project grand total (total_cost)",
    breakdownPairs: [],
    detailArrays: [["workflows", "Workflows"], ["items", "Line Items"]],
  },
];

export const ESTIMATOR_MODULES_BY_KEY = ESTIMATOR_MODULES.reduce((acc, m) => {
  acc[m.key] = m;
  return acc;
}, {});

export const getModuleEntity = (mod) => base44.entities[mod.entityName];

export const getModuleTotal = (mod, project) => mod.getTotal(project || {});

// Cost breakdown for the combined Cost Summary tab. Falls back to a single
// "Project total" line for modules without itemized total_* fields.
export const getModuleBreakdown = (mod, project) => {
  const p = project || {};
  const lines = (mod.breakdownPairs || [])
    .map(([label, key]) => ({ label, amount: n(p[key]) }))
    .filter((l) => l.amount !== 0);
  if (lines.length === 0) {
    const total = getModuleTotal(mod, p);
    return total ? [{ label: "Project total", amount: total }] : [];
  }
  return lines;
};

// Best-effort line extraction for the combined Bill of Materials tab.
export const getModuleDetailLines = (mod, project) => {
  const p = project || {};
  const out = [];
  (mod.detailArrays || []).forEach(([field, group]) => {
    const arr = p[field];
    if (!Array.isArray(arr)) return;
    arr.forEach((row) => {
      if (!row || typeof row !== "object") return;
      const name = firstVal(row, NAME_KEYS);
      const cost = n(firstVal(row, COST_KEYS));
      if (name === undefined && !cost) return;
      out.push({
        group,
        name: String(name ?? "Item"),
        qty: n(firstVal(row, QTY_KEYS)) || 1,
        cost,
      });
    });
  });
  return out;
};

// Auto-fill payload: AIO project details mapped onto a module's entity fields.
// NOTE: project_name is intentionally NOT pushed here — each section keeps its
// own name (e.g. "Main St — Paint"). client/estimate #/link/address ARE shared.
export const buildSharedPayload = (mod, aio) => {
  const fields = mod.sharedFields || BASE_SHARED_FIELDS;
  const out = {};
  fields.forEach((f) => { out[f] = aio[f] || ""; });
  return out;
};