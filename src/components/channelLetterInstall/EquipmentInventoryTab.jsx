import React, { useState, useEffect } from "react";
import { ChannelLetterInstallEquipment } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save } from "lucide-react";

const EQUIPMENT_TYPES = ["ladder", "scissor_lift", "boom_lift", "scaffold", "truck", "hand_tool", "power_tool", "safety", "other"];
const PRICING_MODES = ["owned_flat", "per_day", "per_week", "per_month", "per_project_flat"];

const emptyItem = () => ({
  equipment_name: "",
  equipment_type: "ladder",
  max_height_feet: 0,
  pricing_mode: "per_day",
  cost_per_day: 0,
  cost_per_week: 0,
  cost_per_month: 0,
  cost_flat: 0,
  delivery_pickup_cost: 0,
  rental_company: "",
  notes: "",
  is_active: true,
  sort_order: 0,
});

export default function EquipmentInventoryTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await ChannelLetterInstallEquipment.list("sort_order");
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
      if (!confirm(`Delete "${item.equipment_name}"?`)) return;
      await ChannelLetterInstallEquipment.delete(item.id);
    }
    const next = [...items];
    next.splice(i, 1);
    setItems(next);
  };

  const saveAll = async () => {
    setSaving(true);
    for (const it of items) {
      const { _new, id, ...payload } = it;
      if (id) await ChannelLetterInstallEquipment.update(id, payload);
      else await ChannelLetterInstallEquipment.create(payload);
    }
    await load();
    setSaving(false);
  };

  const costField = (it, i) => {
    switch (it.pricing_mode) {
      case "per_day":
        return <Input type="number" step="0.01" value={it.cost_per_day} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_per_day: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />;
      case "per_week":
        return <Input type="number" step="0.01" value={it.cost_per_week} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_per_week: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />;
      case "per_month":
        return <Input type="number" step="0.01" value={it.cost_per_month} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_per_month: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />;
      case "owned_flat":
      case "per_project_flat":
        return <Input type="number" step="0.01" value={it.cost_flat} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_flat: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />;
      default:
        return null;
    }
  };

  if (loading) return <div className="p-8 text-slate-600">Loading...</div>;

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Equipment ({items.length})</CardTitle>
        <div className="flex gap-2">
          <Button onClick={addItem} variant="outline">
            <Plus className="w-4 h-4 mr-1" /> Add Equipment
          </Button>
          <Button onClick={saveAll} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-10 text-slate-400">No equipment yet. Click "Add Equipment" to start.</div>
        ) : items.map((it, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
            <div className="grid md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-3">
                <Label className="text-xs">Equipment Name</Label>
                <Input value={it.equipment_name} onChange={(e) => update(i, { equipment_name: e.target.value })} className="h-8 mt-0.5" placeholder="e.g. 26ft Scissor Lift" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Type</Label>
                <Select value={it.equipment_type} onValueChange={(v) => update(i, { equipment_type: v })}>
                  <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs">Max Ht (ft)</Label>
                <Input type="number" value={it.max_height_feet} onFocus={e => e.target.select()} onChange={(e) => update(i, { max_height_feet: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />
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
                <Label className="text-xs">Cost</Label>
                {costField(it, i)}
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs">Delivery</Label>
                <Input type="number" step="0.01" value={it.delivery_pickup_cost} onFocus={e => e.target.select()} onChange={(e) => update(i, { delivery_pickup_cost: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />
              </div>
              <div className="md:col-span-1 flex items-end">
                <label className="flex items-center gap-1 cursor-pointer text-xs mb-2">
                  <Checkbox checked={it.is_active} onCheckedChange={(c) => update(i, { is_active: !!c })} />
                  <span>Active</span>
                </label>
              </div>
            </div>
            <div className="grid md:grid-cols-12 gap-2 mt-2">
              <div className="md:col-span-3">
                <Label className="text-xs">Rental Company</Label>
                <Input value={it.rental_company || ""} onChange={(e) => update(i, { rental_company: e.target.value })} className="h-7 text-xs mt-0.5" placeholder="Sunbelt, United, etc." />
              </div>
              <div className="md:col-span-8">
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
  );
}