// Sign Maintenance — Formula Viewer panel.
// Documents the Monument Repaint formulas + the new Painted Dimensional
// Letters add-on (which reuses Paint Estimator rates).
// Pure documentation/demo — does not mutate state outside this component.

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck, Paintbrush2, Type } from "lucide-react";
import { computeMonumentRepaint } from "@/components/signMaintenance/repaintCalculator";
import { PAINT_CONDITION_LABELS } from "@/components/signMaintenance/repaintDefaults";

const num = (v, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

export default function SignMaintenanceFormulas({ settings = {} }) {
  // Demo inputs that mirror the in-app monument repaint config
  const [cfg, setCfg] = useState({
    length_ft: 8,
    height_ft: 4,
    return_depth_in: 6,
    paint_mode: "entire_panel",
    paint_both_sides: true,
    features: ["dimensional_letters"],
    retainer_width_in: 2,
    paint_condition: 3,
    dim_letter_paint: {
      enabled: true,
      qty: 6,
      avg_height_in: 12,
      thickness_in: 1,
      second_color_mask: "paint_mask",
    },
  });

  const set = (patch) => setCfg(prev => ({ ...prev, ...patch }));
  const setDL = (patch) => setCfg(prev => ({ ...prev, dim_letter_paint: { ...prev.dim_letter_paint, ...patch } }));

  // Build a fake "item" so we can reuse the live calculator.
  const fakeItem = { sign_type: "monument_sign", actions: ["repaint"], repaint_config: cfg };
  const calc = computeMonumentRepaint(fakeItem, settings) || {};

  const techRate = num(settings.maintenance_tech_rate, 65);
  const laborCost = (calc.labor_hours || 0) * techRate;
  const conditionLabel = PAINT_CONDITION_LABELS[(cfg.paint_condition || 1) - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
          <ClipboardCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">Sign Maintenance — Monument Repaint</h2>
          <p className="text-xs text-slate-500">Repaint action + painted dimensional letters add-on (uses Paint Estimator rates).</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ===== Demo Inputs ===== */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Demo Inputs (Editable)</h3>

          <Card><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Length (ft)</Label><Input type="number" value={cfg.length_ft} onChange={(e) => set({ length_ft: num(e.target.value) })} /></div>
              <div><Label>Height (ft)</Label><Input type="number" value={cfg.height_ft} onChange={(e) => set({ height_ft: num(e.target.value) })} /></div>
              <div><Label>Return Depth (in)</Label><Input type="number" value={cfg.return_depth_in} onChange={(e) => set({ return_depth_in: num(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Paint Scope</Label>
                <Select value={cfg.paint_mode} onValueChange={(v) => set({ paint_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entire_panel">Entire Panel</SelectItem>
                    <SelectItem value="returns_only">Returns Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {cfg.paint_mode === "returns_only" ? (
                <div>
                  <Label>Retainer Width (in)</Label>
                  <Input type="number" value={cfg.retainer_width_in} onChange={(e) => set({ retainer_width_in: num(e.target.value) })} />
                </div>
              ) : (
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={cfg.paint_both_sides} onCheckedChange={(v) => set({ paint_both_sides: !!v })} />
                    Paint both sides
                  </label>
                </div>
              )}
            </div>
            <div>
              <Label>Paint Condition (1–10) — currently <span className="font-bold">{conditionLabel}</span></Label>
              <Input type="number" min="1" max="10" value={cfg.paint_condition} onChange={(e) => set({ paint_condition: Math.min(10, Math.max(1, num(e.target.value, 1))) })} />
            </div>
          </CardContent></Card>

          {cfg.paint_mode === "entire_panel" && (
            <Card><CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Type className="w-4 h-4 text-blue-600" /> Painted Dimensional Letters
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={cfg.dim_letter_paint.enabled} onCheckedChange={(v) => setDL({ enabled: !!v })} />
                Paint the dimensional letters too
              </label>
              {cfg.dim_letter_paint.enabled && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label># Letters</Label><Input type="number" value={cfg.dim_letter_paint.qty} onChange={(e) => setDL({ qty: num(e.target.value) })} /></div>
                    <div><Label>Avg Height (in)</Label><Input type="number" value={cfg.dim_letter_paint.avg_height_in} onChange={(e) => setDL({ avg_height_in: num(e.target.value) })} /></div>
                    <div><Label>Thickness (in)</Label><Input type="number" value={cfg.dim_letter_paint.thickness_in} onChange={(e) => setDL({ thickness_in: num(e.target.value) })} /></div>
                  </div>
                  <div>
                    <Label>Second Color / Mask</Label>
                    <Select value={cfg.dim_letter_paint.second_color_mask} onValueChange={(v) => setDL({ second_color_mask: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Single Color</SelectItem>
                        <SelectItem value="paint_mask">Second Color — Paint Mask</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent></Card>
          )}
        </div>

        {/* ===== Formulas & Live Math ===== */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">Live Calculations</h3>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1 text-amber-800">
            <h4 className="font-bold text-amber-900 flex items-center gap-1 mb-1"><Paintbrush2 className="w-3.5 h-3.5" /> Repaint Sq Ft</h4>
            <p>Perimeter = 2 × (L + H) = 2 × ({cfg.length_ft} + {cfg.height_ft}) = <b>{calc.perimeter_ft?.toFixed(2)} ft</b></p>
            {cfg.paint_mode === "entire_panel" ? (
              <>
                <p>Face SqFt = L × H × sides = {cfg.length_ft} × {cfg.height_ft} × {cfg.paint_both_sides ? 2 : 1} = <b>{calc.face_sqft?.toFixed(2)}</b></p>
                <p>Returns SqFt = Perimeter × (Return Depth ÷ 12) = {calc.perimeter_ft?.toFixed(2)} × ({cfg.return_depth_in}/12) = <b>{calc.returns_sqft?.toFixed(2)}</b></p>
              </>
            ) : (
              <p>Returns SqFt = Perimeter × (Retainer Width ÷ 12) = {calc.perimeter_ft?.toFixed(2)} × ({cfg.retainer_width_in}/12) = <b>{calc.returns_sqft?.toFixed(2)}</b></p>
            )}
            <p>Total SqFt = <b>{calc.total_sqft?.toFixed(2)}</b></p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs space-y-1 text-orange-800">
            <h4 className="font-bold text-orange-900 mb-1">Paint Material (Monument)</h4>
            <p>Coats = primer ({calc.primerCoats}) + finish ({calc.finishCoats}) = <b>{calc.totalCoats}</b></p>
            <p>Gallons = (Total SqFt × Coats) ÷ Coverage = ({calc.total_sqft?.toFixed(2)} × {calc.totalCoats}) ÷ {calc.coverage} = <b>{calc.gallons?.toFixed(3)} gal</b></p>
            <p>Paint $ = Gallons × ${calc.pricePerGal} = <b>${(calc.gallons * calc.pricePerGal || 0).toFixed(2)}</b></p>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs space-y-1 text-violet-800">
            <h4 className="font-bold text-violet-900 mb-1">Labor Multipliers</h4>
            <p>Feature × = Π(selected feature multipliers) = <b>{calc.feature_multiplier?.toFixed(2)}</b></p>
            <p>Condition × = 1 + step% × (level − 1) = 1 + {num(settings.maintenance_repaint_condition_step_pct, 8)}% × ({cfg.paint_condition} − 1) = <b>{calc.condition_multiplier?.toFixed(2)}</b></p>
            <p>Base Hours = Total SqFt ÷ SqFt/hr × Feature × Condition = {calc.total_sqft?.toFixed(2)} ÷ {num(settings.maintenance_repaint_sqft_per_hour, 60)} × {calc.feature_multiplier?.toFixed(2)} × {calc.condition_multiplier?.toFixed(2)}</p>
          </div>

          {calc.dim_letter_paint && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-1 text-blue-800">
              <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-1"><Type className="w-3.5 h-3.5" /> Painted Dimensional Letters (Paint Estimator rates)</h4>
              <p>Letter Face SqFt ≈ Σ (h² × 0.55) ÷ 144 = <b>{calc.dim_letter_paint.letters_face_sqft.toFixed(3)}</b></p>
              <p>Letter Return SqFt = Σ (h × perim-factor × thickness) ÷ 144 = <b>{calc.dim_letter_paint.letters_returns_sqft.toFixed(3)}</b></p>
              <p>Letter Paint $ = SqFt × liquid$/sqft × waste{cfg.dim_letter_paint.second_color_mask === "paint_mask" ? " (+ face × liquid × waste for 2nd color)" : ""} = <b>${calc.dim_letter_paint.letters_paint_cost.toFixed(2)}</b></p>
              {cfg.dim_letter_paint.second_color_mask === "paint_mask" && (
                <>
                  <p>Mask SqFt = Letter Face SqFt = <b>{calc.dim_letter_paint.mask_sqft.toFixed(3)}</b></p>
                  <p>Mask Material = Mask SqFt × ${num(settings.paint_mask_rate_per_sqft, 0.75)} = <b>${calc.dim_letter_paint.mask_material_cost.toFixed(2)}</b></p>
                  <p>Mask Machine Cutting = Mask SqFt × ${num(settings.paint_mask_machine_cutting_rate_per_sqft, 0.10)} = <b>${calc.dim_letter_paint.mask_machine_cost.toFixed(2)}</b></p>
                  <p>Mask Weed Labor = Mask SqFt × ${num(settings.paint_mask_cutting_labor_rate_per_sqft, 0.15)} = <b>${calc.dim_letter_paint.mask_weed_labor_cost.toFixed(2)}</b></p>
                  <p>Mask Apply Labor = Mask SqFt × ${num(settings.paint_mask_application_labor_rate_per_sqft, 0.25)} = <b>${calc.dim_letter_paint.mask_apply_labor_cost.toFixed(2)}</b></p>
                  <p className="font-semibold">Mask Total = <b>${calc.dim_letter_paint.mask_total_cost.toFixed(2)}</b></p>
                </>
              )}
              <p>Letters Labor Hours (Paint Settings rate) = <b>{calc.dim_letter_paint.letters_labor_hours.toFixed(2)} hr</b></p>
              {cfg.dim_letter_paint.second_color_mask === "paint_mask" && (
                <p>Mask Labor Hours (converted from mask $ ÷ default labor rate) = <b>{calc.dim_letter_paint.mask_labor_hours.toFixed(2)} hr</b></p>
              )}
            </div>
          )}

          <div className="bg-slate-800 text-white p-3 rounded">
            <h4 className="font-medium mb-2">Final Totals</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Total Labor Hours:</span><span>{(calc.labor_hours || 0).toFixed(2)} hr</span></div>
              <div className="flex justify-between"><span>Labor Cost (× ${techRate}/hr):</span><span>${laborCost.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Paint + Letter + Mask Material:</span><span>${(calc.paint_material_cost || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t border-slate-600 pt-2">
                <span>Repaint Item Total:</span>
                <span>${(laborCost + (calc.paint_material_cost || 0)).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}