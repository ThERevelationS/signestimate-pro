// Master Inventory — Extruded Metals & Poles tab.
//
// Single flat list combining two data sources:
//   1. Inventory entity — extruded stock (Angle / Channel / Tube / Flat Bar /
//      Round Bar / I-Beam / H-Beam / Pipe, plus any Sheet/Plate rows still
//      living here from legacy imports).
//   2. FoundationInventory rows with material_type = "pole" — sign poles.
//
// We do NOT migrate poles into the Inventory entity — the Concrete | Masonry
// | Poles estimator reads pole_* fields from FoundationInventory (pole_shape,
// pole_width_inches, pole_stock_length_ft, pole_pricing_mode, pole_stock_price,
// paint_rate_per_linear_ft) and changing that would break saved estimates.
// Instead we show both sources in one combined table and route Add/Edit/Delete
// to the correct entity based on each row's `_kind`.
//
// IMPORTANT: Sheet metal / Plate / Plastic SHEET stock does NOT belong here —
// the Excel importer routes those to the Substrates tab (DimensionalLetterMaterial).
// Sign lighting, fees, labor, hardware, and parts/supplies all route to their
// own dedicated entities. See components/masterInventory/importMappers.js.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Inventory, FoundationInventory } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Package, Anchor } from "lucide-react";
import InventoryTable from "./InventoryTable";
import InventoryFormModal from "./InventoryFormModal";

// ── Form schema for an EXTRUDED METAL row (Inventory entity) ───────────────
const EXTRUDED_METALS_SOURCE = {
  key: "extruded_metals",
  label: "Extruded Metal",
  entity: Inventory,
  nameField: "size",
  fields: [
    { name: "material_type", label: "Material", type: "select",
      options: ["Aluminum", "Steel", "Stainless_Steel", "Galvanized_Steel", "Brass", "Copper", "Plastic", "Other"],
      required: true, table: true },
    // Note: "Sheet" and "Plate" intentionally omitted — sheet/plate stock
    // belongs in the Substrates tab (DimensionalLetterMaterial).
    { name: "product_type", label: "Product", type: "select",
      options: ["Angle", "Channel", "Tube_Square", "Tube_Round", "Flat_Bar", "Round_Bar", "I_Beam", "H_Beam", "Pipe", "Other"],
      required: true, table: true },
    { name: "size", label: "Size", type: "text", required: true, table: true },
    { name: "thickness_gauge", label: "Thick. / Gauge", type: "text", table: true },
    { name: "standard_length", label: "Std Length (ft)", type: "number" },
    { name: "cost_per_unit", label: "Cost", type: "number", required: true, table: true },
    { name: "unit_type", label: "Unit", type: "select",
      options: ["per_foot", "per_piece", "per_pound", "per_sqft"], table: true },
    { name: "supplier", label: "Supplier", type: "text", table: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
};

// ── Form schema for a POLE row (FoundationInventory entity, material_type=pole) ──
const POLES_SOURCE = {
  key: "poles",
  label: "Pole",
  entity: FoundationInventory,
  nameField: "material_name",
  defaults: { material_type: "pole" },
  fields: [
    { name: "material_name", label: "Name", type: "text", required: true, table: true },
    { name: "pole_shape", label: "Shape", type: "select",
      options: ["square", "round"], table: true },
    { name: "pole_width_inches", label: "Width (in)", type: "number", table: true },
    { name: "pole_depth_inches", label: "Depth (in)", type: "number" },
    { name: "pole_wall_thickness_inches", label: "Wall Thick. (in)", type: "number" },
    { name: "pole_stock_length_ft", label: "Stock Length (ft)", type: "number", table: true },
    { name: "pole_pricing_mode", label: "Pricing", type: "select",
      options: ["per_foot", "stock_price"], table: true },
    { name: "cost_per_unit", label: "$/ft", type: "number", table: true },
    { name: "pole_stock_price", label: "Stock Price", type: "number" },
    { name: "paint_rate_per_linear_ft", label: "Paint $/LF", type: "number" },
    { name: "supplier", label: "Supplier", type: "text", table: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
};

// ── Combined-view schema used to render the single flat table ──────────────
// Columns work for BOTH extruded rows (read material_type/product_type/size)
// AND pole rows (we project pole fields onto matching column names).
const COMBINED_TABLE_SOURCE = {
  key: "extruded_metals_poles",
  label: "Item",
  nameField: "_displayName",
  fields: [
    { name: "_kind", label: "Kind", type: "text", table: true },
    { name: "material_type", label: "Material", type: "text", table: true },
    { name: "product_type", label: "Product", type: "text", table: true },
    { name: "size", label: "Size", type: "text", table: true },
    { name: "thickness_gauge", label: "Thick. / Gauge", type: "text", table: true },
    { name: "cost_per_unit", label: "Cost", type: "number", table: true },
    { name: "unit_type", label: "Unit", type: "text", table: true },
    { name: "supplier", label: "Supplier", type: "text", table: true },
  ],
};

// Project a FoundationInventory pole row onto the combined-table columns.
const polesToRow = (p) => ({
  ...p,
  _kind: "Pole",
  _displayName: p.material_name,
  material_type: "Pole",
  product_type: p.pole_shape ? `${p.pole_shape} pole` : "pole",
  size: [p.pole_width_inches, p.pole_depth_inches].filter(Boolean).join(" × ") +
        (p.pole_width_inches ? '"' : ""),
  thickness_gauge: p.pole_wall_thickness_inches ? `${p.pole_wall_thickness_inches}"` : "",
  cost_per_unit: p.pole_pricing_mode === "stock_price" ? p.pole_stock_price : p.cost_per_unit,
  unit_type: p.pole_pricing_mode === "stock_price"
    ? `per ${p.pole_stock_length_ft || "?"}ft stock`
    : "per_foot",
});

const metalsToRow = (m) => ({
  ...m,
  _kind: "Extruded",
  _displayName: `${m.material_type || ""} ${m.product_type || ""} ${m.size || ""}`.trim(),
});

export default function MasterExtrudedMetalsPolesTab({ isAdmin }) {
  const [metalsItems, setMetalsItems] = useState([]);
  const [polesItems, setPolesItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  // Which entity the form should operate against. Determined by either the
  // row the user clicked (edit) or which "+ Add" button they pressed.
  const [formSource, setFormSource] = useState(EXTRUDED_METALS_SOURCE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [metals, foundation] = await Promise.all([
        Inventory.list(),
        FoundationInventory.list(),
      ]);
      setMetalsItems(metals);
      setPolesItems(foundation.filter((r) => r.material_type === "pole"));
    } catch (e) {
      console.error("Failed to load extruded metals & poles:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build the combined, search-filtered list.
  const combined = useMemo(() => {
    const rows = [
      ...metalsItems.map(metalsToRow),
      ...polesItems.map(polesToRow),
    ];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((it) =>
      Object.values(it).some((v) => v && String(v).toLowerCase().includes(q))
    );
  }, [metalsItems, polesItems, search]);

  const handleAddMetal = () => {
    setEditingItem(null);
    setFormSource(EXTRUDED_METALS_SOURCE);
    setShowForm(true);
  };
  const handleAddPole = () => {
    setEditingItem(null);
    setFormSource(POLES_SOURCE);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    // Route edit to the correct entity based on the row's _kind.
    const src = item._kind === "Pole" ? POLES_SOURCE : EXTRUDED_METALS_SOURCE;
    setFormSource(src);
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    const src = item._kind === "Pole" ? POLES_SOURCE : EXTRUDED_METALS_SOURCE;
    const name = item._displayName || item[src.nameField];
    if (!window.confirm(`Delete "${name}"?`)) return;
    await src.entity.delete(item.id);
    load();
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingItem(null);
    load();
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-700" />
            Extruded Metals & Poles
            <Badge variant="outline" className="ml-2 font-normal">
              {combined.length} of {metalsItems.length + polesItems.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {isAdmin && (
              <>
                <Button onClick={handleAddMetal} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Metal
                </Button>
                <Button onClick={handleAddPole} variant="outline" className="h-9">
                  <Anchor className="w-4 h-4 mr-1" />
                  Add Pole
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : (
          <InventoryTable
            source={COMBINED_TABLE_SOURCE}
            items={combined}
            canEdit={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onInlineToggle={() => {}}
          />
        )}
      </CardContent>

      {showForm && (
        <InventoryFormModal
          source={formSource}
          editingItem={editingItem}
          onCancel={() => { setShowForm(false); setEditingItem(null); }}
          onSaved={handleSaved}
        />
      )}
    </Card>
  );
}