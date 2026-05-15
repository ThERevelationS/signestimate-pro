// Master Inventory: declarative configuration of every inventory source in the app.
// Each source defines how to read/write/display its items in a unified format.
//
// To add a new inventory source, just add an entry here — the page picks it up automatically.

import {
  Inventory,
  ChannelLetterInstallInventory,
  ChannelLetterInstallEquipment,
  DimensionalLetterMaterial,
  FoundationInventory,
} from "@/entities/all";

import {
  Package,
  Wrench,
  Truck,
  Type,
  Anchor,
} from "lucide-react";

/**
 * Each source has:
 *  - key:        unique id used in tabs/filters
 *  - label:      human label
 *  - icon:       lucide icon component
 *  - color:      tailwind text color class for accents
 *  - bgColor:    tailwind bg color class for badge pill
 *  - entity:     the entity SDK module (with .list, .create, .update, .delete)
 *  - nameField:  which field holds the display name
 *  - fields:     ordered list of fields shown in the form / table
 *                each field: { name, label, type, options?, required?, placeholder?, table? }
 *                type ∈ "text" | "number" | "select" | "boolean" | "textarea"
 *                table=true means show this column in the list view (besides name)
 */
export const INVENTORY_SOURCES = [
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
  {
    key: "channel_letter_install_materials",
    label: "Channel Letter Install — Materials",
    icon: Wrench,
    color: "text-purple-600",
    bgColor: "bg-purple-100 text-purple-700",
    entity: ChannelLetterInstallInventory,
    nameField: "item_name",
    fields: [
      { name: "item_name", label: "Item Name", type: "text", required: true, table: true },
      {
        name: "pricing_mode",
        label: "Pricing Mode",
        type: "select",
        options: ["per_letter_flat", "per_letter_by_size", "per_raceway_foot", "per_project_flat"],
        required: true,
        table: true,
      },
      { name: "cost_per_letter", label: "Cost / Letter ($)", type: "number", table: true },
      { name: "cost_per_foot", label: "Cost / Foot ($)", type: "number" },
      { name: "cost_flat", label: "Flat Cost ($)", type: "number" },
      { name: "supplier", label: "Supplier", type: "text", table: true },
      { name: "unit", label: "Unit", type: "text" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "channel_letter_install_equipment",
    label: "Channel Letter Install — Equipment",
    icon: Truck,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 text-cyan-700",
    entity: ChannelLetterInstallEquipment,
    nameField: "equipment_name",
    fields: [
      { name: "equipment_name", label: "Equipment Name", type: "text", required: true, table: true },
      {
        name: "equipment_type",
        label: "Equipment Type",
        type: "select",
        options: ["ladder", "scissor_lift", "boom_lift", "scaffold", "truck", "car", "van", "flatbed", "hand_tool", "power_tool", "safety", "other"],
        required: true,
        table: true,
      },
      {
        name: "ownership",
        label: "Ownership",
        type: "select",
        options: ["owned", "rented"],
        table: true,
      },
      { name: "max_height_feet", label: "Max Height (ft)", type: "number", table: true },
      {
        name: "pricing_mode",
        label: "Pricing Mode",
        type: "select",
        options: ["owned_flat", "per_hour", "per_day", "per_week", "per_month", "per_project_flat"],
      },
      { name: "cost_per_day", label: "Cost / Day ($)", type: "number", table: true },
      { name: "cost_flat", label: "Flat Cost ($)", type: "number" },
      { name: "delivery_pickup_cost", label: "Delivery / Pickup ($)", type: "number" },
      { name: "rental_company", label: "Rental Company", type: "text" },
      { name: "is_active", label: "Active", type: "boolean" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "dimensional_letter_materials",
    label: "Dimensional Letter Materials",
    icon: Type,
    color: "text-pink-600",
    bgColor: "bg-pink-100 text-pink-700",
    entity: DimensionalLetterMaterial,
    nameField: "material_name",
    fields: [
      { name: "material_name", label: "Material Name", type: "text", required: true, table: true },
      {
        name: "material_type",
        label: "Material Type",
        type: "select",
        options: ["acrylic", "pvc", "aluminum_composite", "aluminum_solid", "wood", "mdf", "hdu", "foam", "other"],
        table: true,
      },
      { name: "thickness_inches", label: "Thickness (in)", type: "number", table: true },
      { name: "sheet_length_inches", label: "Sheet Length (in)", type: "number" },
      { name: "sheet_width_inches", label: "Sheet Width (in)", type: "number" },
      { name: "cost_per_sheet", label: "Cost / Sheet ($)", type: "number", table: true },
      { name: "color", label: "Color", type: "text" },
      { name: "supplier", label: "Supplier", type: "text", table: true },
      { name: "is_active", label: "Active", type: "boolean" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "foundation_inventory",
    label: "Foundation / Masonry",
    icon: Anchor,
    color: "text-amber-700",
    bgColor: "bg-amber-100 text-amber-800",
    entity: FoundationInventory,
    nameField: "material_name",
    fields: [
      { name: "material_name", label: "Material Name", type: "text", required: true, table: true },
      {
        name: "material_type",
        label: "Material Type",
        type: "select",
        options: ["concrete_service", "bagged_concrete", "rebar", "forming_material", "excavation_equipment", "attachment", "sub_attachment", "pole", "brick_stone", "fill_material", "wall_material", "wall_cap"],
        required: true,
        table: true,
      },
      { name: "material_description", label: "Description", type: "text" },
      { name: "cost_per_unit", label: "Cost / Unit ($)", type: "number", table: true },
      { name: "unit", label: "Unit", type: "text" },
      { name: "supplier", label: "Supplier", type: "text", table: true },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
];

export const SOURCE_BY_KEY = Object.fromEntries(
  INVENTORY_SOURCES.map((s) => [s.key, s])
);