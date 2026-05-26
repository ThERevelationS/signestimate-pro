import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MaintenanceInventory, MaintenanceEquipment } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Boxes, Truck, Package, Trash2 } from "lucide-react";
import { SIGN_TYPES, ACTIONS, LETTER_SIZES, CABINET_SIZES } from "@/components/signMaintenance/constants";

export default function MaintenanceInventoryPage() {
  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Boxes className="w-8 h-8 text-cyan-600" />
              Sign Maintenance Inventory
            </h1>
            <p className="text-slate-600">Materials & equipment used on maintenance jobs. Each material can be tied to specific sign types, sizes, and actions.</p>
          </div>
          <Link to={createPageUrl("SignMaintenanceProjects")}>
            <Button variant="outline" className="bg-white"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          </Link>
        </div>

        <Tabs defaultValue="materials" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-auto p-1">
            <TabsTrigger value="materials" className="py-2"><Package className="w-4 h-4 mr-2" />Materials</TabsTrigger>
            <TabsTrigger value="equipment" className="py-2"><Truck className="w-4 h-4 mr-2" />Equipment</TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <MaterialsTab />
          </TabsContent>
          <TabsContent value="equipment">
            <EquipmentTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ---- Materials tab ----------------------------------------------------------
function MaterialsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await MaintenanceInventory.list("sort_order")); }
    catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addBlank = async () => {
    await MaintenanceInventory.create({
      item_name: "New Material",
      pricing_mode: "per_letter_flat",
      applies_to_item_types: [],
      applies_to_sizes: [],
      applies_to_actions: [],
      is_default: false,
      sort_order: items.length + 1,
    });
    load();
  };

  const del = async (id) => {
    if (!confirm("Delete this material?")) return;
    await MaintenanceInventory.delete(id);
    load();
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">Materials Inventory</CardTitle>
        <Button onClick={addBlank} className="bg-cyan-600 hover:bg-cyan-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Material
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No materials yet. Click "Add Material" to get started.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map(it => (
              <MaterialRow key={it.id} item={it} onChange={load} onDelete={() => del(it.id)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MaterialRow({ item, onChange, onDelete }) {
  const [local, setLocal] = useState(item);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setLocal(item); }, [item]);

  const update = (patch) => setLocal(prev => ({ ...prev, ...patch }));

  const toggleArrayValue = (key, val) => {
    const arr = Array.isArray(local[key]) ? local[key] : [];
    const next = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
    update({ [key]: next });
  };

  const save = async () => {
    setSaving(true);
    try {
      await MaintenanceInventory.update(local.id, local);
      onChange?.();
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 grid lg:grid-cols-12 gap-3 items-start">
      <div className="lg:col-span-3 space-y-2">
        <div>
          <Label className="text-xs">Item Name</Label>
          <Input value={local.item_name || ""} onChange={(e) => update({ item_name: e.target.value })} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Supplier</Label>
          <Input value={local.supplier || ""} onChange={(e) => update({ supplier: e.target.value })} className="h-9 text-sm" />
        </div>
      </div>

      <div className="lg:col-span-3 space-y-2">
        <div>
          <Label className="text-xs">Pricing Mode</Label>
          <select
            className="h-9 w-full rounded-md border border-slate-200 text-sm bg-white px-2"
            value={local.pricing_mode || "per_letter_flat"}
            onChange={(e) => update({ pricing_mode: e.target.value })}
          >
            <option value="per_letter_flat">Per letter (flat)</option>
            <option value="per_letter_by_size">Per letter (by size)</option>
            <option value="per_cabinet_flat">Per cabinet (flat)</option>
            <option value="per_cabinet_by_size">Per cabinet (by size)</option>
            <option value="per_linear_foot">Per linear foot</option>
            <option value="per_sqft">Per sqft</option>
            <option value="per_project_flat">Per project (flat)</option>
          </select>
        </div>
        {local.pricing_mode === "per_letter_flat" && (
          <NumberField label="Cost / letter" value={local.cost_per_letter} onChange={(v) => update({ cost_per_letter: v })} />
        )}
        {local.pricing_mode === "per_cabinet_flat" && (
          <NumberField label="Cost / cabinet" value={local.cost_per_cabinet} onChange={(v) => update({ cost_per_cabinet: v })} />
        )}
        {local.pricing_mode === "per_linear_foot" && (
          <NumberField label="Cost / ft" value={local.cost_per_foot} onChange={(v) => update({ cost_per_foot: v })} />
        )}
        {local.pricing_mode === "per_sqft" && (
          <NumberField label="Cost / sqft" value={local.cost_per_sqft} onChange={(v) => update({ cost_per_sqft: v })} />
        )}
        {local.pricing_mode === "per_project_flat" && (
          <NumberField label="Flat cost" value={local.cost_flat} onChange={(v) => update({ cost_flat: v })} />
        )}
      </div>

      <div className="lg:col-span-5 grid grid-cols-1 md:grid-cols-3 gap-2">
        <ChipPicker label="Sign Types" options={SIGN_TYPES.map(s => ({ id: s.id, label: s.label }))}
          selected={local.applies_to_item_types || []} onToggle={(v) => toggleArrayValue("applies_to_item_types", v)} />
        <ChipPicker label="Sizes" options={[
          ...LETTER_SIZES.map(s => ({ id: s.id, label: s.label })),
          ...CABINET_SIZES.map(s => ({ id: s.id, label: s.label })),
        ]} selected={local.applies_to_sizes || []} onToggle={(v) => toggleArrayValue("applies_to_sizes", v)} />
        <ChipPicker label="Actions" options={ACTIONS.map(a => ({ id: a.id, label: a.label }))}
          selected={local.applies_to_actions || []} onToggle={(v) => toggleArrayValue("applies_to_actions", v)} />
      </div>

      <div className="lg:col-span-1 flex lg:flex-col gap-1 lg:items-end justify-end">
        <Button size="sm" onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white">
          {saving ? "…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step="0.01" value={value ?? 0} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-9 text-sm tabular-nums" />
    </div>
  );
}

function ChipPicker({ label, options, selected, onToggle }) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wide text-slate-500">{label}</Label>
      <div className="flex flex-wrap gap-1 mt-1 max-h-32 overflow-y-auto p-1 border border-slate-200 rounded-md bg-slate-50/60">
        {options.map(o => {
          const isOn = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                isOn ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-slate-700 border-slate-200 hover:border-cyan-300"
              }`}
            >
              {o.label}
            </button>
          );
        })}
        {selected.length === 0 && (
          <span className="text-[10px] text-slate-400 italic px-1">Empty = applies to all</span>
        )}
      </div>
    </div>
  );
}

// ---- Equipment tab ----------------------------------------------------------
function EquipmentTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await MaintenanceEquipment.list("sort_order")); }
    catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addBlank = async () => {
    await MaintenanceEquipment.create({
      equipment_name: "New Equipment",
      equipment_type: "ladder",
      pricing_mode: "per_day",
      ownership: "rented",
      sort_order: items.length + 1,
      is_active: true,
    });
    load();
  };

  const del = async (id) => {
    if (!confirm("Delete this equipment?")) return;
    await MaintenanceEquipment.delete(id);
    load();
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">Equipment Inventory</CardTitle>
        <Button onClick={addBlank} className="bg-cyan-600 hover:bg-cyan-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Equipment
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No equipment yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map(it => (
              <div key={it.id} className="p-4 grid md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-4">
                  <Label className="text-xs">Name</Label>
                  <Input defaultValue={it.equipment_name} onBlur={(e) => MaintenanceEquipment.update(it.id, { equipment_name: e.target.value }).then(load)} className="h-9 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Type</Label>
                  <Input defaultValue={it.equipment_type} onBlur={(e) => MaintenanceEquipment.update(it.id, { equipment_type: e.target.value }).then(load)} className="h-9 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">$/Day</Label>
                  <Input type="number" defaultValue={it.cost_per_day || 0} onBlur={(e) => MaintenanceEquipment.update(it.id, { cost_per_day: parseFloat(e.target.value) || 0 }).then(load)} className="h-9 text-sm tabular-nums" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Max Height (ft)</Label>
                  <Input type="number" defaultValue={it.max_height_feet || 0} onBlur={(e) => MaintenanceEquipment.update(it.id, { max_height_feet: parseFloat(e.target.value) || 0 }).then(load)} className="h-9 text-sm tabular-nums" />
                </div>
                <div className="md:col-span-2 flex gap-2 justify-end">
                  <Badge variant="outline" className="text-[10px]">{it.ownership || "rented"}</Badge>
                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => del(it.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}