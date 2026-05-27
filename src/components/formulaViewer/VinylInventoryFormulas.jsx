// Vinyl Inventory — Formula Viewer panel.
// Documents how the Master Vinyl Inventory turns roll dimensions + pricing
// into the $/sqft cost any estimator uses, plus the waste / yield factors.

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Droplets } from "lucide-react";
import { PRICING_MODES, vinylCostPerSqft } from "@/components/vinylInventory/vinylConstants";

const num = (v, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

export default function VinylInventoryFormulas() {
  const [v, setV] = useState({
    vinyl_name: "Demo Vinyl",
    roll_width_inches: 54,
    roll_length_yards: 50,
    pricing_mode: "per_roll",
    cost_per_roll: 825,
    cost_per_sqft: 1.25,
    cost_per_linear_foot: 5.5,
    waste_factor_percent: 15,
    yield_factor: 0.85,
  });

  const set = (patch) => setV(prev => ({ ...prev, ...patch }));

  const widthFt = num(v.roll_width_inches) / 12;
  const lengthFt = num(v.roll_length_yards) * 3;
  const rollSqFt = widthFt * lengthFt;
  const costPerSqft = vinylCostPerSqft(v);

  // Example job: 10 sqft of finished graphic
  const jobSqFt = 10;
  const wasteMult = 1 + num(v.waste_factor_percent) / 100;
  const yieldMult = num(v.yield_factor, 0.85) || 0.85;
  const effectiveSqFtNeeded = (jobSqFt * wasteMult) / yieldMult;
  const jobCost = effectiveSqFtNeeded * costPerSqft;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center">
          <Droplets className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">Vinyl Inventory — Cost Math</h2>
          <p className="text-xs text-slate-500">
            Master vinyl catalog drives the per-sqft cost any estimator uses.
            Shown on the Master Inventory, the Channel & Dimensional Letters Inventory, and the Sign Maintenance Inventory.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">Demo Vinyl (Editable)</h3>
          <Card><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Roll Width (in)</Label><Input type="number" value={v.roll_width_inches} onChange={(e) => set({ roll_width_inches: num(e.target.value) })} /></div>
              <div><Label>Roll Length (yd)</Label><Input type="number" value={v.roll_length_yards} onChange={(e) => set({ roll_length_yards: num(e.target.value) })} /></div>
            </div>
            <div>
              <Label>Pricing Mode</Label>
              <Select value={v.pricing_mode} onValueChange={(val) => set({ pricing_mode: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRICING_MODES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>$ / Roll</Label><Input type="number" step="0.01" value={v.cost_per_roll} disabled={v.pricing_mode !== "per_roll"} onChange={(e) => set({ cost_per_roll: num(e.target.value) })} /></div>
              <div><Label>$ / SqFt</Label><Input type="number" step="0.01" value={v.cost_per_sqft} disabled={v.pricing_mode !== "per_sqft"} onChange={(e) => set({ cost_per_sqft: num(e.target.value) })} /></div>
              <div><Label>$ / Lin Ft</Label><Input type="number" step="0.01" value={v.cost_per_linear_foot} disabled={v.pricing_mode !== "per_linear_foot"} onChange={(e) => set({ cost_per_linear_foot: num(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Waste %</Label><Input type="number" value={v.waste_factor_percent} onChange={(e) => set({ waste_factor_percent: num(e.target.value) })} /></div>
              <div><Label>Yield Factor</Label><Input type="number" step="0.05" value={v.yield_factor} onChange={(e) => set({ yield_factor: num(e.target.value) })} /></div>
            </div>
          </CardContent></Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">Live Calculations</h3>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-1 text-blue-800">
            <h4 className="font-bold text-blue-900 mb-1">Roll Area</h4>
            <p>Width ft = {v.roll_width_inches} ÷ 12 = <b>{widthFt.toFixed(2)}</b></p>
            <p>Length ft = {v.roll_length_yards} × 3 = <b>{lengthFt.toFixed(2)}</b></p>
            <p>Roll SqFt = Width × Length = <b>{rollSqFt.toFixed(2)} sqft</b></p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs space-y-1 text-emerald-800">
            <h4 className="font-bold text-emerald-900 mb-1">Cost per SqFt</h4>
            {v.pricing_mode === "per_roll" && (
              <p>$/sqft = Cost per Roll ÷ Roll SqFt = ${v.cost_per_roll} ÷ {rollSqFt.toFixed(2)} = <b>${costPerSqft.toFixed(4)}</b></p>
            )}
            {v.pricing_mode === "per_sqft" && (
              <p>$/sqft = Direct = <b>${costPerSqft.toFixed(4)}</b></p>
            )}
            {v.pricing_mode === "per_linear_foot" && (
              <p>$/sqft = $/LinFt ÷ Width(ft) = ${v.cost_per_linear_foot} ÷ {widthFt.toFixed(2)} = <b>${costPerSqft.toFixed(4)}</b></p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1 text-amber-800">
            <h4 className="font-bold text-amber-900 mb-1">Example — 10 sqft Job</h4>
            <p>Waste multiplier = 1 + {v.waste_factor_percent}% = <b>{wasteMult.toFixed(3)}</b></p>
            <p>Yield factor = <b>{yieldMult.toFixed(2)}</b></p>
            <p>Effective SqFt needed = (10 × {wasteMult.toFixed(3)}) ÷ {yieldMult.toFixed(2)} = <b>{effectiveSqFtNeeded.toFixed(2)} sqft</b></p>
            <p>Job Cost = {effectiveSqFtNeeded.toFixed(2)} × ${costPerSqft.toFixed(4)} = <b>${jobCost.toFixed(2)}</b></p>
          </div>

          <div className="bg-slate-800 text-white p-3 rounded text-xs space-y-1">
            <h4 className="font-medium mb-1">Notes</h4>
            <p>• <b>requires_lamination</b> → estimator should add a paired laminate vinyl cost on top of this one.</p>
            <p>• <b>requires_transfer_tape</b> → estimator should add transfer-tape sqft × tape cost.</p>
            <p>• <b>weeding_difficulty</b> → may add a labor multiplier on cut-graphics labor (handled by per-estimator settings).</p>
          </div>
        </div>
      </div>
    </div>
  );
}