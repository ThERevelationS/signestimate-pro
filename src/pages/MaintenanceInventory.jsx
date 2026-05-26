import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MaintenanceEquipment } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Boxes, Truck, Box, Trash2, Wrench } from "lucide-react";
import MaintenanceDimensionalSheetsTab from "@/components/signMaintenance/MaintenanceDimensionalSheetsTab";
import MaintenanceMaterialsTab from "@/components/signMaintenance/MaintenanceMaterialsTab";

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
            <p className="text-slate-600">Dimensional sheets, maintenance materials, and equipment used on service calls.</p>
          </div>
          <Link to={createPageUrl("SignMaintenanceProjects")}>
            <Button variant="outline" className="bg-white"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          </Link>
        </div>

        <Tabs defaultValue="dimensional" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1">
            <TabsTrigger value="dimensional" className="py-2"><Box className="w-4 h-4 mr-2" />Substrates</TabsTrigger>
            <TabsTrigger value="materials"   className="py-2"><Wrench className="w-4 h-4 mr-2" />Maintenance Materials</TabsTrigger>
            <TabsTrigger value="equipment"   className="py-2"><Truck className="w-4 h-4 mr-2" />Equipment</TabsTrigger>
          </TabsList>

          <TabsContent value="dimensional">
            <MaintenanceDimensionalSheetsTab />
          </TabsContent>
          <TabsContent value="materials">
            <MaintenanceMaterialsTab />
          </TabsContent>
          <TabsContent value="equipment">
            <EquipmentTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ---- Equipment tab (unchanged from prior implementation) -------------------
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