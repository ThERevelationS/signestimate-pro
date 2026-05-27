// One vinyl workflow = one vinyl + optional laminate + chosen machines + its own parts.
// Renders the picker rows, the editable parts table, and the visual roll layout
// for THAT workflow. Each workflow has its own roll layout so different vinyls
// don't get mixed onto the same physical roll.

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Trash2, Copy, Sliders } from "lucide-react";

import VinylMaterialPicker from "./VinylMaterialPicker";
import VinylMachinePicker from "./VinylMachinePicker";
import VinylPartsTable from "./VinylPartsTable";
import VinylRollVisualizer from "./VinylRollVisualizer";
import { calculateVinylProject } from "./vinylNestingCalculator";

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

export default function VinylWorkflowCard({
  workflow, index, vinyls, machines,
  onChange, onRemove, onDuplicate,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const set = (patch) => onChange({ ...workflow, ...patch });

  // Resolved entities for this workflow
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
  }), [workflow.items, workflow.apply_print, workflow.apply_cut, workflow.apply_laminate, workflow.gutter_h_override, workflow.gutter_v_override, printer, cutter, laminator, vinyl, laminate, operatorRate]);

  // Surface calc back up so the project summary can sum across workflows
  useEffect(() => {
    if (workflow._calc?.totalCost !== calc.totalCost
     || workflow._calc?.materialCost !== calc.materialCost) {
      onChange({ ...workflow, _calc: calc });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc.totalCost, calc.materialCost, calc.machineCost, calc.laborCost]);

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
            {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            <CardTitle className="text-base truncate">
              {workflow.name || `Workflow ${index + 1}`}
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">{(workflow.items || []).length} part(s)</Badge>
            {vinyl && <Badge variant="outline" className="text-[10px]">{vinyl.vinyl_name}</Badge>}
            <Badge variant="outline" className="text-[10px] bg-slate-900 text-white border-slate-900">{fmt(calc.totalCost)}</Badge>
          </button>
          <div className="flex items-center gap-1">
            <Input
              value={workflow.name || ""}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={`Workflow ${index + 1} name`}
              className="h-8 text-sm w-44"
              onClick={(e) => e.stopPropagation()}
            />
            <Button variant="ghost" size="icon" onClick={onDuplicate} className="h-8 w-8" title="Duplicate workflow">
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-red-500 hover:bg-red-50" title="Delete workflow">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          <VinylMaterialPicker
            vinyls={vinyls}
            vinylId={workflow.vinyl_id}
            laminateId={workflow.laminate_id}
            applyLaminate={!!workflow.apply_laminate}
            onChange={({ vinylId, laminateId, applyLaminate }) => set({
              vinyl_id: vinylId,
              laminate_id: laminateId || "",
              apply_laminate: !!applyLaminate,
            })}
          />

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
              <VinylPartsTable items={workflow.items || []} onChange={(items) => set({ items })} />
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
                  {(workflow.gutter_h_override || workflow.gutter_v_override) && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => set({ gutter_h_override: "", gutter_v_override: "" })}>
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VinylRollVisualizer calc={calc} />
            </CardContent>
          </Card>
        </CardContent>
      )}
    </Card>
  );
}