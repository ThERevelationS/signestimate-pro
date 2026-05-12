import React, { useState, useEffect, useMemo } from "react";
import { ChannelLetterInstallEquipment } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Save, Home, Building2, Fuel } from "lucide-react";

const EQUIPMENT_TYPES = [
  { value: "ladder", label: "Ladder" },
  { value: "scissor_lift", label: "Scissor Lift" },
  { value: "boom_lift", label: "Boom Lift" },
  { value: "scaffold", label: "Scaffold" },
  { value: "truck", label: "Truck" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
  { value: "flatbed", label: "Flatbed" },
  { value: "hand_tool", label: "Hand Tool" },
  { value: "power_tool", label: "Power Tool" },
  { value: "safety", label: "Safety" },
  { value: "other", label: "Other" },
];

const VEHICLE_TYPES = ["truck", "car", "van", "flatbed"];

const FUEL_TYPES = [
  { value: "na", label: "N/A" },
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
];

const OWNED_PRICING_MODES = [
  { value: "owned_flat", label: "Flat Day Rate" },
  { value: "per_hour", label: "Per Hour" },
  { value: "per_project_flat", label: "Per Project Flat" },
];

const RENTED_PRICING_MODES = [
  { value: "per_hour", label: "Per Hour" },
  { value: "per_day", label: "Per Day" },
  { value: "per_week", label: "Per Week" },
  { value: "per_month", label: "Per Month" },
];

// Migrate: older records without `ownership` are inferred from pricing_mode.
const isOwned = (item) => {
  if (item.ownership) return item.ownership === "owned";
  return item.pricing_mode === "owned_flat" || item.pricing_mode === "per_project_flat";
};

const emptyItem = (mode = "owned") => ({
  equipment_name: "",
  equipment_type: mode === "owned" ? "truck" : "scissor_lift",
  ownership: mode,
  max_height_feet: 0,
  pricing_mode: mode === "owned" ? "owned_flat" : "per_day",
  cost_per_hour: 0,
  cost_per_day: 0,
  cost_per_week: 0,
  cost_per_month: 0,
  cost_flat: 0,
  delivery_pickup_cost: 0,
  mpg: 0,
  fuel_type: mode === "owned" ? "gasoline" : "na",
  rental_company: "",
  notes: "",
  is_active: true,
  sort_order: 0,
});

export default function EquipmentInventoryTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("owned");

  const load = async () => {
    setLoading(true);
    const data = await ChannelLetterInstallEquipment.list("sort_order");
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const ownedItems = useMemo(() => items.filter(isOwned), [items]);
  const rentedItems = useMemo(() => items.filter((it) => !isOwned(it)), [items]);

  const update = (origIndex, patch) => {
    const next = [...items];
    next[origIndex] = { ...next[origIndex], ...patch };
    setItems(next);
  };

  const addItem = (mode) => {
    setItems([...items, { ...emptyItem(mode), _new: true }]);
    setActiveTab(mode);
  };

  const removeItem = async (origIndex) => {
    const item = items[origIndex];
    if (item.id) {
      if (!confirm(`Delete "${item.equipment_name}"?`)) return;
      await ChannelLetterInstallEquipment.delete(item.id);
    }
    const next = [...items];
    next.splice(origIndex, 1);
    setItems(next);
  };

  const saveAll = async () => {
    setSaving(true);
    for (const it of items) {
      const { _new, id, ...payload } = it;
      // Ensure ownership is always persisted (back-fills legacy records)
      if (!payload.ownership) {
        payload.ownership = isOwned(it) ? "owned" : "rented";
      }
      if (id) await ChannelLetterInstallEquipment.update(id, payload);
      else await ChannelLetterInstallEquipment.create(payload);
    }
    await load();
    setSaving(false);
  };

  const costField = (it, i) => {
    switch (it.pricing_mode) {
      case "per_hour":
        return <Input type="number" step="0.01" value={it.cost_per_hour || 0} onFocus={e => e.target.select()} onChange={(e) => update(i, { cost_per_hour: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />;
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

  const renderRow = (it, origIndex, mode) => {
    const isVehicle = VEHICLE_TYPES.includes(it.equipment_type);
    const showFuel = mode === "owned" && isVehicle;
    const pricingOptions = mode === "owned" ? OWNED_PRICING_MODES : RENTED_PRICING_MODES;
    const accent = mode === "owned" ? "bg-emerald-50/40 border-emerald-100" : "bg-blue-50/40 border-blue-100";

    return (
      <div key={origIndex} className={`border rounded-lg p-3 ${accent}`}>
        <div className="grid md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-3">
            <Label className="text-xs">Equipment Name</Label>
            <Input value={it.equipment_name} onChange={(e) => update(origIndex, { equipment_name: e.target.value })} className="h-8 mt-0.5" placeholder="e.g. 26ft Scissor Lift" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Type</Label>
            <Select value={it.equipment_type} onValueChange={(v) => update(origIndex, { equipment_type: v })}>
              <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs">Max Ht (ft)</Label>
            <Input type="number" value={it.max_height_feet} onFocus={e => e.target.select()} onChange={(e) => update(origIndex, { max_height_feet: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Pricing Mode</Label>
            <Select value={it.pricing_mode} onValueChange={(v) => update(origIndex, { pricing_mode: v })}>
              <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pricingOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Cost</Label>
            {costField(it, origIndex)}
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs">Delivery</Label>
            <Input type="number" step="0.01" value={it.delivery_pickup_cost} onFocus={e => e.target.select()} onChange={(e) => update(origIndex, { delivery_pickup_cost: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />
          </div>
          <div className="md:col-span-1 flex items-end">
            <label className="flex items-center gap-1 cursor-pointer text-xs mb-2">
              <Checkbox checked={it.is_active} onCheckedChange={(c) => update(origIndex, { is_active: !!c })} />
              <span>Active</span>
            </label>
          </div>
        </div>
        {showFuel && (
          <div className="grid md:grid-cols-12 gap-2 mt-2 p-2 rounded-md bg-emerald-100/40 border border-emerald-200/60">
            <div className="md:col-span-3">
              <Label className="text-xs flex items-center gap-1"><Fuel className="w-3 h-3 text-emerald-700" /> Fuel Type</Label>
              <Select value={it.fuel_type || "gasoline"} onValueChange={(v) => update(origIndex, { fuel_type: v })}>
                <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">MPG</Label>
              <Input type="number" step="0.1" value={it.mpg || 0} onFocus={e => e.target.select()} onChange={(e) => update(origIndex, { mpg: parseFloat(e.target.value) || 0 })} className="h-8 mt-0.5" />
            </div>
            <div className="md:col-span-7 flex items-end">
              <p className="text-[11px] text-emerald-800/70 mb-1.5">Used to calculate travel fuel cost from the shop to the job site.</p>
            </div>
          </div>
        )}
        <div className="grid md:grid-cols-12 gap-2 mt-2">
          {mode === "rented" ? (
            <div className="md:col-span-3">
              <Label className="text-xs">Rental Company</Label>
              <Input value={it.rental_company || ""} onChange={(e) => update(origIndex, { rental_company: e.target.value })} className="h-7 text-xs mt-0.5" placeholder="Sunbelt, United, etc." />
            </div>
          ) : (
            <div className="md:col-span-3">
              <Label className="text-xs">Delivery / Setup</Label>
              <Input type="number" step="0.01" value={it.delivery_pickup_cost} onFocus={e => e.target.select()} onChange={(e) => update(origIndex, { delivery_pickup_cost: parseFloat(e.target.value) || 0 })} className="h-7 text-xs mt-0.5" />
            </div>
          )}
          <div className="md:col-span-8">
            <Label className="text-xs">Notes</Label>
            <Input value={it.notes || ""} onChange={(e) => update(origIndex, { notes: e.target.value })} className="h-7 text-xs mt-0.5" />
          </div>
          <div className="md:col-span-1 flex items-end justify-end">
            <Button size="sm" variant="ghost" onClick={() => removeItem(origIndex)} className="text-red-500 hover:bg-red-50 h-7 w-7 p-0">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-slate-600">Loading...</div>;

  const renderSection = (list, mode) => (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => addItem(mode)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add {mode === "owned" ? "Owned" : "Rented"} Equipment
        </Button>
      </div>
      {list.length === 0 ? (
        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
          No {mode} equipment yet.
        </div>
      ) : list.map((it) => {
        const origIndex = items.indexOf(it);
        return renderRow(it, origIndex, mode);
      })}
    </div>
  );

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Equipment ({items.length})</CardTitle>
          <CardDescription className="mt-1">
            Owned equipment uses flat rates. Rented equipment uses daily/weekly/monthly. Trucks (owned) can have an MPG for travel fuel calculations.
          </CardDescription>
        </div>
        <Button onClick={saveAll} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save All"}
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mb-4">
            <TabsTrigger value="owned" className="gap-2">
              <Home className="w-4 h-4" /> Owned ({ownedItems.length})
            </TabsTrigger>
            <TabsTrigger value="rented" className="gap-2">
              <Building2 className="w-4 h-4" /> Rented ({rentedItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="owned">{renderSection(ownedItems, "owned")}</TabsContent>
          <TabsContent value="rented">{renderSection(rentedItems, "rented")}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}