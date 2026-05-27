// One vinyl workflow card.
// Upgrades:
//   #1  Manual part order toggle (override NFDH height-sort)
//   #5  Workflow preset bar
//   #6  Stock usage warning
//   #14 Color tag in header
//   #16 Apply / save template button
//   #19 Per-part cost passed into the parts table
//   #20 + #21 Yield/margin badge in header
//   #22 Vinyl comparison panel
//   #33 Tab-level "issue" dot via _hasIssues

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sliders } from "lucide-react";

import VinylMaterialPicker from "./VinylMaterialPicker";
import VinylMachinePicker from "./VinylMachinePicker";
import VinylPartsTable from "./VinylPartsTable";
import VinylRollVisualizer from "./VinylRollVisualizer";
import VinylPresetBar from "./VinylPresetBar";
import VinylStockWarning from "./VinylStockWarning";
import VinylAlternativeCompare from "./VinylAlternativeCompare";
import VinylWorkflowTemplatesDialog from "./VinylWorkflowTemplatesDialog";
import VinylWorkflowCardHeader, { COLOR_SWATCHES } from "./VinylWorkflowCardHeader";
import { calculateVinylProject } from "./vinylNestingCalculator";
import { applyPresetToWorkflow } from "./vinylWorkflowPresets";
import {
  computePerPartCosts, computeWorkflowMetrics, computeStockUsage,
} from "./vinylCostHelpers";

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export default function VinylWorkflowCard({
  workflow, index, vinyls, machines,
  onChange, onRemove, onDuplicate, onMovePartToWorkflow,
  installEnvironment = "exterior",
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templatesMode, setTemplatesMode] = useState("apply");
  const [recommendOnly, setRecommendOnly] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  // Respond to parent expand/collapse-all toggle
  useEffect(() => { setOpen(defaultOpen); }, [defaultOpen]);

  const set = (patch) => onChange({ ...workflow, ...patch });

  const printer   = useMemo(() => machines.find(m => m.id === workflow.printer_id)   || null, [machines, workflow.printer_id]);
  const cutter    = useMemo(() => machines.find(m => m.id === workflow.cutter_id)    || null, [machines, workflow.cutter_id]);
  const laminator = useMemo(() => machines.find(m => m.id === workflow.laminator_id) || null, [machines, workflow.laminator_id]);
  const vinyl     = useMemo(() => vinyls.find(v => v.id === workflow.vinyl_id)    || null, [vinyls, workflow.vinyl_id]);
  const laminate  = useMemo(() => vinyls.find(v => v.id === workflow.laminate_id) || null, [vinyls, workflow.laminate_id]);

  const operatorRate = printer?.operator_hourly_rate ?? cutter?.operator_hourly_rate ?? laminator?.operator_hourly_rate ?? 45;

  const calc = useMemo(() => calculateVinylProject({
    items: workflow.items || [],
    printer, cutter, laminator,
    vinyl, laminate,
    operatorHourlyRate: operatorRate,
    applyPrint: !!workflow.apply_print,
    applyCut: !!workflow.apply_cut,
    applyLaminate: !!workflow.apply_laminate,
    overrideGutterH: workflow.gutter_h_override === "" || workflow.gutter_h_override == null ? undefined : num(workflow.gutter_h_override),
    overrideGutterV: workflow.gutter_v_override === "" || workflow.gutter_v_override == null ? undefined : num(workflow.gutter_v_override),
  }), [
    workflow.items, workflow.apply_print, workflow.apply_cut, workflow.apply_laminate,
    workflow.gutter_h_override, workflow.gutter_v_override,
    printer, cutter, laminator, vinyl, laminate, operatorRate,
  ]);

  // Drag-and-drop: a per-item manual x override that the calculator doesn't know about
  // but we apply on the placed shelves directly for visual rendering. Stored in a
  // workflow.items[].manual_layout = { x } map.
  const calcWithManualPositions = useMemo(() => {
    if (!workflow.manual_positions) return calc;
    const shelves = calc.shelves.map((sh, sIdx) => ({
      ...sh,
      items: sh.items.map((it, iIdx) => {
        const key = `${sIdx}-${iIdx}`;
        const override = workflow.manual_positions[key];
        return override !== undefined ? { ...it, x: override } : it;
      }),
    }));
    return { ...calc, shelves };
  }, [calc, workflow.manual_positions]);

  const handleItemMove = ({ shelfIdx, itemIdx, x }) => {
    const key = `${shelfIdx}-${itemIdx}`;
    set({
      manual_positions: { ...(workflow.manual_positions || {}), [key]: x },
    });
  };

  // Per-part cost rollup — Feature #19
  const perPartCosts = useMemo(() => computePerPartCosts(calc, workflow.items || []), [calc, workflow.items]);
  // Yield / cost metrics — Feature #20, #21
  const metrics    = useMemo(() => computeWorkflowMetrics(calc), [calc]);
  // Stock usage — Feature #6, #37
  const stockUsage = useMemo(() => computeStockUsage(calc, vinyl), [calc, vinyl]);

  // Surface calc back up so the project rollup can sum across workflows.
  useEffect(() => {
    const hasIssues = calc.partsUnplaced > 0 || !workflow.vinyl_id;
    if (workflow._calc?.totalCost !== calc.totalCost
     || workflow._calc?.materialCost !== calc.materialCost
     || workflow._hasIssues !== hasIssues) {
      onChange({ ...workflow, _calc: calc, _hasIssues: hasIssues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc.totalCost, calc.materialCost, calc.machineCost, calc.laborCost, calc.partsUnplaced, workflow.vinyl_id]);

  const colorTag = workflow.color_tag || COLOR_SWATCHES[index % COLOR_SWATCHES.length];

  return (
    <Card
      className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ borderLeft: `4px solid ${colorTag}` }}
    >
      <VinylWorkflowCardHeader
        workflow={workflow}
        index={index}
        vinyl={vinyl}
        calc={calc}
        metrics={metrics}
        colorTag={colorTag}
        open={open}
        onToggleOpen={() => setOpen(!open)}
        onChange={set}
        onSaveTemplate={() => { setTemplatesMode("save"); setTemplatesOpen(true); }}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
      />

      {open && (
        <CardContent className="space-y-4 pt-2 border-t border-slate-100">
          {/* Preset bar — Feature #5 */}
          <VinylPresetBar
            activePresetKey={workflow.preset_key}
            onApply={(preset) => set({ ...applyPresetToWorkflow(preset) })}
          />

          <VinylMaterialPicker
            vinyls={vinyls}
            vinylId={workflow.vinyl_id}
            laminateId={workflow.laminate_id}
            applyLaminate={!!workflow.apply_laminate}
            presetKey={workflow.preset_key}
            installEnvironment={installEnvironment}
            recommendOnly={recommendOnly}
            onChange={({ vinylId, laminateId, applyLaminate, recommendOnly: ro }) => {
              if (ro !== undefined) setRecommendOnly(ro);
              if (vinylId !== undefined || laminateId !== undefined || applyLaminate !== undefined) {
                set({
                  vinyl_id: vinylId,
                  laminate_id: laminateId || "",
                  apply_laminate: !!applyLaminate,
                });
              }
            }}
          />

          {/* Stock check — Feature #6 & #37 */}
          {stockUsage && <VinylStockWarning stockUsage={stockUsage} vinyl={vinyl} />}

          {/* Compare to other vinyls — Feature #22 */}
          {vinyl && calc.vinylCost > 0 && (
            <div>
              <button onClick={() => setShowCompare(s => !s)} className="text-[11px] underline text-blue-600">
                {showCompare ? "Hide" : "Show"} cost comparison vs other vinyls
              </button>
              {showCompare && (
                <div className="mt-2">
                  <VinylAlternativeCompare calc={calc} currentVinyl={vinyl} vinyls={vinyls} />
                </div>
              )}
            </div>
          )}

          <VinylMachinePicker
            machines={machines}
            value={{
              printer_id:   workflow.printer_id,
              cutter_id:    workflow.cutter_id,
              laminator_id: workflow.laminator_id,
              applyPrint:    !!workflow.apply_print,
              applyCut:      !!workflow.apply_cut,
              applyLaminate: !!workflow.apply_laminate,
            }}
            onChange={(v) => {
              const patch = {};
              if (v.printer_id   !== undefined) patch.printer_id   = v.printer_id;
              if (v.cutter_id    !== undefined) patch.cutter_id    = v.cutter_id;
              if (v.laminator_id !== undefined) patch.laminator_id = v.laminator_id;
              if (v.applyPrint    !== undefined) patch.apply_print    = v.applyPrint;
              if (v.applyCut      !== undefined) patch.apply_cut      = v.applyCut;
              if (v.applyLaminate !== undefined) patch.apply_laminate = v.applyLaminate;
              set(patch);
            }}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Parts in this workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <VinylPartsTable
                items={workflow.items || []}
                onChange={(items) => set({ items, manual_positions: {} })}
                perPartCosts={perPartCosts}
                usableWidth={calc.usableWidth}
                defaultBleed={workflow.apply_cut ? 0 : 0.125}
                onMoveToWorkflow={onMovePartToWorkflow ? (partIdx) => onMovePartToWorkflow(partIdx) : null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm">Roll Layout</CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">Gutter H</span>
                  <Input
                    type="number" step="0.0625"
                    placeholder={String(calc.gutterH)}
                    value={workflow.gutter_h_override ?? ""}
                    onChange={(e) => set({ gutter_h_override: e.target.value })}
                    className="h-7 w-16 text-xs tabular-nums"
                  />
                  <span className="text-slate-500">V</span>
                  <Input
                    type="number" step="0.0625"
                    placeholder={String(calc.gutterV)}
                    value={workflow.gutter_v_override ?? ""}
                    onChange={(e) => set({ gutter_v_override: e.target.value })}
                    className="h-7 w-16 text-xs tabular-nums"
                  />
                  {(workflow.gutter_h_override || workflow.gutter_v_override || workflow.manual_positions) && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => set({ gutter_h_override: "", gutter_v_override: "", manual_positions: {} })}>
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VinylRollVisualizer
                calc={calcWithManualPositions}
                showRegistrationMarks={workflow.apply_print && workflow.apply_cut}
                onItemMove={handleItemMove}
              />
            </CardContent>
          </Card>
        </CardContent>
      )}

      <VinylWorkflowTemplatesDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        mode={templatesMode}
        currentWorkflow={workflow}
        onApply={(patch) => set(patch)}
      />
    </Card>
  );
}