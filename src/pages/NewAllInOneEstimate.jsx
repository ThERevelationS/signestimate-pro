import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPageUrl } from "@/utils";
import { Layers, Plus, Save, Loader2, Radio } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  ESTIMATOR_MODULES,
  ESTIMATOR_MODULES_BY_KEY,
  getModuleEntity,
  getModuleTotal,
} from "@/components/allInOne/estimatorRegistry";
import LinkedEstimateRow from "@/components/allInOne/LinkedEstimateRow";
import EstimatorSectionPanel from "@/components/allInOne/EstimatorSectionPanel";
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

const stripUi = (items) => items.map(({ missing, ...li }) => li);
const sumItems = (items) => items.reduce((s, li) => s + (Number(li.total_snapshot) || 0), 0);

// ============================================================================
// All-In-One Estimator — a WORKSPACE, not a project linker.
// Each "Build" button creates a dedicated sub-estimate (owned by this estimate)
// in that module's own entity and opens that module's FULL estimator. Saving
// there flows the total back here automatically:
//   - totals refresh from the source projects every time this page loads
//   - real-time subscriptions update totals live while this page is open
//   - refreshed totals are persisted, so the saved record never goes stale
// ============================================================================
export default function NewAllInOneEstimate() {
  const { toast } = useToast();
  const [project, setProject] = useState(EMPTY_PROJECT);
  const [editId, setEditId] = useState(null);
  const [addingKey, setAddingKey] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [openSection, setOpenSection] = useState(null);

  // Refs keep async callbacks (subscriptions, focus) on the latest state.
  const editIdRef = useRef(null);
  const projectRef = useRef(project);
  useEffect(() => { editIdRef.current = editId; }, [editId]);
  useEffect(() => { projectRef.current = project; }, [project]);

  // Re-fetch every section from its source entity and sync names + totals.
  // Persists the refreshed totals so the saved record always matches reality.
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
          // Source estimate was deleted — keep the row visible with a warning.
          return { ...li, missing: true };
        }
      })
    );
    setProject((prev) => ({ ...prev, line_items: updated }));
    if (editIdRef.current) {
      await base44.entities.AllInOneEstimate.update(editIdRef.current, {
        line_items: stripUi(updated),
        total_cost: sumItems(updated),
      });
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      // "aio" takes priority — while a section is open inline, "edit"/"id"
      // in the URL belong to the embedded sub-estimate, not this estimate.
      const id = urlParams.get("aio") || urlParams.get("edit") || urlParams.get("id");
      if (id) {
        const existing = await base44.entities.AllInOneEstimate.get(id);
        if (existing) {
          setEditId(existing.id);
          editIdRef.current = existing.id;
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

  // LIVE SYNC — subscribe to every module entity that has a section here.
  // Any save inside a sub-estimator instantly updates this combined estimate.
  const subKey = project.line_items.map((li) => `${li.module_key}:${li.project_id}`).join("|");
  useEffect(() => {
    const items = projectRef.current.line_items;
    if (!items || items.length === 0) return;
    const ids = new Set(items.map((li) => li.project_id));
    const entityNames = [...new Set(
      items.map((li) => ESTIMATOR_MODULES_BY_KEY[li.module_key]?.entityName).filter(Boolean)
    )];
    const unsubs = entityNames.map((name) =>
      base44.entities[name].subscribe((event) => {
        if (ids.has(event.id)) refreshTotals(projectRef.current.line_items);
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [subKey, refreshTotals]);

  // Also re-sync when the user comes back to this tab from a sub-estimator.
  useEffect(() => {
    const onFocus = () => refreshTotals(projectRef.current.line_items);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshTotals]);

  const grandTotal = useMemo(() => sumItems(project.line_items), [project.line_items]);

  const updateField = (field, value) => setProject((prev) => ({ ...prev, [field]: value }));

  // Create or update the AllInOneEstimate record with the given line items.
  const persist = async (items) => {
    const payload = {
      ...projectRef.current,
      line_items: stripUi(items),
      total_cost: sumItems(items),
      status: items.length > 0 ? "calculated" : projectRef.current.status,
    };
    if (editIdRef.current) {
      await base44.entities.AllInOneEstimate.update(editIdRef.current, payload);
      return editIdRef.current;
    }
    const created = await base44.entities.AllInOneEstimate.create(payload);
    setEditId(created.id);
    editIdRef.current = created.id;
    return created.id;
  };

  // ---- INLINE SECTION EDITING ----
  // Embedded estimator pages read their project id from URL params on mount,
  // so we swap the URL (replaceState — NO navigation) before mounting the
  // module's full page component right here inside this page.
  const openSectionInline = (item, aioIdOverride) => {
    const mod = ESTIMATOR_MODULES_BY_KEY[item.module_key];
    const aioId = aioIdOverride || editIdRef.current;
    if (!mod) return;
    window.history.replaceState(
      {}, "",
      `${createPageUrl("NewAllInOneEstimate")}?aio=${aioId}&${mod.editParam}=${item.project_id}`
    );
    setOpenSection(item);
    window.scrollTo(0, 0);
  };

  const closeSection = () => {
    window.history.replaceState(
      {}, "",
      `${createPageUrl("NewAllInOneEstimate")}?edit=${editIdRef.current}`
    );
    setOpenSection(null);
    refreshTotals(projectRef.current.line_items);
    window.scrollTo(0, 0);
  };

  // Build a new section: create an owned sub-estimate in the module's own
  // entity, save this estimate, then load the module's FULL estimator inline.
  const handleAddSection = async (mod) => {
    if (!project.project_name || !project.client_name) {
      toast({
        title: "Name it first",
        description: "Enter the project name and client name, then add sections.",
        variant: "destructive",
      });
      return;
    }
    setAddingKey(mod.key);
    const sectionNum = project.line_items.filter((li) => li.module_key === mod.key).length + 1;
    const sub = await getModuleEntity(mod).create({
      project_name: `${project.project_name} — ${mod.shortName}${sectionNum > 1 ? ` ${sectionNum}` : ""}`,
      client_name: project.client_name,
      estimate_number: project.estimate_number || "",
      hyperlink: project.hyperlink || "",
      status: "draft",
    });
    const items = [
      ...project.line_items,
      {
        module_key: mod.key,
        project_id: sub.id,
        project_name: sub.project_name,
        client_name: sub.client_name,
        total_snapshot: 0,
        owned: true,
        linked_date: new Date().toISOString(),
      },
    ];
    setProject((prev) => ({ ...prev, line_items: items }));
    projectRef.current = { ...projectRef.current, line_items: items };
    const aioId = await persist(items);
    setAddingKey(null);
    openSectionInline({ module_key: mod.key, project_id: sub.id, project_name: sub.project_name }, aioId);
  };

  // Remove a section. Owned sections also delete their underlying sub-estimate.
  const handleRemove = async (index) => {
    const item = project.line_items[index];
    if (!item) return;
    if (item.owned) {
      const ok = confirm(
        `Remove this section? The underlying "${item.project_name}" sub-estimate will also be permanently deleted.`
      );
      if (!ok) return;
      const mod = ESTIMATOR_MODULES_BY_KEY[item.module_key];
      if (mod && !item.missing) {
        try {
          await getModuleEntity(mod).delete(item.project_id);
        } catch {
          // Already gone — nothing to do.
        }
      }
    }
    const items = project.line_items.filter((_, i) => i !== index);
    setProject((prev) => ({ ...prev, line_items: items }));
    projectRef.current = { ...projectRef.current, line_items: items };
    if (editIdRef.current) await persist(items);
  };

  const handleSave = async () => {
    if (!project.project_name || !project.client_name) {
      toast({ title: "Missing details", description: "Project name and client name are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    await persist(project.line_items);
    // Share project info with every built section — truly one project.
    await Promise.all(
      project.line_items
        .filter((li) => li.owned && !li.missing)
        .map((li) => {
          const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
          if (!mod) return null;
          return getModuleEntity(mod)
            .update(li.project_id, {
              client_name: project.client_name,
              estimate_number: project.estimate_number || "",
              hyperlink: project.hyperlink || "",
            })
            .catch(() => {});
        })
    );
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

  // A section is open — show the module's FULL estimator inline on this page.
  // Live-sync subscriptions stay active, so the combined totals keep updating.
  if (openSection) {
    return <EstimatorSectionPanel item={openSection} onClose={closeSection} />;
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
            <p className="text-slate-600">
              Build a multifaceted estimate — every section opens the full estimator and rolls back into one total
            </p>
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

            {/* Build sections — rendered from the registry, so future estimators appear automatically */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">Build Sections</CardTitle>
                <p className="text-sm text-slate-500">
                  Each section loads that module's <b>full estimator right here on this page</b> —
                  no navigating away, no separate projects. Save the section and its total flows
                  back into the combined estimate automatically.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {ESTIMATOR_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    const count = project.line_items.filter((li) => li.module_key === mod.key).length;
                    const adding = addingKey === mod.key;
                    return (
                      <button
                        key={mod.key}
                        onClick={() => handleAddSection(mod)}
                        disabled={!!addingKey}
                        className={`${mod.colors.bg} rounded-xl p-3 flex flex-col gap-2 text-left border border-transparent hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-60`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${mod.colors.text} flex-shrink-0`} />
                          <span className="text-xs font-semibold text-slate-900 leading-tight">{mod.shortName}</span>
                          {count > 0 && (
                            <span className="ml-auto text-[10px] font-bold bg-white rounded-full px-1.5 py-0.5 text-slate-700">{count}</span>
                          )}
                        </div>
                        <span className={`mt-auto inline-flex items-center text-xs font-medium ${mod.colors.text}`}>
                          {adding ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Creating section…</>
                          ) : (
                            <><Plus className="w-3 h-3 mr-1" /> Build Estimate</>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Estimate Sections ({project.line_items.length})</CardTitle>
                {project.line_items.length > 0 && (
                  <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 flex items-center gap-1.5">
                    <Radio className="w-3 h-3" /> Live-synced with source estimators
                  </span>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                {project.line_items.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">
                    No sections yet — use the module cards above to start building this estimate.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {project.line_items.map((item, idx) => (
                      <LinkedEstimateRow
                        key={`${item.module_key}-${item.project_id}-${idx}`}
                        item={item}
                        onEdit={() => openSectionInline(item)}
                        onRemove={() => handleRemove(idx)}
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