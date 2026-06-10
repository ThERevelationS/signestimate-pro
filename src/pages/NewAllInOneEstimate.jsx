import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPageUrl } from "@/utils";
import {
  Layers, Save, RefreshCw, Link as LinkIcon, FileText, Hammer, PieChart, Package, Receipt,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fmtCurrency } from "@/lib/formatters";
import {
  ESTIMATOR_MODULES_BY_KEY,
  getModuleEntity,
  getModuleTotal,
  buildSharedPayload,
} from "@/components/allInOne/estimatorRegistry";
import { computeQuote } from "@/components/allInOne/aioPricing";
import EstimatorSectionPanel from "@/components/allInOne/EstimatorSectionPanel";
import AllInOneProjectDetailsTab from "@/components/allInOne/AllInOneProjectDetailsTab";
import AllInOneBuildTab from "@/components/allInOne/AllInOneBuildTab";
import AllInOneCostSummaryTab from "@/components/allInOne/AllInOneCostSummaryTab";
import AllInOneBOMTab from "@/components/allInOne/AllInOneBOMTab";
import AllInOneCustomerViewTab from "@/components/allInOne/AllInOneCustomerViewTab";

const EMPTY_PROJECT = {
  project_name: "",
  client_name: "",
  estimate_number: "",
  po_number: "",
  hyperlink: "",
  site_address: "",
  priority: "normal",
  tags: "",
  discount_percent: 0,
  contingency_percent: 0,
  shipping_fee: 0,
  permit_fee: 0,
  quote_valid_days: 30,
  payment_terms: "",
  scope_inclusions: "",
  scope_exclusions: "",
  hide_section_prices: false,
  company_name: "",
  company_phone: "",
  company_email: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  target_install_date: "",
  tax_percent: 0,
  deposit_percent: 50,
  status: "draft",
  line_items: [],
  notes: "",
};

const stripUi = (items) => items.map(({ missing, ...li }) => li);
const sumItems = (items) => items.reduce((s, li) => s + (Number(li.total_snapshot) || 0), 0);

// ============================================================================
// All-In-One Estimator — ONE page, ONE set of project info, every module.
//   - Project Details tab: single entry of client/address/contact info that
//     auto-fills every section and re-syncs on save
//   - Build Estimate tab: sections open their module's FULL estimator INLINE
//   - Cost Summary / Bill of Materials / Customer View tabs: single-point
//     aggregated views across all sections
//   - totals refresh on open, live via subscriptions, and on window focus
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
  const [sourceProjects, setSourceProjects] = useState({});
  const [lastSynced, setLastSynced] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Refs keep async callbacks (subscriptions, focus, hotkeys) on latest state.
  const editIdRef = useRef(null);
  const projectRef = useRef(project);
  useEffect(() => { editIdRef.current = editId; }, [editId]);
  useEffect(() => { projectRef.current = project; }, [project]);

  // Re-fetch every section from its source entity and sync names + totals +
  // full source data (powers the Cost Summary / BOM tabs). Persists totals.
  const refreshTotals = useCallback(async (items) => {
    if (!items || items.length === 0) return;
    setRefreshing(true);
    const sources = {};
    const updated = await Promise.all(
      items.map(async (li) => {
        const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
        if (!mod) return li;
        try {
          const src = await getModuleEntity(mod).get(li.project_id);
          if (!src) return { ...li, missing: true };
          sources[li.project_id] = src;
          return {
            ...li,
            project_name: src.project_name,
            client_name: src.client_name,
            total_snapshot: getModuleTotal(mod, src),
            updated_date_snapshot: src.updated_date,
            missing: false,
          };
        } catch {
          // Source estimate was deleted — keep the row visible with a warning.
          return { ...li, missing: true };
        }
      })
    );
    setSourceProjects((prev) => ({ ...prev, ...sources }));
    setProject((prev) => ({ ...prev, line_items: updated }));
    if (editIdRef.current) {
      await base44.entities.AllInOneEstimate.update(editIdRef.current, {
        line_items: stripUi(updated),
        total_cost: sumItems(updated),
      });
    }
    setLastSynced(new Date());
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
          setActiveTab((existing.line_items || []).length > 0 ? "build" : "details");
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
  // Any save inside an inline sub-estimator instantly updates this estimate.
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

  // Also re-sync when the user comes back to this browser tab.
  useEffect(() => {
    const onFocus = () => refreshTotals(projectRef.current.line_items);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshTotals]);

  const grandTotal = useMemo(() => sumItems(project.line_items), [project.line_items]);
  const quote = useMemo(() => computeQuote(project), [project]);

  const updateField = (field, value) => {
    setDirty(true);
    setProject((prev) => ({ ...prev, [field]: value }));
  };

  // Create or update the AllInOneEstimate record with the given line items.
  const persist = async (items) => {
    const payload = {
      ...projectRef.current,
      line_items: stripUi(items),
      total_cost: sumItems(items),
      quote_total: computeQuote({ ...projectRef.current, line_items: items }).total,
      status: items.length > 0 && projectRef.current.status === "draft" ? "calculated" : projectRef.current.status,
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
    setActiveTab("build");
    // Scroll down to the inline editor once it mounts.
    setTimeout(() => {
      document.getElementById("aio-inline-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
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
  // entity (project info AUTO-FILLED from the Project Details tab), save this
  // estimate, then load the module's FULL estimator inline.
  const handleAddSection = async (mod) => {
    if (!project.project_name || !project.client_name) {
      setActiveTab("details");
      toast({
        title: "Project details first",
        description: "Enter the project name and client name on the Project Details tab — they auto-fill every section.",
        variant: "destructive",
      });
      return;
    }
    setAddingKey(mod.key);
    const sectionNum = project.line_items.filter((li) => li.module_key === mod.key).length + 1;
    const sub = await getModuleEntity(mod).create({
      ...buildSharedPayload(mod, project),
      project_name: `${project.project_name} — ${mod.shortName}${sectionNum > 1 ? ` ${sectionNum}` : ""}`,
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
    if (openSection?.project_id === item.project_id) setOpenSection(null);
    const items = project.line_items.filter((_, i) => i !== index);
    setProject((prev) => ({ ...prev, line_items: items }));
    projectRef.current = { ...projectRef.current, line_items: items };
    if (editIdRef.current) await persist(items);
  };

  // Patch a section's metadata (adjustment %, workflow status, notes,
  // customer description / visibility). Persisted on the next save.
  const handleUpdateItem = (index, patch) => {
    setDirty(true);
    const items = projectRef.current.line_items.map((li, i) => (i === index ? { ...li, ...patch } : li));
    setProject((prev) => ({ ...prev, line_items: items }));
    projectRef.current = { ...projectRef.current, line_items: items };
  };

  // Rename a section — pushes the new name into the source sub-estimate too.
  const handleRename = async (index, name) => {
    const item = project.line_items[index];
    const mod = ESTIMATOR_MODULES_BY_KEY[item?.module_key];
    if (!item || !mod) return;
    await getModuleEntity(mod).update(item.project_id, { project_name: name }).catch(() => {});
    const items = project.line_items.map((li, i) => (i === index ? { ...li, project_name: name } : li));
    setProject((prev) => ({ ...prev, line_items: items }));
    projectRef.current = { ...projectRef.current, line_items: items };
    if (editIdRef.current) await persist(items);
  };

  // Duplicate a section — clones the source sub-estimate into a new owned one.
  const handleDuplicate = async (index) => {
    const item = project.line_items[index];
    const mod = ESTIMATOR_MODULES_BY_KEY[item?.module_key];
    if (!item || !mod || item.missing) return;
    setAddingKey(mod.key);
    const src = await getModuleEntity(mod).get(item.project_id);
    const { id, created_date, updated_date, created_by, created_by_id, ...data } = src || {};
    const copy = await getModuleEntity(mod).create({
      ...data,
      project_name: `${src.project_name} (copy)`,
    });
    const items = [
      ...project.line_items,
      {
        module_key: mod.key,
        project_id: copy.id,
        project_name: copy.project_name,
        client_name: copy.client_name,
        total_snapshot: Number(item.total_snapshot) || 0,
        owned: true,
        linked_date: new Date().toISOString(),
      },
    ];
    setProject((prev) => ({ ...prev, line_items: items }));
    projectRef.current = { ...projectRef.current, line_items: items };
    await persist(items);
    setAddingKey(null);
    toast({ title: "Section duplicated", description: `"${copy.project_name}" added.` });
  };

  const handleSave = async () => {
    const p = projectRef.current;
    if (!p.project_name || !p.client_name) {
      setActiveTab("details");
      toast({ title: "Missing details", description: "Project name and client name are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    await persist(p.line_items);
    // Share project info with every built section — truly one project.
    await Promise.all(
      p.line_items
        .filter((li) => li.owned && !li.missing)
        .map((li) => {
          const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
          if (!mod) return null;
          return getModuleEntity(mod)
            .update(li.project_id, buildSharedPayload(mod, p))
            .catch(() => {});
        })
    );
    setIsSaving(false);
    setDirty(false);
    toast({ title: "Saved", description: "Estimate saved and project info synced to all sections." });
  };

  // Ctrl/Cmd+S saves from anywhere on the page.
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copyShareLink = async () => {
    if (!editIdRef.current) {
      toast({ title: "Save first", description: "Save the estimate to get a shareable link." });
      return;
    }
    await navigator.clipboard.writeText(
      `${window.location.origin}${createPageUrl("NewAllInOneEstimate")}?edit=${editIdRef.current}`
    );
    toast({ title: "Link copied", description: "Estimate link copied to clipboard." });
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading estimate...</p>
      </div>
    );
  }

  const statusColors = {
    draft: "bg-slate-100 text-slate-700",
    calculated: "bg-emerald-100 text-emerald-800",
    sent: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    archived: "bg-amber-100 text-amber-800",
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* FULL page width — no max-width cap, scales with every resolution */}
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-5 gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3 flex-wrap">
              <Layers className="w-7 h-7 text-indigo-600 flex-shrink-0" />
              <span className="truncate">{project.project_name || (editId ? "Edit All-In-One Estimate" : "New All-In-One Estimate")}</span>
              <Badge className={`${statusColors[project.status] || statusColors.draft} border-0`}>{project.status}</Badge>
              {dirty && <span className="w-2.5 h-2.5 rounded-full bg-amber-400" title="Unsaved changes" />}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              One page, one set of project info, every estimator.
              {lastSynced && <span className="text-slate-400"> · Totals synced {lastSynced.toLocaleTimeString()}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-right mr-2">
              <p className="text-[10px] uppercase text-slate-400 font-medium">Quote Total</p>
              <p className="text-xl font-bold text-green-600 tabular-nums">{fmtCurrency(quote.total)}</p>
              {Math.round(quote.total) !== Math.round(grandTotal) && (
                <p className="text-[10px] text-slate-400 tabular-nums">sections {fmtCurrency(grandTotal)}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshTotals(project.line_items)}
              disabled={refreshing || project.line_items.length === 0}
              title="Refresh totals from all source estimates"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={copyShareLink} title="Copy estimate link">
              <LinkIcon className="w-4 h-4" />
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white" title="Save (Ctrl+S)">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving…" : editId ? "Update" : "Save"}
            </Button>
          </div>
        </div>

        {/* Tabs — project details + all single-point summaries at the top */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm w-full justify-start">
            <TabsTrigger value="details" className="gap-1.5"><FileText className="w-4 h-4" /> Project Details</TabsTrigger>
            <TabsTrigger value="build" className="gap-1.5">
              <Hammer className="w-4 h-4" /> Build Estimate
              {project.line_items.length > 0 && (
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full px-1.5">{project.line_items.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5"><PieChart className="w-4 h-4" /> Cost Summary</TabsTrigger>
            <TabsTrigger value="bom" className="gap-1.5"><Package className="w-4 h-4" /> Bill of Materials</TabsTrigger>
            <TabsTrigger value="customer" className="gap-1.5"><Receipt className="w-4 h-4" /> Customer View</TabsTrigger>
          </TabsList>

          {/* forceMount + hidden keeps the inline estimator mounted (with any
              in-progress edits) while the user checks the summary tabs. */}
          <TabsContent value="details" forceMount className="mt-5 data-[state=inactive]:hidden">
            <AllInOneProjectDetailsTab project={project} updateField={updateField} />
          </TabsContent>

          <TabsContent value="build" forceMount className="mt-5 data-[state=inactive]:hidden">
            <AllInOneBuildTab
              project={project}
              addingKey={addingKey}
              grandTotal={quote.subtotal}
              openSection={openSection}
              onAddSection={handleAddSection}
              onToggleSection={(item) =>
                openSection?.project_id === item.project_id ? closeSection() : openSectionInline(item)
              }
              onRemoveSection={handleRemove}
              onRenameSection={handleRename}
              onDuplicateSection={handleDuplicate}
              onUpdateSection={handleUpdateItem}
              editorSlot={
                openSection ? (
                  <div
                    id="aio-inline-editor"
                    className="rounded-2xl border-2 border-indigo-300 overflow-hidden shadow-xl scroll-mt-4"
                  >
                    <EstimatorSectionPanel item={openSection} onClose={closeSection} />
                  </div>
                ) : null
              }
            />
          </TabsContent>

          <TabsContent value="summary" forceMount className="mt-5 data-[state=inactive]:hidden">
            <AllInOneCostSummaryTab project={project} sourceProjects={sourceProjects} grandTotal={grandTotal} />
          </TabsContent>

          <TabsContent value="bom" forceMount className="mt-5 data-[state=inactive]:hidden">
            <AllInOneBOMTab project={project} sourceProjects={sourceProjects} />
          </TabsContent>

          <TabsContent value="customer" forceMount className="mt-5 data-[state=inactive]:hidden">
            <AllInOneCustomerViewTab
              project={project}
              grandTotal={grandTotal}
              updateField={updateField}
              onUpdateItem={handleUpdateItem}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}