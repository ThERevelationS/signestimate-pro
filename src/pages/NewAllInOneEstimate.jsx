import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPageUrl } from "@/utils";
import { Layers, Plus, ExternalLink, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  ESTIMATOR_MODULES,
  ESTIMATOR_MODULES_BY_KEY,
  getModuleEntity,
  getModuleTotal,
} from "@/components/allInOne/estimatorRegistry";
import EstimatePickerDialog from "@/components/allInOne/EstimatePickerDialog";
import LinkedEstimateRow from "@/components/allInOne/LinkedEstimateRow";
import AllInOneSummaryCard from "@/components/allInOne/AllInOneSummaryCard";

const EMPTY_PROJECT = {
  project_name: "",
  client_name: "",
  estimate_number: "",
  hyperlink: "",
  status: "draft",
  line_items: [],
  notes: "",
};

export default function NewAllInOneEstimate() {
  const { toast } = useToast();
  const [project, setProject] = useState(EMPTY_PROJECT);
  const [editId, setEditId] = useState(null);
  const [pickerModule, setPickerModule] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Re-fetch every linked sub-estimate and sync names + totals from the source.
  const refreshTotals = useCallback(async (items) => {
    if (!items || items.length === 0) return;
    setRefreshing(true);
    const updated = await Promise.all(
      items.map(async (li) => {
        const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
        if (!mod) return li;
        try {
          const src = await getModuleEntity(mod).get(li.project_id);
          if (!src) return { ...li, missing: true };
          return {
            ...li,
            project_name: src.project_name,
            client_name: src.client_name,
            total_snapshot: getModuleTotal(mod, src),
            missing: false,
          };
        } catch {
          // Source estimate was deleted — keep the row visible with a warning
          // instead of crashing the whole combined estimate.
          return { ...li, missing: true };
        }
      })
    );
    setProject((prev) => ({ ...prev, line_items: updated }));
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get("edit") || urlParams.get("id");
      if (id) {
        const existing = await base44.entities.AllInOneEstimate.get(id);
        if (existing) {
          setEditId(existing.id);
          setProject({ ...EMPTY_PROJECT, ...existing });
          setIsLoading(false);
          refreshTotals(existing.line_items || []);
          return;
        }
      }
      setIsLoading(false);
    };
    load();
  }, [refreshTotals]);

  const grandTotal = useMemo(
    () => project.line_items.reduce((sum, li) => sum + (Number(li.total_snapshot) || 0), 0),
    [project.line_items]
  );

  const updateField = (field, value) => setProject((prev) => ({ ...prev, [field]: value }));

  const handlePick = (src) => {
    const mod = pickerModule;
    setProject((prev) => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          module_key: mod.key,
          project_id: src.id,
          project_name: src.project_name,
          client_name: src.client_name,
          total_snapshot: getModuleTotal(mod, src),
          linked_date: new Date().toISOString(),
        },
      ],
    }));
    setPickerModule(null);
  };

  const removeItem = (index) => {
    setProject((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!project.project_name || !project.client_name) {
      toast({ title: "Missing details", description: "Project name and client name are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const payload = {
      ...project,
      line_items: project.line_items.map(({ missing, ...li }) => li),
      total_cost: grandTotal,
      status: project.line_items.length > 0 ? "calculated" : project.status,
    };
    if (editId) {
      await base44.entities.AllInOneEstimate.update(editId, payload);
    } else {
      const created = await base44.entities.AllInOneEstimate.create(payload);
      setEditId(created.id);
    }
    setIsSaving(false);
    toast({ title: "Saved", description: "All-in-one estimate saved successfully." });
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading estimate...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Layers className="w-8 h-8 text-indigo-600" />
              {editId ? "Edit All-In-One Estimate" : "New All-In-One Estimate"}
            </h1>
            <p className="text-slate-600">Combine estimates from every module into one project total</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3">
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? "Saving…" : editId ? "Update Estimate" : "Save Estimate"}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Project details */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Project Name *</Label>
                  <Input value={project.project_name} onChange={(e) => updateField("project_name", e.target.value)} placeholder="e.g. Main St Pylon — Full Build" />
                </div>
                <div>
                  <Label>Client Name *</Label>
                  <Input value={project.client_name} onChange={(e) => updateField("client_name", e.target.value)} placeholder="Client name" />
                </div>
                <div>
                  <Label>Estimate #</Label>
                  <Input value={project.estimate_number} onChange={(e) => updateField("estimate_number", e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <Label>Hyperlink</Label>
                  <Input value={project.hyperlink} onChange={(e) => updateField("hyperlink", e.target.value)} placeholder="Optional reference link" />
                </div>
                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={project.notes || ""} onChange={(e) => updateField("notes", e.target.value)} className="h-20" placeholder="Project notes…" />
                </div>
              </CardContent>
            </Card>

            {/* Module grid — rendered from the registry, so future estimators appear automatically */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Add Estimates</CardTitle>
                <p className="text-sm text-slate-500">
                  Attach a saved estimate from any module, or open a module to create a new one, then attach it here.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {ESTIMATOR_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    const count = project.line_items.filter((li) => li.module_key === mod.key).length;
                    return (
                      <div key={mod.key} className={`${mod.colors.bg} rounded-xl p-3 flex flex-col gap-2`}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${mod.colors.text} flex-shrink-0`} />
                          <span className="text-xs font-semibold text-slate-900 leading-tight">{mod.shortName}</span>
                          {count > 0 && (
                            <span className="ml-auto text-[10px] font-bold bg-white rounded-full px-1.5 py-0.5 text-slate-700">{count}</span>
                          )}
                        </div>
                        <div className="flex gap-1.5 mt-auto">
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1 bg-white" onClick={() => setPickerModule(mod)}>
                            <Plus className="w-3 h-3 mr-1" /> Attach
                          </Button>
                          <a href={createPageUrl(mod.newEstimatePage)} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" title={`Create a new ${mod.shortName} estimate in a new tab`}>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Linked estimates */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Linked Estimates ({project.line_items.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {project.line_items.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">
                    Nothing attached yet — use the module cards above to attach saved estimates.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {project.line_items.map((item, idx) => (
                      <LinkedEstimateRow
                        key={`${item.module_key}-${item.project_id}-${idx}`}
                        item={item}
                        onRemove={() => removeItem(idx)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <AllInOneSummaryCard
              lineItems={project.line_items}
              grandTotal={grandTotal}
              onRefresh={() => refreshTotals(project.line_items)}
              refreshing={refreshing}
            />
          </div>
        </div>
      </div>

      {pickerModule && (
        <EstimatePickerDialog
          module={pickerModule}
          excludeIds={project.line_items.filter((li) => li.module_key === pickerModule.key).map((li) => li.project_id)}
          onPick={handlePick}
          onClose={() => setPickerModule(null)}
        />
      )}
    </div>
  );
}