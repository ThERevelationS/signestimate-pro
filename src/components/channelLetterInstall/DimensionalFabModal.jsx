import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Box, Router, Paintbrush, Calculator, AlertCircle, Sparkles, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DimensionalLetterMaterial, Settings as SettingsEntity } from "@/entities/all";
import {
  calcDimensionalUnitCost,
  materialCostPerSqin,
  emptyFabConfig,
  PAINT_SIDES_LABELS,
} from "./dimensionalFabCalculator";

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

export default function DimensionalFabModal({ open, onOpenChange, purchase, onSave }) {
  const [materials, setMaterials] = useState([]);
  const [settings, setSettings] = useState({});
  const [fab, setFab] = useState(emptyFabConfig());
  const [loading, setLoading] = useState(true);

  // Load materials + relevant settings (CNC + Paint)
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const [mats, settingsList] = await Promise.all([
          DimensionalLetterMaterial.filter({ is_active: true }, "sort_order"),
          SettingsEntity.list(),
        ]);
        setMaterials(mats);
        // Build a flat settings map keyed by setting_name → setting_value
        const map = {};
        settingsList.forEach(s => { map[s.setting_name] = s.setting_value; });
        // Expose just the bits the calculator needs
        setSettings({
          machine_rate_per_hour: map.cnc_machine_rate_per_hour || map.machine_rate_per_hour || 75,
          labor_rate: map.cnc_labor_rate || map.labor_rate || 45,
          paint_labor_rate: map.paint_labor_rate || map.labor_rate || 60,
          paint_supplies_rate_per_sqft: map.paint_supplies_rate_per_sqft || 2.5,
          paint_liquid_paint_per_sqft: map.paint_liquid_paint_per_sqft || map.paint_supplies_per_sqft || 1.25,
        });

        // Seed fab from purchase, or use empty default
        const seed = purchase?.fab_config ? { ...emptyFabConfig(), ...purchase.fab_config } : emptyFabConfig();
        // If purchase has size_value (sqft), back-fill letter dimensions from it for new configs
        if (!purchase?.fab_config && purchase?.size_value) {
          // Treat size_value (sqft) as area per letter — derive a roughly square shape.
          const sqin = (parseFloat(purchase.size_value) || 0) * 144;
          const side = Math.sqrt(sqin / 0.55); // reverse our 0.55 fill factor
          seed.letter_height_inches = Math.round(side);
          seed.letter_width_inches = Math.round(side * 0.75);
        }
        setFab(seed);
      } catch (e) {
        console.error("Failed to load fab inputs:", e);
      }
      setLoading(false);
    })();
  }, [open, purchase]);

  // Update fab when a material is picked — refresh thickness + cost_per_sqin + paint default
  const selectMaterial = (id) => {
    const m = materials.find(x => x.id === id);
    if (!m) return;
    setFab(prev => ({
      ...prev,
      material_id: m.id,
      material_name: m.material_name,
      material_thickness_inches: m.thickness_inches,
      material_cost_per_sqin: materialCostPerSqin(m),
      sheet_yield_factor: m.yield_factor,
      paint_letters: !!m.needs_painting,
    }));
  };

  // Recompute as the user edits
  const computed = useMemo(() => {
    const qty = parseFloat(purchase?.qty) || 1;
    return calcDimensionalUnitCost(fab, qty, settings);
  }, [fab, purchase?.qty, settings]);

  const update = (patch) => setFab(prev => ({ ...prev, ...patch }));

  const handleSave = () => {
    // Compute final, persist fab_config + override unit cost on the purchase row
    const qty = parseFloat(purchase?.qty) || 1;
    const final = calcDimensionalUnitCost(fab, qty, settings);
    onSave({
      fab_config: {
        material_id: final.material_id,
        material_name: final.material_name,
        material_thickness_inches: final.material_thickness_inches,
        material_cost_per_sqin: final.material_cost_per_sqin,
        sheet_yield_factor: final.sheet_yield_factor,
        letter_height_inches: final.letter_height_inches,
        letter_width_inches: final.letter_width_inches,
        letter_perimeter_inches: final.letter_perimeter_inches,
        cnc_cut_speed_ipm: final.cnc_cut_speed_ipm,
        cnc_setup_minutes: final.cnc_setup_minutes,
        paint_letters: final.paint_letters,
        paint_sides: final.paint_sides,
        num_paint_colors: final.num_paint_colors,
        unit_material_cost: final.unit_material_cost,
        unit_cnc_cost: final.unit_cnc_cost,
        unit_paint_cost: final.unit_paint_cost,
        unit_total_cost: final.unit_total_cost,
      },
      // Override the row's unit cost with the computed result.
      // The Letters tab multiplies unit_cost × size_value × qty.
      // For dimensional letters, size_value is sqft. We want total = unit_total_cost × qty,
      // so set unit_cost = unit_total_cost / sqft_per_letter, with size_value = sqft per letter.
      unit_cost_override: true,
      unit_cost: final.unit_total_cost / Math.max(0.01, (final.face_area_sqin || 1) / 144),
      size_value: (final.face_area_sqin || 1) / 144, // sqft per letter
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Dimensional Letter Fabrication
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Build the unit cost from material + CNC routing + paint. Live preview at the bottom.
          </p>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading…</div>
        ) : (
          <div className="space-y-4">
            {/* MATERIAL */}
            <Section icon={Box} title="1. Material" color="bg-blue-50 text-blue-700">
              {materials.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs text-amber-800">
                    <p className="font-medium mb-1">No sheet materials in your library yet.</p>
                    <Link to={createPageUrl("DimensionalLetterMaterials")} className="inline-flex items-center gap-1 underline">
                      <LinkIcon className="w-3 h-3" /> Open Materials Library
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-xs">Sheet Material</Label>
                    <Select value={fab.material_id || ""} onValueChange={selectMaterial}>
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue placeholder="Select material..." />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.material_name} ({m.thickness_inches}")
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fab.material_id && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        ≈ {fmt(fab.material_cost_per_sqin * 144)}/sqft after {Math.round(fab.sheet_yield_factor * 100)}% yield
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Thickness (in)</Label>
                    <Input
                      type="number" step="0.0625" min="0"
                      value={fab.material_thickness_inches}
                      onChange={(e) => update({ material_thickness_inches: parseFloat(e.target.value) || 0 })}
                      className="h-9 mt-1 tabular-nums"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Letter Height (in)</Label>
                  <Input
                    type="number" min="0" step="0.5"
                    value={fab.letter_height_inches}
                    onChange={(e) => update({ letter_height_inches: parseFloat(e.target.value) || 0 })}
                    className="h-9 mt-1 tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-xs">Letter Width (avg, in)</Label>
                  <Input
                    type="number" min="0" step="0.5"
                    value={fab.letter_width_inches}
                    onChange={(e) => update({ letter_width_inches: parseFloat(e.target.value) || 0 })}
                    className="h-9 mt-1 tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-xs">Cut Length Override (in)</Label>
                  <Input
                    type="number" min="0" step="1"
                    value={fab.letter_perimeter_inches}
                    onChange={(e) => update({ letter_perimeter_inches: parseFloat(e.target.value) || 0 })}
                    placeholder="Auto"
                    className="h-9 mt-1 tabular-nums"
                  />
                </div>
              </div>
            </Section>

            {/* CNC */}
            <Section icon={Router} title="2. CNC Routing" color="bg-green-50 text-green-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cut Speed (in/min)</Label>
                  <Input
                    type="number" min="1" step="1"
                    value={fab.cnc_cut_speed_ipm}
                    onChange={(e) => update({ cnc_cut_speed_ipm: parseFloat(e.target.value) || 50 })}
                    className="h-9 mt-1 tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-xs">Setup Time (min, total)</Label>
                  <Input
                    type="number" min="0" step="1"
                    value={fab.cnc_setup_minutes}
                    onChange={(e) => update({ cnc_setup_minutes: parseFloat(e.target.value) || 0 })}
                    className="h-9 mt-1 tabular-nums"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Machine rate: ${parseFloat(settings.machine_rate_per_hour).toFixed(0)}/hr · Operator: ${parseFloat(settings.labor_rate).toFixed(0)}/hr
                {" "}<Link to={createPageUrl("CNCSettings")} className="underline ml-1">Edit</Link>
              </p>
            </Section>

            {/* PAINT */}
            <Section icon={Paintbrush} title="3. Paint" color="bg-purple-50 text-purple-700">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={!!fab.paint_letters} onCheckedChange={(c) => update({ paint_letters: !!c })} />
                <span>Paint these letters</span>
              </label>
              {fab.paint_letters && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Sides</Label>
                    <Select value={fab.paint_sides} onValueChange={(v) => update({ paint_sides: v })}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAINT_SIDES_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs"># of Paint Colors</Label>
                    <Input
                      type="number" min="1" step="1"
                      value={fab.num_paint_colors}
                      onChange={(e) => update({ num_paint_colors: parseInt(e.target.value, 10) || 1 })}
                      className="h-9 mt-1 tabular-nums"
                    />
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                Paint labor: ${parseFloat(settings.paint_labor_rate).toFixed(0)}/hr · Supplies: ${parseFloat(settings.paint_supplies_rate_per_sqft).toFixed(2)}/sqft · Paint: ${parseFloat(settings.paint_liquid_paint_per_sqft).toFixed(2)}/sqft
                {" "}<Link to={createPageUrl("PaintSettings")} className="underline ml-1">Edit</Link>
              </p>
            </Section>

            {/* LIVE PREVIEW */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="w-4 h-4" />
                <span className="font-semibold">Per-Letter Cost Breakdown</span>
                <Badge className="ml-auto bg-white/10 text-white border-0">
                  qty: {purchase?.qty || 1}
                </Badge>
              </div>
              <PreviewRow label="Material" value={computed.unit_material_cost} subtitle={`${(computed.face_area_sqin || 0).toFixed(1)} sqin`} />
              <PreviewRow label="CNC Routing" value={computed.unit_cnc_cost} subtitle={`${(computed.cut_length_inches || 0).toFixed(0)}" cut`} />
              {fab.paint_letters && (
                <PreviewRow label="Paint" value={computed.unit_paint_cost} subtitle={PAINT_SIDES_LABELS[fab.paint_sides]} />
              )}
              <div className="border-t border-white/20 pt-2 flex justify-between items-center">
                <span className="text-sm text-slate-300">Per Letter</span>
                <span className="text-xl font-bold tabular-nums">{fmt(computed.unit_total_cost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Total ({purchase?.qty || 1} letters)</span>
                <span className="text-2xl font-bold tabular-nums">{fmt(computed.unit_total_cost * (parseFloat(purchase?.qty) || 1))}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Sparkles className="w-4 h-4 mr-1" /> Apply Fab Cost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Section = ({ icon: Icon, title, color, children }) => (
  <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-white">
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="font-semibold text-slate-800 text-sm">{title}</span>
    </div>
    {children}
  </div>
);

const PreviewRow = ({ label, value, subtitle }) => (
  <div className="flex justify-between items-center text-sm">
    <div>
      <span className="text-slate-300">{label}</span>
      {subtitle && <span className="ml-2 text-[10px] text-slate-500">{subtitle}</span>}
    </div>
    <span className="tabular-nums font-medium">{fmt(value)}</span>
  </div>
);