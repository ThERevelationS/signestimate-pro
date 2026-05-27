// Master Inventory: declarative configuration of every inventory source in the app.
//
// IMPORTANT: tabs here are categorized by WHAT THE ITEMS ARE, not by which
// estimator they belong to. Cross-estimator visibility is controlled per-item
// using show_in_channel_letters / show_in_foundation / show_in_sign_maintenance
// (or the legacy show_in_install_materials / show_in_maintenance_materials etc).
//
// Two tabs are "custom" and rendered by dedicated components (not via this
// schema) because they merge multiple underlying entities:
//   - rental_equipment / owned_equipment  → <MasterEquipmentTab />
//   - supplies                            → <MasterSuppliesTab />
//
// The remaining declarative sources (Metal, Substrates) render with the
// generic InventoryTable + InventoryFormModal.

import {
  Inventory,
  DimensionalLetterMaterial,
} from "@/entities/all";

import {
  Package,
  Truck,
  Type,
  Wrench,
  Boxes,
  Droplets,
} from "lucide-react";

// Top-level master inventory tabs. "Equipment" is a parent tab with
// Rental / Owned as sub-tabs (handled inside MasterEquipmentTab).
export const INVENTORY_SOURCES = [
  {
    key: "equipment",
    label: "Equipment",
    icon: Truck,
    color: "text-cyan-700",
    bgColor: "bg-cyan-100 text-cyan-800",
    custom: "equipment", // MasterEquipmentTab — renders rental/owned sub-tabs internally
  },
  {
    key: "substrates",
    label: "Substrates",
    icon: Type,
    color: "text-pink-600",
    bgColor: "bg-pink-100 text-pink-700",
    entity: DimensionalLetterMaterial,
    nameField: "material_name",
    // Compact labels keep the row narrow enough to avoid horizontal scroll.
    fields: [
      { name: "material_name", label: "Name", type: "text", required: true, table: true },
      {
        name: "material_type",
        label: "Type",
        type: "select",
        options: ["acrylic", "pvc", "aluminum_composite", "aluminum_solid", "wood", "mdf", "hdu", "foam", "other"],
        table: true,
      },
      { name: "thickness_inches", label: "Thick.", type: "number", table: true },
      { name: "sheet_length_inches", label: "Sheet Length (in)", type: "number" },
      { name: "sheet_width_inches", label: "Sheet Width (in)", type: "number" },
      { name: "cost_per_sheet", label: "$/Sheet", type: "number", table: true },
      { name: "color", label: "Color", type: "text" },
      { name: "supplier", label: "Supplier", type: "text", table: true },
      // Substrate visibility toggles — short labels for compact table layout.
      { name: "show_in_dimensional_letters", label: "Dim. Letters",  type: "boolean", table: true },
      { name: "show_in_lobby_sign_backer",   label: "Lobby Backer",  type: "boolean", table: true },
      { name: "show_in_vinyl_replacement",   label: "Vinyl Repl.",   type: "boolean", table: true },
      { name: "show_in_replace_returns",     label: "Repl. Returns", type: "boolean", table: true },
      { name: "show_in_replace_face",        label: "Repl. Face",    type: "boolean", table: true },
      { name: "is_active", label: "Active", type: "boolean" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "supplies",
    label: "Installation & Maintenance Supplies",
    icon: Wrench,
    color: "text-purple-600",
    bgColor: "bg-purple-100 text-purple-700",
    custom: "supplies", // rendered by MasterSuppliesTab
  },
  {
    key: "vinyl",
    label: "Vinyl",
    icon: Droplets,
    color: "text-blue-600",
    bgColor: "bg-blue-100 text-blue-700",
    custom: "vinyl", // rendered by VinylInventoryTab (scope="master")
  },
  {
    key: "metal_inventory",
    label: "Metal / Sign Materials",
    icon: Package,
    color: "text-orange-600",
    bgColor: "bg-orange-100 text-orange-700",
    entity: Inventory,
    nameField: "size",
    fields: [
      { name: "material_type", label: "Material Type", type: "text", required: true, table: true, placeholder: "e.g. Aluminum" },
      { name: "product_type", label: "Product Type", type: "text", required: true, table: true, placeholder: "e.g. Tube_Square" },
      { name: "size", label: "Size", type: "text", required: true, table: true, placeholder: "e.g. 2x2x1/4" },
      { name: "thickness_gauge", label: "Thickness / Gauge", type: "text", table: true, placeholder: "e.g. 1/8, 14ga" },
      { name: "standard_length", label: "Standard Length (ft)", type: "number" },
      { name: "cost_per_unit", label: "Cost Per Unit ($)", type: "number", required: true, table: true },
      {
        name: "unit_type",
        label: "Unit Type",
        type: "select",
        options: ["per_foot", "per_piece", "per_pound", "per_sqft"],
      },
      { name: "supplier", label: "Supplier", type: "text", table: true },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
];

export const SOURCE_BY_KEY = Object.fromEntries(
  INVENTORY_SOURCES.map((s) => [s.key, s])
);