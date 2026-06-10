// ============================================================================
// ALL-IN-ONE ESTIMATOR — MODULE REGISTRY (single source of truth)
//
// To add a FUTURE estimator to the All-In-One Estimator, add ONE entry here:
//   - key:             stable id (match components/modulesRegistry key if it exists)
//   - name/shortName:  display labels
//   - icon/colors:     visual identity (use literal Tailwind classes)
//   - entityName:      the project entity name (base44.entities[entityName])
//   - newEstimatePage: page name of that module's "New Estimate" page
//   - editParam:       URL param the estimator page uses to load an existing
//                      project ("edit" or "id")
//   - getTotal(p):     how that module's saved project rolls up to ONE total
//   - totalFormula:    human-readable description of getTotal — shown in the
//                      Formula Viewer's All-In-One tab automatically
//
// The combiner page, the estimate picker, and the Formula Viewer all render
// from this list, so a new entry shows up everywhere with no other changes.
// ============================================================================
import { base44 } from "@/api/base44Client";
import {
  Wrench, Anchor, ClipboardCheck, Paintbrush, Zap, Router, Droplets,
} from "lucide-react";

const n = (v) => Number(v) || 0;

export const ESTIMATOR_MODULES = [
  {
    key: "channel_letter_installation",
    name: "Channel & Dimensional Letters | Lobby Signs",
    shortName: "Channel & Dimensional",
    icon: Wrench,
    colors: { text: "text-purple-600", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-800" },
    entityName: "ChannelLetterInstallation",
    newEstimatePage: "NewChannelLetterInstallation",
    editParam: "edit",
    getTotal: (p) => n(p.total_cost),
    totalFormula: "Saved project grand total (total_cost)",
  },
  {
    key: "foundation",
    name: "Concrete | Masonry | Poles",
    shortName: "Concrete | Masonry | Poles",
    icon: Anchor,
    colors: { text: "text-amber-600", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-800" },
    entityName: "FoundationProject",
    newEstimatePage: "NewFoundationEstimate",
    editParam: "id",
    getTotal: (p) =>
      n(p.total_concrete_cost) + n(p.total_rebar_cost) + n(p.total_excavation_cost) +
      n(p.total_labor_cost) + n(p.total_equipment_cost) + n(p.total_forming_materials_cost) +
      n(p.total_pole_cost) + n(p.total_pole_painting_cost) + n(p.total_brick_cost) +
      n(p.total_fill_cost) + n(p.total_wall_cost) + n(p.total_wall_cap_cost),
    totalFormula:
      "concrete + rebar + excavation + labor + equipment + forming materials + poles + pole painting + brick + fill + walls + wall caps",
  },
  {
    key: "sign_maintenance",
    name: "Sign Maintenance",
    shortName: "Sign Maintenance",
    icon: ClipboardCheck,
    colors: { text: "text-cyan-600", bg: "bg-cyan-50", badge: "bg-cyan-100 text-cyan-800" },
    entityName: "MaintenanceProject",
    newEstimatePage: "NewSignMaintenance",
    editParam: "edit",
    getTotal: (p) => n(p.total_cost),
    totalFormula: "Saved project grand total (total_cost)",
  },
  {
    key: "painting",
    name: "Paint Estimator",
    shortName: "Paint",
    icon: Paintbrush,
    colors: { text: "text-blue-600", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-800" },
    entityName: "Project",
    newEstimatePage: "NewPaintEstimate",
    editParam: "edit",
    getTotal: (p) =>
      n(p.total_paint_mask_cost) + n(p.total_liquid_paint_and_supplies_cost) + n(p.total_labor_cost),
    totalFormula: "paint mask + liquid paint & supplies + labor",
  },
  {
    key: "laser",
    name: "Laser Cutting & Engraving",
    shortName: "Laser",
    icon: Zap,
    colors: { text: "text-red-600", bg: "bg-red-50", badge: "bg-red-100 text-red-800" },
    entityName: "LaserProject",
    newEstimatePage: "NewLaserEstimate",
    editParam: "edit",
    getTotal: (p) => n(p.total_machine_cost) + n(p.total_supplies_cost) + n(p.total_labor_cost),
    totalFormula: "machine + supplies + labor",
  },
  {
    key: "cnc",
    name: "CNC Routing",
    shortName: "CNC",
    icon: Router,
    colors: { text: "text-green-600", bg: "bg-green-50", badge: "bg-green-100 text-green-800" },
    entityName: "CNCProject",
    newEstimatePage: "NewCNCEstimate",
    editParam: "edit",
    getTotal: (p) => n(p.total_machine_cost) + n(p.total_labor_cost),
    totalFormula: "machine + labor",
  },
  {
    key: "metal_fabrication",
    name: "Metal Fabrication",
    shortName: "Metal Fab",
    icon: Wrench,
    colors: { text: "text-orange-600", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-800" },
    entityName: "MetalProject",
    newEstimatePage: "NewMetalEstimate",
    editParam: "edit",
    getTotal: (p) =>
      n(p.total_material_cost) + n(p.total_supplies_cost) + n(p.total_fabrication_cost) +
      n(p.total_welding_cost) + n(p.total_finishing_cost),
    totalFormula: "material + supplies + fabrication + welding + finishing",
  },
  {
    key: "vinyl_estimator",
    name: "Vinyl Printing, Cutting & Lamination",
    shortName: "Vinyl",
    icon: Droplets,
    colors: { text: "text-sky-600", bg: "bg-sky-50", badge: "bg-sky-100 text-sky-800" },
    entityName: "VinylProject",
    newEstimatePage: "NewVinylEstimate",
    editParam: "edit",
    getTotal: (p) => n(p.total_cost),
    totalFormula: "Saved project grand total (total_cost)",
  },
];

export const ESTIMATOR_MODULES_BY_KEY = ESTIMATOR_MODULES.reduce((acc, m) => {
  acc[m.key] = m;
  return acc;
}, {});

export const getModuleEntity = (mod) => base44.entities[mod.entityName];

export const getModuleTotal = (mod, project) => mod.getTotal(project || {});