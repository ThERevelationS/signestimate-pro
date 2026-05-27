// Vinyl Estimator — Formula Viewer panel.
// Documents how the nesting calculator turns parts into roll length and cost.

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplets, Printer, Scissors, Layers } from "lucide-react";
import { calculateVinylProject } from "@/components/vinylEstimator/vinylNestingCalculator";

const num = (v, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

// Demo machines mirroring HP Latex 360 + Graphtec FC9000 + a cold laminator
const demoPrinter = {
  machine_type: "printer",
  max_media_width_inches: 64, left_margin_inches: 0.5, right_margin_inches: 0.5,
  leading_edge_inches: 4, trailing_edge_inches: 2,
  default_gutter_horizontal_inches: 0.25, default_gutter_vertical_inches: 0.25,
  default_bleed_inches: 0.125,
  print_cost_per_sqin: 0.02, print_speed_sqft_per_hour: 110,
  warmup_minutes: 5, media_load_minutes: 4, calibration_minutes_per_job: 3,
  machine_hourly_rate: 35,
};
const demoCutter = {
  machine_type: "cutter",
  max_media_width_inches: 54, left_margin_inches: 0.5, right_margin_inches: 0.5,
  leading_edge_inches: 2, trailing_edge_inches: 1,
  cut_speed_inches_per_second: 30,
  cut_blade_cost: 25, cut_blade_life_minutes: 6000,
  cut_setup_minutes_per_job: 3, cut_pull_off_inches_per_job: 6,
  machine_hourly_rate: 20,
};
const demoLaminator = {
  machine_type: "laminator",
  max_media_width_inches: 54, left_margin_inches: 0.25, right_margin_inches: 0.25,
  leading_edge_inches: 6, trailing_edge_inches: 4,
  laminator_speed_inches_per_minute: 100, laminator_setup_minutes_per_job: 4,
  laminator_hourly_rate: 25,
};
const demoVinyl = {
  vinyl_name: "3M IJ180Cv3 — White 54\"",
  roll_width_inches: 54, roll_length_yards: 50,
  pricing_mode: "per_roll", cost_per_roll: 825,
  waste_factor_percent: 15,
};
const demoLaminate = {
  vinyl_name: "3M 8508 Matte Overlam 54\"",
  roll_width_inches: 54, roll_length_yards: 50,
  pricing_mode: "per_roll", cost_per_roll: 480,
  waste_factor_percent: 10,
};

export default function VinylEstimatorFormulas() {
  const [partW, setPartW] = useState(12);
  const [partH, setPartH] = useState(12);
  const [qty, setQty]     = useState(12);
  const [bleed, setBleed] = useState(0);

  const items = [{
    id: "demo", description: "Demo Part",
    width_inches: partW, height_inches: partH,
    quantity: qty, bleed_inches: bleed, allow_rotation: true,
  }];

  const calc = calculateVinylProject({
    items,
    printer: demoPrinter, cutter: demoCutter, laminator: demoLaminator,
    vinyl: demoVinyl, laminate: demoLaminate,
    operatorHourlyRate: 45,
    applyPrint: true, applyCut: true, applyLaminate: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Droplets className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">Vinyl Estimator — Nesting & Cost Math</h2>
          <p className="text-xs text-slate-500">
            Shelf-pack nesting on a roll (Next-Fit-Decreasing-Height), plus print / cut / laminate
            time + material cost. Demo uses HP Latex 360 + Graphtec FC9000 + cold laminator.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">Demo Part (Editable)</h3>
          <Card><CardContent className="p-4 grid grid-cols-2 gap-3">
            <div><Label>Part Width (in)</Label><Input type="number" value={partW} onChange={(e) => setPartW(num(e.target.value, 1))} /></div>
            <div><Label>Part Height (in)</Label><Input type="number" value={partH} onChange={(e) => setPartH(num(e.target.value, 1))} /></div>
            <div><Label>Quantity</Label><Input type="number" value={qty} onChange={(e) => setQty(Math.max(1, num(e.target.value, 1)))} /></div>
            <div><Label>Bleed (in)</Label><Input type="number" step="0.125" value={bleed} onChange={(e) => setBleed(num(e.target.value, 0))} /></div>
          </CardContent></Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">Live Calculations</h3>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-1 text-blue-800">
            <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-1"><Droplets className="w-3.5 h-3.5" /> Roll Layout</h4>
            <p>Usable width = roll {demoVinyl.roll_width_inches}″ − margins {demoPrinter.left_margin_inches + demoPrinter.right_margin_inches}″ = <b>{calc.usableWidth.toFixed(2)}″</b></p>
            <p>Shelves placed = <b>{calc.shelves.length}</b> · parts placed = <b>{calc.partsPlaced}</b></p>
            <p>Roll consumed = leading {calc.leadingEdge}″ + content {calc.totalLengthIn.toFixed(2)}″ + trailing {calc.trailingEdge}″ + cut pull-off = <b>{calc.lengthConsumedFt.toFixed(2)} ft</b></p>
            <p>Roll waste = total pulled {calc.totalRollSqFtPulled.toFixed(2)} − used {calc.usedSqFt.toFixed(2)} = <b>{calc.wastedSqFt.toFixed(2)} sqft</b></p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs space-y-1 text-emerald-800">
            <h4 className="font-bold text-emerald-900 mb-1 flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> Print (HP Latex 360)</h4>
            <p>Print sqft = {calc.usedSqFt.toFixed(2)} · cost = sqin × $/sqin = ({(calc.usedSqFt * 144).toFixed(0)} × ${demoPrinter.print_cost_per_sqin}) = <b>${calc.inkCost.toFixed(2)}</b></p>
            <p>Print time = (sqft ÷ speed) × 60 + warmup + load + cal = <b>{calc.printMinutes.toFixed(2)} min</b></p>
            <p>Machine $ = (min ÷ 60) × ${demoPrinter.machine_hourly_rate}/hr = <b>${calc.printMachineCost.toFixed(2)}</b></p>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs space-y-1 text-rose-800">
            <h4 className="font-bold text-rose-900 mb-1 flex items-center gap-1"><Scissors className="w-3.5 h-3.5" /> Cut (Graphtec FC9000)</h4>
            <p>Cut distance = Σ perimeters of placed parts = <b>{(calc.cutDistanceIn / 12).toFixed(1)} ft</b></p>
            <p>Cut time = distance ÷ speed = <b>{calc.cutMinutes.toFixed(2)} min</b></p>
            <p>Blade wear = (cut min ÷ blade life) × blade $ = <b>${calc.bladeCost.toFixed(2)}</b></p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs space-y-1 text-purple-800">
            <h4 className="font-bold text-purple-900 mb-1 flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Laminate</h4>
            <p>Laminate sqft = full roll-width pulled = <b>{calc.laminateSqFt.toFixed(2)} sqft</b></p>
            <p>Laminate $ = sqft × $/sqft × (1 + waste %) = <b>${calc.laminateCost.toFixed(2)}</b></p>
            <p>Laminator time = length ÷ ipm + setup = <b>{calc.laminateMinutes.toFixed(2)} min</b></p>
          </div>

          <div className="bg-slate-800 text-white p-3 rounded text-xs space-y-1">
            <h4 className="font-medium mb-1">Final Totals</h4>
            <div className="flex justify-between"><span>Vinyl:</span><span>${calc.vinylCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Laminate:</span><span>${calc.laminateCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Ink + Blade:</span><span>${(calc.inkCost + calc.bladeCost).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Machine + Labor:</span><span>${(calc.machineCost + calc.laborCost).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold border-t border-slate-600 pt-1 mt-1">
              <span>Total:</span><span>${calc.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}