// Vinyl Estimator settings — manage production machines (printers, cutters, laminators).

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { VinylMachine } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Printer, Scissors, Layers, Loader2, Save } from "lucide-react";

const TYPE_ICON = { printer: Printer, cutter: Scissors, print_and_cut: Printer, laminator: Layers };

const PRINTER_FIELDS = [
  ["max_media_width_inches", "Max Media Width (in)"],
  ["left_margin_inches", "Left Margin (in)"],
  ["right_margin_inches", "Right Margin (in)"],
  ["leading_edge_inches", "Leading Edge (in)"],
  ["trailing_edge_inches", "Trailing Edge (in)"],
  ["default_gutter_horizontal_inches", "Gutter H (in)"],
  ["default_gutter_vertical_inches", "Gutter V (in)"],
  ["default_bleed_inches", "Default Bleed (in)"],
  ["print_cost_per_sqin", "Ink Cost $/sqin"],
  ["print_speed_sqft_per_hour", "Print Speed (sqft/hr)"],
  ["warmup_minutes", "Warmup (min)"],
  ["media_load_minutes", "Media Load (min)"],
  ["calibration_minutes_per_job", "Calibration (min/job)"],
  ["machine_hourly_rate", "Machine $/hr"],
  ["operator_hourly_rate", "Operator $/hr"],
];
const CUTTER_FIELDS = [
  ["max_media_width_inches", "Max Media Width (in)"],
  ["left_margin_inches", "Left Margin (in)"],
  ["right_margin_inches", "Right Margin (in)"],
  ["leading_edge_inches", "Leading Edge (in)"],
  ["trailing_edge_inches", "Trailing Edge (in)"],
  ["cut_speed_inches_per_second", "Cut Speed (in/sec)"],
  ["cut_blade_cost", "Blade Cost $"],
  ["cut_blade_life_minutes", "Blade Life (min)"],
  ["cut_setup_minutes_per_job", "Setup (min/job)"],
  ["cut_pull_off_inches_per_job", "Pull-off (in/job)"],
  ["machine_hourly_rate", "Machine $/hr"],
  ["operator_hourly_rate", "Operator $/hr"],
];
const LAMINATOR_FIELDS = [
  ["max_media_width_inches", "Max Media Width (in)"],
  ["leading_edge_inches", "Leading Edge (in)"],
  ["trailing_edge_inches", "Trailing Edge (in)"],
  ["laminator_speed_inches_per_minute", "Speed (in/min)"],
  ["laminator_setup_minutes_per_job", "Setup (min/job)"],
  ["laminator_hourly_rate", "Machine $/hr"],
  ["operator_hourly_rate", "Operator $/hr"],
];

const fieldsFor = (type) => {
  if (type === "laminator") return LAMINATOR_FIELDS;
  if (type === "cutter") return CUTTER_FIELDS;
  return PRINTER_FIELDS; // printer / print_and_cut
};

export default function VinylSettings() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setMachines(await VinylMachine.list("sort_order")); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id, patch) => setMachines(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  const save = async (m) => {
    setSavingId(m.id);
    try {
      const { id, created_date, updated_date, created_by_id, ...payload } = m;
      await VinylMachine.update(id, payload);
    } catch (e) {
      console.error(e); alert("Save failed: " + e.message);
    }
    setSavingId(null);
  };

  const addMachine = async (type) => {
    const defaults = {
      machine_name: `New ${type}`,
      machine_type: type,
      is_active: true,
      sort_order: machines.length,
    };
    const created = await VinylMachine.create(defaults);
    setMachines(prev => [...prev, created]);
  };

  const remove = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await VinylMachine.delete(id);
    load();
  };

  if (loading) return <div className="p-12 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <Link to={createPageUrl("VinylProjects")} className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Vinyl Projects
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-slate-900">Vinyl Settings — Production Machines</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addMachine("printer")}><Plus className="w-4 h-4 mr-1" /> Printer</Button>
            <Button size="sm" variant="outline" onClick={() => addMachine("cutter")}><Plus className="w-4 h-4 mr-1" /> Cutter</Button>
            <Button size="sm" variant="outline" onClick={() => addMachine("laminator")}><Plus className="w-4 h-4 mr-1" /> Laminator</Button>
          </div>
        </div>

        {machines.length === 0 && (
          <Card><CardContent className="py-12 text-center text-slate-500">
            No machines yet. Add your first printer, cutter, or laminator above.
          </CardContent></Card>
        )}

        {machines.map(m => {
          const Icon = TYPE_ICON[m.machine_type] || Printer;
          const fields = fieldsFor(m.machine_type);
          return (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Icon className="w-5 h-5 text-slate-600" />
                    <Input value={m.machine_name || ""} onChange={(e) => update(m.id, { machine_name: e.target.value })} className="h-8 font-semibold text-base flex-1" />
                  </div>
                  <Select value={m.machine_type} onValueChange={(v) => update(m.id, { machine_type: v })}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="printer">Printer</SelectItem>
                      <SelectItem value="cutter">Cutter</SelectItem>
                      <SelectItem value="print_and_cut">Print + Cut</SelectItem>
                      <SelectItem value="laminator">Laminator</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 text-xs">
                    <Label>Default</Label>
                    <Switch checked={!!m.is_default_for_type} onCheckedChange={(v) => update(m.id, { is_default_for_type: v })} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Label>Active</Label>
                    <Switch checked={m.is_active !== false} onCheckedChange={(v) => update(m.id, { is_active: v })} />
                  </div>
                  <Button size="sm" onClick={() => save(m)} disabled={savingId === m.id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {savingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(m.id, m.machine_name)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </div>
                <div className="grid md:grid-cols-2 gap-2 mt-1">
                  <Input placeholder="Manufacturer" value={m.manufacturer || ""} onChange={(e) => update(m.id, { manufacturer: e.target.value })} className="h-8 text-sm" />
                  <Input placeholder="Model" value={m.model || ""} onChange={(e) => update(m.id, { model: e.target.value })} className="h-8 text-sm" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {fields.map(([key, label]) => (
                    <div key={key}>
                      <Label className="text-[10px] text-slate-500">{label}</Label>
                      <Input
                        type="number" step="any"
                        value={m[key] ?? ""}
                        onChange={(e) => update(m.id, { [key]: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}