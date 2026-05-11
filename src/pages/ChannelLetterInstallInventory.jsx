import React, { useState, useEffect } from "react";
import { ChannelLetterInstallInventory } from "@/entities/all";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save, ArrowLeft, Package } from "lucide-react";

const CATEGORIES = ["flush_mount_hardware", "halo_lit_hardware", "raceway_material", "electrical", "consumable", "other"];
const APPLIES_TO = ["all", "flush_mount", "halo_lit", "raceway"];
const PRICING_MODES = ["per_letter_flat", "per_letter_by_size", "per_raceway_foot", "per_project_flat"];

const emptyItem = () => ({
  item_name: "",
  category: "flush_mount_hardware",
  applies_to: "all",
  pricing_mode: "per_letter_flat",
  cost_per_letter: 0,
  cost_small: 0,
  cost_medium: 0,
  cost_large: 0,
  cost_extra_large: 0,
  cost_per_foot: 0,
  cost_flat: 0,
  unit: "ea",
  supplier: "",
  notes: "",
  is_default: true,
  sort_order: 0,
});

export default function ChannelLetterInstallInventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await ChannelLetterInstallInventory.list("sort_order");
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (i, patch) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    setItems(next);
  };

  const addItem = () => setItems([...items, { ...emptyItem(), _new: true }]);

  const removeItem = async (i) => {
    const item = items[i];
    if (item.id) {
      if (!confirm(`Delete "${item.item_name}"?`)) return;
      await ChannelLetterInstallInventory.delete(item.id);
    }
    const next = [...items];
    next.splice(i, 1);
    setItems(next);
  };

  const saveAll = async () => {
    setSaving(true);
    for (const it of items) {
      const { _new, id, ...payload } = it;
      if (id) await ChannelLetterInstallInventory.update(id, payload);
      else await ChannelLetterInstallInventory.create(payload);
    }
    await load();
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-slate-600">Loading...</div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-600" />
              Install Materials Inventory
            </h1>
            <p className="text-slate-600">Hardware & consumables for channel letter installs</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to={createPageUrl("ChannelLetterInstallEquipmentInventory")}>
              <Button variant="outline" className="bg-white">Equipment Inventory</Button>
            </Link>
            <Link to={createPageUrl("NewChannelLetterInstallation")}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Estimate
              </Button>
            </Link>
          </div>
        </div>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Materials ({items.length})</CardTitle>
            <div className="flex gap-2">
              <Button onClick={addItem} variant="outline">
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
              <Button onClick={saveAll} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-10 text-slate-400">No materials yet. Click "Add Item" to start.</div>
            ) : items.map((it, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="grid md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-3">
                    <Label className="text-xs">Item Name</Label>
                    <Input value={it.item_name} onChange={(e) => update(i, { item_name: e.target.value })} className="h-8 mt-0.5" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Category</Label>
                    <Select value={it.category} onValueChange={(v) => update(i, { category: v })}>
                      <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Applies To</Label>
                    <Select value={it.applies_to} onValueChange={(v) => update(i, { applies_to: v })}>
                      <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {APPLIES_TO.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Pricing Mode</Label>
                    <Select value={it.pricing_mode} onValueChange={(v) => update(i, { pricing_mode: v })}>
                      <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRICING_MODES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">
                      {it.pricing_mode === "per_letter_flat" && "Cost/Letter"}
                      {it.pricing_mode === "per_letter_by_size" && "Costs by Size"}
                      {it.pricing_mode === "per_raceway_foot" && "Cost/Foot"}
                      {it.pricing_mode === "per_project_flat" && "Flat Cost"}
                    </Label>
                    {it.pricing_mode === "per_letter_flat" && (
                      <Input type="number" step="0.01" value={it.cost_per_letter} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_per_letter: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />
                    )}
                    {it.pricing_mode === "per_letter_by_size" && (
                      <div className="grid grid-cols-4 gap-1 mt-0.5">
                        <Input type="number" step="0.01" placeholder="S" value={it.cost_small} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_small: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" />
                        <Input type="number" step="0.01" placeholder="M" value={it.cost_medium} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_medium: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" />
                        <Input type="number" step="0.01" placeholder="L" value={it.cost_large} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_large: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" />
                        <Input type="number" step="0.01" placeholder="XL" value={it.cost_extra_large} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_extra_large: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" />
                      </div>
                    )}
                    {it.pricing_mode === "per_raceway_foot" && (
                      <Input type="number" step="0.01" value={it.cost_per_foot} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_per_foot: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />
                    )}
                    {it.pricing_mode === "per_project_flat" && (
                      <Input type="number" step="0.01" value={it.cost_flat} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_flat: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />
                    )}
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <label className="flex items-center gap-1 cursor-pointer text-xs mb-2">
                      <Checkbox checked={it.is_default} onCheckedChange={(c) => update(i, { is_default: !!c })} />
                      <span>Auto</span>
                    </label>
                  </div>
                </div>
                <div className="grid md:grid-cols-12 gap-2 mt-2">
                  <div className="md:col-span-3">
                    <Label className="text-xs">Supplier</Label>
                    <Input value={it.supplier || ""} onChange={(e) => update(i, { supplier: e.target.value })} className="h-7 text-xs mt-0.5" />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">Unit</Label>
                    <Input value={it.unit || ""} onChange={(e) => update(i, { unit: e.target.value })} className="h-7 text-xs mt-0.5" />
                  </div>
                  <div className="md:col-span-7">
                    <Label className="text-xs">Notes</Label>
                    <Input value={it.notes || ""} onChange={(e) => update(i, { notes: e.target.value })} className="h-7 text-xs mt-0.5" />
                  </div>
                  <div className="md:col-span-1 flex items-end justify-end">
                    <Button size="sm" variant="ghost" onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 h-7 w-7 p-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}