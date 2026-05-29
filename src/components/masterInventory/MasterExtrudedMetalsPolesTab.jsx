// Master Inventory — Extruded Metals & Poles tab.
//
// Combines two data sources into a single tab:
//   1. Inventory entity (legacy extruded metals — Aluminum / Steel angle,
//      channel, tube, flat bar, etc.) — these were previously surfaced under
//      "Metal (Legacy)".
//   2. FoundationInventory rows with material_type = "pole" — previously
//      managed on the Foundation Inventory page.
//
// Two sub-tabs let admins manage each list independently with the right
// schema for each.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Inventory, FoundationInventory } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Plus, Package, Anchor } from "lucide-react";
import InventoryTable from "./InventoryTable";
import InventoryFormModal from "./InventoryFormModal";

// ── Schema for the EXTRUDED METALS sub-tab (Inventory entity) ──────────────
const EXTRUDED_METALS_SOURCE = {
  key: "extruded_metals",
  label: "Extruded Metals",
  entity: Inventory,
  nameField: "size",
  fields: [
    { name: "material_type", label: "Material", type: "select",
      options: ["Aluminum", "Steel", "Stainless_Steel", "Galvanized_Steel", "Brass", "Copper", "Plastic", "Other"],
      required: true, table: true },
    { name: "product_type", label: "Product", type: "select",
      options: ["Angle", "Channel", "Tube_Square", "Tube_Round", "Flat_Bar", "Round_Bar", "Sheet", "Plate", "I_Beam", "H_Beam", "Pipe", "Other"],
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

// ── Schema for the POLES sub-tab (FoundationInventory entity, material_type=pole) ──
const POLES_SOURCE = {
  key: "poles",
  label: "Poles",
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

export default function MasterExtrudedMetalsPolesTab({ isAdmin }) {
  const [activeSub, setActiveSub] = useState("extruded_metals");
  const [metalsItems, setMetalsItems] = useState([]);
  const [polesItems, setPolesItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

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

  const activeSource = activeSub === "extruded_metals" ? EXTRUDED_METALS_SOURCE : POLES_SOURCE;
  const allItems = activeSub === "extruded_metals" ? metalsItems : polesItems;

  const filtered = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter((it) =>
      Object.values(it).some((v) => v && String(v).toLowerCase().includes(q))
    );
  }, [allItems, search]);

  const handleAdd = () => {
    setEditingItem(null);
    setShowForm(true);
  };
  const handleEdit = (item) => { setEditingItem(item); setShowForm(true); };
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item[activeSource.nameField]}"?`)) return;
    await activeSource.entity.delete(item.id);
    load();
  };
  const handleSaved = async () => {
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
            <Badge variant="outline" className="ml-2 font-normal">{filtered.length} of {allItems.length}</Badge>
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
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
                <Plus className="w-4 h-4 mr-1" />
                Add {activeSub === "extruded_metals" ? "Metal" : "Pole"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeSub} onValueChange={(v) => { setActiveSub(v); setSearch(""); }}>
          <TabsList className="mb-4">
            <TabsTrigger value="extruded_metals" className="gap-2">
              <Package className="w-3.5 h-3.5" /> Extruded Metals ({metalsItems.length})
            </TabsTrigger>
            <TabsTrigger value="poles" className="gap-2">
              <Anchor className="w-3.5 h-3.5" /> Poles ({polesItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeSub} className="mt-0">
            {loading ? (
              <div className="p-12 text-center text-slate-500">Loading…</div>
            ) : (
              <InventoryTable
                source={activeSource}
                items={filtered}
                canEdit={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onInlineToggle={() => {}}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {showForm && (
        <InventoryFormModal
          source={activeSource}
          editingItem={editingItem}
          onCancel={() => { setShowForm(false); setEditingItem(null); }}
          onSaved={handleSaved}
        />
      )}
    </Card>
  );
}