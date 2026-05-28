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
  // Tiered ink rates — DEFAULT is high_quality
  print_cost_per_sqin_draft: 0.012,
  print_cost_per_sqin_production: 0.018,
  print_cost_per_sqin_high_quality: 0.025,
  default_print_quality: "high_quality",
  print_speed_sqft_per_hour: 110,
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
    printQuality: "high_quality",     // default
    weedingDifficulty: "moderate",    // default (a.k.a. Normal)
    installMinutesPerPart: 0,
    spoilageBufferPercent: 0,
    setupFeeFloor: 0,
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

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs space-y-2 text-indigo-900">
            <h4 className="font-bold text-indigo-900 mb-1 flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> Print Quality Tiers (NEW)</h4>
            <p>Each printer carries 3 ink rates. The workflow picks one, defaulting to
              <b> High Quality</b>:</p>
            <p className="font-mono bg-white border border-indigo-200 rounded px-2 py-1">
              Draft        $/sqin → fast indoor proofs<br/>
              Production   $/sqin → standard outdoor<br/>
              High Quality $/sqin → premium / long-life (DEFAULT)
            </p>
            <p>ink_cost = used_sqIn × $/sqin_for_selected_quality</p>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs space-y-2 text-rose-900">
            <h4 className="font-bold text-rose-900 mb-1">Weeding Labor by Difficulty (NEW)</h4>
            <p>"Moderate" is the default (Normal). Each difficulty tier adds labor minutes
              <b> per placed part</b> when Cut is applied:</p>
            <p className="font-mono bg-white border border-rose-200 rounded px-2 py-1">
              very_easy 0.1 · easy 0.3 · moderate 0.6 · hard 1.2 · very_hard 2.5  (min/part)<br/>
              weeding_minutes = mins/part × parts_placed<br/>
              Can be overridden per workflow.
            </p>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-xs space-y-2 text-cyan-900">
            <h4 className="font-bold text-cyan-900 mb-1">Application / Install Labor (NEW)</h4>
            <p className="font-mono bg-white border border-cyan-200 rounded px-2 py-1">
              install_minutes = install_minutes_per_part × parts_placed
            </p>
            <p>Captures on-site application time (squeegeeing decals, wraps, etc.) separate
              from machine-run time.</p>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs space-y-2 text-indigo-900">
            <h4 className="font-bold text-indigo-900 mb-1">Per-Personnel Rates (NEW)</h4>
            <p>If the workflow has any personnel rows (Designer / Printer Op / Installer / …),
              labor cost uses those rows INSTEAD of operator-rate × minutes:</p>
            <p className="font-mono bg-white border border-indigo-200 rounded px-2 py-1">
              labor_cost = Σ(role.hourly_rate × role.hours)<br/>
              labor_hours = Σ(role.hours)
            </p>
            <p>Otherwise we fall back to: <code>operator_rate × (machine_run + weeding + install) min ÷ 60</code></p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-2 text-amber-900">
            <h4 className="font-bold text-amber-900 mb-1">Spoilage Buffer + Setup-Fee Floor (NEW)</h4>
            <p className="font-mono bg-white border border-amber-200 rounded px-2 py-1">
              effective_qty = ⌈ part_qty × (1 + spoilage_buffer_% / 100) ⌉  (pre-nesting)<br/>
              setup_fee_applied = max(0, setup_fee_floor − preFloorTotal)<br/>
              workflow_total = preFloorTotal + setup_fee_applied
            </p>
            <p>Spoilage inflates qty BEFORE nesting so the buffer parts get real roll real estate.
              The floor guarantees every workflow charges at least the minimum.</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs space-y-2 text-emerald-900">
            <h4 className="font-bold text-emerald-900 mb-1">Roll-Width Recommender (NEW)</h4>
            <p>Vinyls sharing a <code>product_group_key</code> are siblings — the same product in
              different widths. The estimator re-runs nesting for each candidate width and
              flags the cheapest viable option (one-click swap).</p>
            <p className="font-mono bg-white border border-emerald-200 rounded px-2 py-1">
              For each sibling: re-pack parts, compute total_cost.<br/>
              Pick min(total_cost) among siblings with partsUnplaced == 0.<br/>
              Suggest swap if (current − best) {">"} max($1, 2% of current).
            </p>
            <p>Auto-generated when you click "Duplicate" on an inventory row.</p>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs space-y-2 text-violet-900">
            <h4 className="font-bold text-violet-900 mb-1">Customer Pricing Tab (NEW)</h4>
            <p>Identical model to the Channel Letter and Concrete estimators — uses the shared
              MarkupTier × MarkupCategory engine. Vinyl line items are categorized as:</p>
            <p className="font-mono bg-white border border-violet-200 rounded px-2 py-1">
              Vinyl + Laminate + Tape + Ink + Blade + Supplies → substrates<br/>
              Printer + Cutter + Laminator machine time      → machine_time<br/>
              Operator + Designer + Installer labor          → inhouse_labor<br/>
              Install equipment rental                       → outsourced_services<br/>
              Travel                                         → outsourced_services
            </p>
            <p>customer_price = Σ(line.cost × tier_markup[category]) − volume_discount</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 text-slate-800">
            <h4 className="font-bold text-slate-900 mb-1">Artwork → Dimensions (Hybrid)</h4>
            <p>Upload SVG / PDF / AI / image. We try free metadata first (SVG viewBox, PDF
              MediaBox, image px+DPI). If none of those work, the "Use AI to detect dimensions"
              button runs vision via InvokeLLM and uses integration credits.</p>
          </div>

          <div className="bg-slate-800 text-white p-3 rounded text-xs space-y-1">
            <h4 className="font-medium mb-1">Final Totals — Demo</h4>
            <div className="flex justify-between"><span>Vinyl:</span><span>${calc.vinylCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Laminate:</span><span>${calc.laminateCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Transfer Tape:</span><span>${(calc.transferTapeCost || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Ink ({calc.printQuality}) + Blade:</span><span>${(calc.inkCost + calc.bladeCost).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Machine:</span><span>${calc.machineCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Labor (machine + weeding + install):</span><span>${calc.laborCost.toFixed(2)}</span></div>
            {calc.setupFeeApplied > 0 && (
              <div className="flex justify-between"><span>Setup-Fee Floor:</span><span>+${calc.setupFeeApplied.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-bold border-t border-slate-600 pt-1 mt-1">
              <span>Total:</span><span>${calc.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}