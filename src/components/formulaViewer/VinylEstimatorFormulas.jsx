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

      {/* Multi-workflow + installation rollup explanation */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
        <h4 className="font-bold text-slate-900 mb-1">Project Rollup (Multi-Workflow + Install)</h4>
        <p>A vinyl project can contain <b>multiple Workflows</b>. Each workflow has its own vinyl, laminate,
        machine selections, parts, and its own roll layout — the math below is run independently per workflow.</p>
        <p className="font-mono bg-white border border-slate-200 rounded px-2 py-1">
          Project Total = Σ(workflow material + machine + labor) + Equipment + Personnel + Travel + Supplies + Markup
        </p>
        <p><b>Rotate toggle:</b> forces the part's orientation on the roll. OFF (default) = native (W on the
        roll width axis). ON = rotated 90° (H becomes the width on the roll). The checkbox is automatically
        disabled when rotation isn't geometrically possible (part height &gt; usable roll width).</p>
        <p><b>Bleed:</b> bleed does NOT change the part's printed/cut size. It reserves an empty "waste halo"
        around the part on the roll (so the placed footprint = part + 2×bleed each axis). Print area, cut
        perimeter, and ink cost are based on the inner part size, never inflated by bleed.</p>
        <p><b>Drag & Drop on Roll Layout:</b> you can click + drag any placed part along its shelf to manually
        reposition it. Drags are clamped to the usable column edges and respect the H gutter against neighbors.
        Editing the parts list resets manual positions.</p>
        <p><b>Travel:</b> shared with the Channel Letter Install travel calculator —
        Fuel + Travel Labor + Vehicle Overhead, floored by Min Travel Charge.</p>
      </div>

      {/* New per-part costing + stock + yield formulas */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-2">
        <h4 className="font-bold text-blue-900 mb-1">Per-Part Cost Allocation</h4>
        <p>The workflow total is allocated down to each part by its share of total used area (and perimeter for cut cost):</p>
        <p className="font-mono bg-white border border-blue-200 rounded px-2 py-1">
          part_vinyl_cost = workflow_vinyl_cost × (part_sqIn / total_used_sqIn)
        </p>
        <p className="font-mono bg-white border border-blue-200 rounded px-2 py-1">
          part_cut_cost = (cut_machine + blade) × (part_perimeter / total_perimeter)
        </p>
        <p className="font-mono bg-white border border-blue-200 rounded px-2 py-1">
          cost_each = part_total_cost / parts_placed
        </p>

        <h4 className="font-bold text-blue-900 mt-2 mb-1">Yield Metric (per workflow)</h4>
        <p className="font-mono bg-white border border-blue-200 rounded px-2 py-1">
          yield % = used_sqft / total_roll_sqft_pulled × 100<br/>
          waste % = 100 − yield %<br/>
          cost_per_sqft = workflow_total_cost / used_sqft
        </p>

        <h4 className="font-bold text-blue-900 mt-2 mb-1">Stock / Multi-Roll Check</h4>
        <p className="font-mono bg-white border border-blue-200 rounded px-2 py-1">
          rolls_needed = length_consumed_in / (roll_length_yards × 36)<br/>
          full_rolls_needed = ⌈ rolls_needed ⌉
        </p>
        <p>If <code>rolls_needed &gt; 1</code>, the project is flagged as a multi-roll job (each additional roll incurs its own
        leading/trailing edge waste, accounted for via total pulled length).</p>

        <h4 className="font-bold text-blue-900 mt-2 mb-1">Alternative Vinyl Comparison</h4>
        <p>"If you used vinyl B" cost is computed by re-pricing the SAME pulled area at vinyl B's $/sqft:</p>
        <p className="font-mono bg-white border border-blue-200 rounded px-2 py-1">
          alt_cost = total_pulled_sqft × (alt_vinyl $/sqft) × (1 + alt_waste_factor)
        </p>
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

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1 text-amber-900">
            <h4 className="font-bold text-amber-900 mb-1 flex items-center gap-1"><Scissors className="w-3.5 h-3.5" /> Transfer Tape (Cut Workflows Only)</h4>
            <p>Available only when <b>Cut</b> is applied to a workflow. Pick any roll whose category
              is <code>transfer_tape</code> or <code>application_tape</code> from Vinyl Inventory.</p>
            <p className="font-mono bg-white border border-amber-200 rounded px-2 py-1">
              tt_sqft = length_consumed × min(tt_roll_width, effective_roll_width) / 144<br/>
              tt_cost = tt_sqft × tt_$/sqft × (1 + tt_waste_%)
            </p>
            <p>No machine time is charged for tape application — it's a hand step. Labor for taping
              is captured by the workflow's <b>Weeding Difficulty</b> selector (job-level, not stored
              on the vinyl).</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 text-slate-800">
            <h4 className="font-bold text-slate-900 mb-1">Inventory Cleanup</h4>
            <p>Removed from vinyl inventory: <b>MOQ</b>, <b>Yield Factor</b> (now derived from
              actual nesting), and <b>Weeding Difficulty</b> (moved to the workflow card under
              "Cutting Extras" — same vinyl can be easy or hard to weed depending on artwork detail).</p>
            <p>Finish &amp; Adhesive Type now display with capitalized labels (e.g. "High Tack",
              "Carbon Fiber") via shared label maps.</p>
          </div>

          <div className="bg-slate-800 text-white p-3 rounded text-xs space-y-1">
            <h4 className="font-medium mb-1">Final Totals</h4>
            <div className="flex justify-between"><span>Vinyl:</span><span>${calc.vinylCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Laminate:</span><span>${calc.laminateCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Transfer Tape:</span><span>${(calc.transferTapeCost || 0).toFixed(2)}</span></div>
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