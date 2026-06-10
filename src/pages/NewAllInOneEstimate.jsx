import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPageUrl } from "@/utils";
import { Layers, Plus, Save, Loader2, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  ESTIMATOR_MODULES,
  ESTIMATOR_MODULES_BY_KEY,
  getModuleEntity,
  getModuleTotal,
} from "@/components/allInOne/estimatorRegistry";
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

// Strip transient UI fields + built-in record fields before persisting
const cleanItems = (items) => items.map(({ missing, ...li }) => li);
const stripBuiltins = ({ id, created_date, updated_date, created_by_id, created_by, ...rest }) => rest;
const sumItems = (items) => items.reduce((s, li) => s + (Number(li.total_snapshot) || 0), 0);

export default function NewAllInOneEstimate() {
  const { toast } = useToast();
  const [project, setProject] = useState(EMPTY_PROJECT);
  const [editId, setEditId] = useState(null);
  const editIdRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addingKey, setAddingKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Persist the estimate (create on first save) and return its id.
  const persist = useCallback(async (proj) => {
    const payload = {
      ...stripBuiltins(proj),
      line_items: cleanItems(proj.line_items || []),
      total_cost: sumItems(proj.line_items || []),
      status: (proj.line_items || []).length > 0 ? "calculated" : proj.status,
    };
    if (editIdRef.current) {
      await base44.entities.AllInOneEstimate.update(editIdRef.current, payload);
      return editIdRef.current;
    }
    const created = await base44.entities.AllInOneEstimate.create(payload);
    editIdRef.current = created.id;
    setEditId(created.id);
    window.history.replaceState({}, "", `${createPageUrl("NewAllInOneEstimate")}?edit=${created.id}`);
    return created.id;
  }, []);

  // Re-fetch every section from its source entity and sync names + totals.
  // Silently persists the refreshed totals so the projects list stays current.
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
          return { ...li, missing: true };
        }
      })
    );
    setProject((prev) => ({ ...prev, line_items: updated }));
    if (editIdRef.current) {
      await base44.entities.AllInOneEstimate.update(editIdRef.current, {
        line_items: cleanItems(updated),
        total_cost: sumItems(updated),
      });
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get("edit") || urlParams.get("id");
      if (id) {
        const existing = await base44.entities.AllInOneEstimate.get(id);
        if (existing) {
          editIdRef.current = existing.id;
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

  // ---- LIVE SYNC: subscribe to every module entity that has a section here.
  // Saving a sub-estimate anywhere in the app instantly updates this total.
  const moduleKeys = useMemo(
    () => [...new Set(project.line_items.map((li) => li.module_key))].join(","),
    [project.line_items]
  );
  useEffect(() => {
    if (!moduleKeys) return;
    const unsubs = moduleKeys
      .split(",")
      .map((key) => {
        const mod = ESTIMATOR_MODULES_BY_KEY[key];
        if (!mod) return null;
        return getModuleEntity(mod).subscribe((event) => {
          setProject((prev) => {
            const idx = prev.line_items.findIndex(
              (li) => li.project_id === event.id && li.module_key === key
            );
            if (idx === -1) return prev;
            const items = [...prev.line_items];
            items[idx] =
              event.type === "delete"
                ? { ...items[idx], missing: true }
                : {
                    ...items[idx],
                    project_name: event.data?.project_name ?? items[idx].project_name,
                    client_name: event.data?.client_name ?? items[idx].client_name,
                    total_snapshot: getModuleTotal(mod, event.data || {}),
                    missing: false,
                  };
            return { ...prev, line_items: items };
          });
        });
      })
      .filter(Boolean);
    return () => unsubs.forEach((u) => u());
  }, [moduleKeys]);

  const grandTotal = useMemo(() => sumItems(project.line_items), [project.line_items]);

  const updateField = (field, value) => setProject((prev) => ({ ...prev, [field]: value }));

  // ---- BUILD A SECTION: create a real sub-estimate in the module's own
  // entity, link it as an owned section, and jump into the full estimator.
  const handleAddSection = async (mod) => {
    if (!project.project_name || !project.client_name) {
      toast({
        title: "Name it first",
        description: "Enter a project name and client name before adding sections.",
        variant: "destructive",
      });
      return;
    }
    setAddingKey(mod.key);
    try {
      const sameModuleCount = project.line_items.filter((li) => li.module_key === mod.key).length;
      const suffix = sameModuleCount > 0 ? ` ${sameModuleCount + 1}` : "";
      const draft = await getModuleEntity(mod).create({
        project_name: `${project.project_name} — ${mod.shortName}${suffix}`,
        client_name: project.client_name,
        estimate_number: project.estimate_number || "",
        hyperlink: project.hyperlink || "",
        status: "draft",
      });
      const nextItems = [
        ...project.line_items,
        {
          module_key: mod.key,
          project_id: draft.id,
          project_name: draft.project_name,
          client_name: project.client_name,
          total_snapshot: 0,
          owned: true,
          linked_date: new Date().toISOString(),
        },
      ];
      const aioId = await persist({ ...project, line_items: nextItems });
      // Jump into the module's real estimator, carrying the All-In-One context
      window.location.href =
        `${createPageUrl(mod.newEstimatePage)}?${mod.editParam}=${draft.id}` +
        `&aio=${aioId}&aio_name=${encodeURIComponent(project.project_name)}`;
    } catch (e) {
      setAddingKey(null);
      toast({ title: "Couldn't create section", description: e.message, variant: "destructive" });
    }
  };

  const handleEditSection = (item) => {
    const mod = ESTIMATOR_MODULES_BY_KEY[item.module_key];
    if (!mod || !editIdRef.current) return;
    window.location.href =
      `${createPageUrl(mod.newEstimatePage)}?${mod.editParam}=${item.project_id}` +
      `&aio=${editIdRef.current}&aio_name=${encodeURIComponent(project.project_name)}`;
  };

  const handleRemoveSection = async (idx) => {
    const item = project.line_items[idx];
    if (!item) return;
    if (item.owned && !item.missing) {
      const mod = ESTIMATOR_MODULES_BY_KEY[item.module_key];
      if (!confirm(`Remove this section? The underlying ${mod?.shortName || ""} sub-estimate will also be deleted.`)) return;
      try {
        await getModuleEntity(mod).delete(item.project_id);
      } catch {
        // Sub-estimate already gone — still remove the section row
      }
    } else if (!confirm("Remove this section from the combined estimate?")) {
      return;
    }
    const items = project.line_items.filter((_, i) => i !== idx);
    setProject((prev) => ({ ...prev, line_items: items }));
    if (editIdRef.current) {
      await base44.entities.AllInOneEstimate.update(editIdRef.current, {
        line_items: cleanItems(items),
        total_cost: sumItems(items),
      });
    }
  };

  const handleSave = async () => {
    if (!project.project_name || !project.client_name) {
      toast({ title: "Missing details", description: "Project name and client name are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    await persist(project);
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
            <p className="text-slate-600">Build a multi-trade estimate using every estimator in the app — each section is a full estimate</p>
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

            {/* Build sections — rendered from the registry, future estimators appear automatically */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Build Sections</CardTitle>
                <p className="text-sm text-slate-500">
                  Click a module to add that estimator as a section — it opens the full estimator,
                  and everything you build there rolls into this combined total automatically.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {ESTIMATOR_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    const count = project.line_items.filter((li) => li.module_key === mod.key).length;
                    const isAdding = addingKey === mod.key;
                    return (
                      <button
                        key={mod.key}
                        onClick={() => handleAddSection(mod)}
                        disabled={!!addingKey}
                        className={`${mod.colors.bg} rounded-xl p-3 flex flex-col gap-2 text-left transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:shadow-none disabled:hover:translate-y-0`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${mod.colors.text} flex-shrink-0`} />
                          <span className="text-xs font-semibold text-slate-900 leading-tight">{mod.shortName}</span>
                          {count > 0 && (
                            <span className="ml-auto text-[10px] font-bold bg-white rounded-full px-1.5 py-0.5 text-slate-700">{count}</span>
                          )}
                        </div>
                        <span className={`mt-auto text-xs font-semibold ${mod.colors.text} flex items-center gap-1`}>
                          {isAdding ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Creating…</>
                          ) : (
                            <><Plus className="w-3 h-3" /> Add Section</>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-start gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-900">
                    Each section is a real estimate in that module — built with its full estimator,
                    all its formulas, inventories, and settings. Edit a section any time; totals here
                    update live whenever a section is saved.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Estimate Sections ({project.line_items.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {project.line_items.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">
                    No sections yet — name the project above, then click a module to start building.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {project.line_items.map((item, idx) => (
                      <LinkedEstimateRow
                        key={`${item.module_key}-${item.project_id}-${idx}`}
                        item={item}
                        onEdit={() => handleEditSection(item)}
                        onRemove={() => handleRemoveSection(idx)}
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
    </div>
  );
}