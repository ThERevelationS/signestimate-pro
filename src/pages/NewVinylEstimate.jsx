// Full Vinyl Estimator — load/edit/save a VinylProject. Composes the parts
// table, machine pickers, vinyl + laminate picker, and the visual roll
// layout. The roll layout updates live as you edit any input.

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { VinylProject, VinylInventory, VinylMachine } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Droplets, Loader2, Sliders } from "lucide-react";

import VinylPartsTable from "@/components/vinylEstimator/VinylPartsTable";
import VinylMaterialPicker from "@/components/vinylEstimator/VinylMaterialPicker";
import VinylMachinePicker from "@/components/vinylEstimator/VinylMachinePicker";
import VinylRollVisualizer from "@/components/vinylEstimator/VinylRollVisualizer";
import VinylSummaryPanel from "@/components/vinylEstimator/VinylSummaryPanel";
import { calculateVinylProject } from "@/components/vinylEstimator/vinylNestingCalculator";

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const blankProject = () => ({
  project_name: "",
  client_name: "",
  estimate_number: "",
  hyperlink: "",
  site_address: "",
  status: "draft",
  items: [],
  printer_id: "",
  cutter_id: "",
  laminator_id: "",
  default_vinyl_id: "",
  default_laminate_id: "",
  supplies_percent_of_materials: 5,
  extra_supplies_cost: 0,
  markup_percent: 0,
  notes: "",
});

export default function NewVinylEstimate() {
  const [search] = useSearchParams();
  const projectId = search.get("id") || search.get("edit");
  const navigate = useNavigate();

  const [project, setProject] = useState(blankProject());
  const [vinyls, setVinyls] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyPrint, setApplyPrint] = useState(true);
  const [applyCut, setApplyCut] = useState(true);
  const [applyLaminate, setApplyLaminate] = useState(false);
  const [overrideGutterH, setOverrideGutterH] = useState("");
  const [overrideGutterV, setOverrideGutterV] = useState("");

  // Load everything in parallel
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vList, mList, p] = await Promise.all([
          VinylInventory.list("sort_order"),
          VinylMachine.list("sort_order"),
          projectId ? VinylProject.get(projectId) : Promise.resolve(null),
        ]);
        setVinyls(vList);
        setMachines(mList);

        if (p) {
          setProject({ ...blankProject(), ...p });
          setApplyLaminate(!!p.default_laminate_id);
        } else {
          // Pick sensible defaults on new estimates
          const defaultPrinter   = mList.find(m => m.is_default_for_type && (m.machine_type === "printer" || m.machine_type === "print_and_cut")) || mList.find(m => m.machine_type === "printer" || m.machine_type === "print_and_cut");
          const defaultCutter    = mList.find(m => m.is_default_for_type && (m.machine_type === "cutter"  || m.machine_type === "print_and_cut")) || mList.find(m => m.machine_type === "cutter" || m.machine_type === "print_and_cut");
          const defaultLaminator = mList.find(m => m.is_default_for_type && m.machine_type === "laminator") || mList.find(m => m.machine_type === "laminator");
          const defaultVinyl     = vList.find(v => v.is_active !== false && !v.is_laminate && v.show_in_vinyl_estimator !== false);
          setProject(prev => ({
            ...prev,
            printer_id:   defaultPrinter?.id   || "",
            cutter_id:    defaultCutter?.id    || "",
            laminator_id: defaultLaminator?.id || "",
            default_vinyl_id: defaultVinyl?.id || "",
            default_laminate_id: defaultVinyl?.default_laminate_id || "",
          }));
          setApplyLaminate(!!defaultVinyl?.requires_lamination);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [projectId]);

  // Resolved entities
  const printer   = useMemo(() => machines.find(m => m.id === project.printer_id)   || null, [machines, project.printer_id]);
  const cutter    = useMemo(() => machines.find(m => m.id === project.cutter_id)    || null, [machines, project.cutter_id]);
  const laminator = useMemo(() => machines.find(m => m.id === project.laminator_id) || null, [machines, project.laminator_id]);
  const vinyl     = useMemo(() => vinyls.find(v => v.id === project.default_vinyl_id)    || null, [vinyls, project.default_vinyl_id]);
  const laminate  = useMemo(() => vinyls.find(v => v.id === project.default_laminate_id) || null, [vinyls, project.default_laminate_id]);

  const operatorRate = printer?.operator_hourly_rate ?? cutter?.operator_hourly_rate ?? laminator?.operator_hourly_rate ?? 45;

  // Live calculation
  const calc = useMemo(() => calculateVinylProject({
    items: project.items || [],
    printer, cutter, laminator,
    vinyl, laminate,
    operatorHourlyRate: operatorRate,
    applyPrint, applyCut, applyLaminate,
    overrideGutterH: overrideGutterH === "" ? undefined : num(overrideGutterH),
    overrideGutterV: overrideGutterV === "" ? undefined : num(overrideGutterV),
  }), [project.items, printer, cutter, laminator, vinyl, laminate, operatorRate, applyPrint, applyCut, applyLaminate, overrideGutterH, overrideGutterV]);

  const personnelCost = (project.personnel || []).reduce((sum, p) => sum + num(p.total_cost), 0);

  const set = (patch) => setProject(prev => ({ ...prev, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const supplies = calc.materialCost * (num(project.supplies_percent_of_materials) / 100) + num(project.extra_supplies_cost);
      const subtotal = calc.totalCost + supplies + personnelCost;
      const markupAmt = subtotal * (num(project.markup_percent) / 100);
      const totalCost = subtotal + markupAmt;

      const payload = {
        ...project,
        status: "calculated",
        total_print_sqft: calc.usedSqFt,
        total_vinyl_sqft: calc.totalRollSqFtPulled,
        total_laminate_sqft: calc.laminateSqFt,
        total_vinyl_cost: calc.vinylCost,
        total_laminate_cost: calc.laminateCost,
        total_ink_cost: calc.inkCost,
        total_machine_cost: calc.machineCost,
        total_blade_cost: calc.bladeCost,
        total_supplies_cost: supplies,
        total_personnel_cost: personnelCost,
        labor_hours: calc.laborHours,
        labor_cost: calc.laborCost,
        base_supplies_cost: calc.materialCost * (num(project.supplies_percent_of_materials) / 100),
        subtotal,
        markup_amount: markupAmt,
        total_cost: totalCost,
      };

      let saved;
      if (projectId) {
        saved = await VinylProject.update(projectId, payload);
      } else {
        saved = await VinylProject.create(payload);
        navigate(`${createPageUrl("NewVinylEstimate")}?id=${saved.id}`, { replace: true });
      }
      setProject({ ...blankProject(), ...saved });
    } catch (e) {
      console.error(e);
      alert("Save failed: " + e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1500px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to={createPageUrl("VinylProjects")} className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Vinyl Projects
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-1">
              <Droplets className="w-6 h-6 text-blue-600" />
              {projectId ? "Edit" : "New"} Vinyl Estimate
            </h1>
          </div>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Estimate
          </Button>
        </div>

        {/* Project info */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Project Info</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-3">
            <div><Label className="text-xs">Project Name</Label><Input value={project.project_name} onChange={(e) => set({ project_name: e.target.value })} className="h-9" /></div>
            <div><Label className="text-xs">Client Name</Label><Input value={project.client_name} onChange={(e) => set({ client_name: e.target.value })} className="h-9" /></div>
            <div><Label className="text-xs">Estimate #</Label><Input value={project.estimate_number} onChange={(e) => set({ estimate_number: e.target.value })} className="h-9" /></div>
            <div><Label className="text-xs">Hyperlink</Label><Input value={project.hyperlink} onChange={(e) => set({ hyperlink: e.target.value })} className="h-9" /></div>
            <div className="md:col-span-4"><Label className="text-xs">Site Address</Label><Input value={project.site_address} onChange={(e) => set({ site_address: e.target.value })} className="h-9" /></div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left 2/3 — inputs */}
          <div className="lg:col-span-2 space-y-4">
            {/* Vinyl + Laminate */}
            <VinylMaterialPicker
              vinyls={vinyls}
              vinylId={project.default_vinyl_id}
              laminateId={project.default_laminate_id}
              applyLaminate={applyLaminate}
              onChange={({ vinylId, laminateId, applyLaminate: al }) => {
                set({ default_vinyl_id: vinylId, default_laminate_id: laminateId || "" });
                setApplyLaminate(!!al);
              }}
            />

            {/* Machines */}
            <VinylMachinePicker
              machines={machines}
              value={{
                printer_id:   project.printer_id,
                cutter_id:    project.cutter_id,
                laminator_id: project.laminator_id,
                applyPrint, applyCut, applyLaminate,
              }}
              onChange={(v) => {
                set({
                  printer_id:   v.printer_id   ?? project.printer_id,
                  cutter_id:    v.cutter_id    ?? project.cutter_id,
                  laminator_id: v.laminator_id ?? project.laminator_id,
                });
                if (v.applyPrint    !== undefined) setApplyPrint(v.applyPrint);
                if (v.applyCut      !== undefined) setApplyCut(v.applyCut);
                if (v.applyLaminate !== undefined) setApplyLaminate(v.applyLaminate);
              }}
            />

            {/* Parts table */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Parts</CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {calc.partsPlaced} placed · {calc.totalLengthIn ? `${(calc.totalLengthIn / 12).toFixed(2)} ft of layout` : "—"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <VinylPartsTable items={project.items || []} onChange={(items) => set({ items })} />
              </CardContent>
            </Card>

            {/* Layout Manager — the visual roll */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    Layout Manager
                    {vinyl && <Badge variant="outline" className="text-[10px]">{vinyl.vinyl_name}</Badge>}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs">
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Gutter H</span>
                    <Input
                      type="number" step="0.0625"
                      placeholder={String(calc.gutterH)}
                      value={overrideGutterH}
                      onChange={(e) => setOverrideGutterH(e.target.value)}
                      className="h-7 w-16 text-xs tabular-nums"
                    />
                    <span className="text-slate-500">V</span>
                    <Input
                      type="number" step="0.0625"
                      placeholder={String(calc.gutterV)}
                      value={overrideGutterV}
                      onChange={(e) => setOverrideGutterV(e.target.value)}
                      className="h-7 w-16 text-xs tabular-nums"
                    />
                    {(overrideGutterH !== "" || overrideGutterV !== "") && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setOverrideGutterH(""); setOverrideGutterV(""); }}>
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

            {/* Notes */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={project.notes || ""} onChange={(e) => set({ notes: e.target.value })} className="h-24" />
              </CardContent>
            </Card>
          </div>

          {/* Right 1/3 — summary */}
          <div className="lg:col-span-1">
            <VinylSummaryPanel
              calc={calc}
              vinyl={vinyl}
              laminate={applyLaminate ? laminate : null}
              printer={applyPrint ? printer : null}
              cutter={applyCut ? cutter : null}
              laminator={applyLaminate ? laminator : null}
              suppliesPercent={project.supplies_percent_of_materials}
              onSuppliesPercentChange={(v) => set({ supplies_percent_of_materials: v })}
              extraSupplies={project.extra_supplies_cost}
              onExtraSuppliesChange={(v) => set({ extra_supplies_cost: v })}
              markupPercent={project.markup_percent}
              onMarkupPercentChange={(v) => set({ markup_percent: v })}
              personnelCost={personnelCost}
            />
          </div>
        </div>
      </div>
    </div>
  );
}