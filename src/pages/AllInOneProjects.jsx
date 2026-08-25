import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Edit2, Trash2, Layers, Copy, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/formatters";
import { useToast } from "@/components/ui/use-toast";
import { ESTIMATOR_MODULES_BY_KEY, getModuleEntity } from "@/components/allInOne/estimatorRegistry";

const PAGE_SIZE = 200;

const STATUS_COLORS = {
  draft: "bg-amber-100 text-amber-800 border-amber-300",
  calculated: "bg-lime-100 text-lime-800 border-lime-300",
  sent: "bg-blue-100 text-blue-800 border-blue-300",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
  archived: "bg-slate-200 text-slate-600 border-slate-300",
};

const EMPTY_FILTERS = { estimate: "", company: "", description: "", status: "active" };

// CoreBridge-style Estimates search: labeled filter panel + dense results table.
export default function AllInOneProjects() {
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [duplicatingId, setDuplicatingId] = useState(null);

  const loadProjects = async () => {
    setIsLoading(true);
    const rows = await base44.entities.AllInOneEstimate.list("-created_date", PAGE_SIZE);
    setProjects(rows || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const applySearch = () => setFilters({ ...pending });

  const filteredProjects = useMemo(() => {
    let rows = projects;
    if (filters.status === "active") rows = rows.filter((p) => p.status !== "archived");
    else if (filters.status !== "all") rows = rows.filter((p) => p.status === filters.status);
    const est = filters.estimate.trim().toLowerCase();
    const co = filters.company.trim().toLowerCase();
    const desc = filters.description.trim().toLowerCase();
    if (est) rows = rows.filter((p) => (p.estimate_number || "").toLowerCase().includes(est));
    if (co) rows = rows.filter((p) => (p.client_name || "").toLowerCase().includes(co));
    if (desc)
      rows = rows.filter(
        (p) =>
          (p.project_name || "").toLowerCase().includes(desc) ||
          (p.tags || "").toLowerCase().includes(desc) ||
          (p.site_address || "").toLowerCase().includes(desc)
      );
    return [...rows].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [projects, filters]);

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status !== "archived");
    return {
      count: active.length,
      pipeline: active.reduce((s, p) => s + (Number(p.quote_total) || Number(p.total_cost) || 0), 0),
      drafts: active.filter((p) => p.status === "draft").length,
      approved: active.filter((p) => p.status === "approved").length,
    };
  }, [projects]);

  const handleDelete = async (project) => {
    const owned = (project.line_items || []).filter((li) => li.owned);
    const msg = owned.length > 0
      ? `Delete "${project.project_name}"? Its ${owned.length} built-in product estimate${owned.length === 1 ? "" : "s"} will also be permanently deleted.`
      : `Are you sure you want to delete "${project.project_name}"?`;
    if (!confirm(msg)) return;
    for (const li of owned) {
      const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
      if (mod) {
        try {
          await getModuleEntity(mod).delete(li.project_id);
        } catch {
          // Sub-estimate already gone.
        }
      }
    }
    await base44.entities.AllInOneEstimate.delete(project.id);
    await loadProjects();
  };

  // Deep duplicate — clones the estimate AND every owned sub-estimate.
  const handleDuplicate = async (project) => {
    setDuplicatingId(project.id);
    const newItems = [];
    for (const li of project.line_items || []) {
      const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
      if (!mod) continue;
      if (li.owned) {
        try {
          const src = await getModuleEntity(mod).get(li.project_id);
          const { id, created_date, updated_date, created_by, created_by_id, ...data } = src || {};
          const copy = await getModuleEntity(mod).create({ ...data });
          newItems.push({ ...li, project_id: copy.id, linked_date: new Date().toISOString() });
        } catch {
          // Source missing — skip this section in the copy.
        }
      } else {
        newItems.push({ ...li });
      }
    }
    const { id, created_date, updated_date, created_by, created_by_id, ...data } = project;
    await base44.entities.AllInOneEstimate.create({
      ...data,
      project_name: `${project.project_name} (copy)`,
      status: "draft",
      line_items: newItems,
    });
    setDuplicatingId(null);
    toast({ title: "Estimate cloned", description: `"${project.project_name} (copy)" created with independent products.` });
    await loadProjects();
  };

  const toggleArchive = async (project) => {
    await base44.entities.AllInOneEstimate.update(project.id, {
      status: project.status === "archived" ? "draft" : "archived",
    });
    await loadProjects();
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-slate-600">Loading estimates...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto bg-white border border-slate-300 rounded-sm shadow-sm">
        {/* Page header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-base font-bold text-lime-700 uppercase tracking-wide flex items-center gap-2">
            <Layers className="w-4 h-4" /> Estimates
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Active: <b className="text-slate-800">{stats.count}</b></span>
            <span>Pipeline: <b className="text-green-700">{fmtCurrency(stats.pipeline)}</b></span>
            <span>Drafts: <b className="text-slate-800">{stats.drafts}</b></span>
            <span>Approved: <b className="text-emerald-700">{stats.approved}</b></span>
            <Link to={createPageUrl("NewAllInOneEstimate")}>
              <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-sm h-8">
                <Plus className="w-4 h-4 mr-1" /> Create New
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter panel */}
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-300">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs">Estimate #</Label>
              <Input className="h-8 rounded-sm bg-white" value={pending.estimate}
                onChange={(e) => setPending((p) => ({ ...p, estimate: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && applySearch()} />
            </div>
            <div>
              <Label className="text-xs">Company Name</Label>
              <Input className="h-8 rounded-sm bg-white" value={pending.company}
                onChange={(e) => setPending((p) => ({ ...p, company: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && applySearch()} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input className="h-8 rounded-sm bg-white" value={pending.description}
                onChange={(e) => setPending((p) => ({ ...p, description: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && applySearch()} />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={pending.status} onValueChange={(v) => setPending((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="h-8 rounded-sm bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">All Active</SelectItem>
                  <SelectItem value="all">All (incl. archived)</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="calculated">Calculated</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applySearch} className="h-8 bg-zinc-700 hover:bg-zinc-600 text-white rounded-sm">
              Search
            </Button>
          </div>
        </div>

        {/* Results table */}
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Layers className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p>No estimates match. Create one to roll multiple module estimates into a single total.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-700 text-white text-xs">
                  <th className="text-left px-3 py-2 font-semibold">Estimate #</th>
                  <th className="text-left px-3 py-2 font-semibold">Customer</th>
                  <th className="text-left px-3 py-2 font-semibold">Estimate Description</th>
                  <th className="text-left px-3 py-2 font-semibold">Products</th>
                  <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Created Date</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-right px-3 py-2 font-semibold">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project, idx) => (
                  <tr key={project.id} className={`border-b border-slate-200 hover:bg-lime-50/60 ${idx % 2 ? "bg-slate-50/60" : "bg-white"}`}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link to={`${createPageUrl("NewAllInOneEstimate")}?edit=${project.id}`}
                        className="text-lime-700 font-semibold hover:underline">
                        {project.estimate_number || "Open"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-800 font-medium">{project.client_name}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {project.project_name}
                      {project.site_address && <span className="text-slate-400 text-xs"> · {project.site_address}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap items-center">
                        <span className="text-slate-700 font-medium">{project.line_items?.length || 0}</span>
                        {(project.line_items || []).slice(0, 4).map((li, i) => {
                          const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
                          return mod ? (
                            <Badge key={i} className={`${mod.colors.badge} border-0 text-[9px] px-1`}>{mod.shortName}</Badge>
                          ) : null;
                        })}
                        {(project.line_items?.length || 0) > 4 && <span className="text-[10px] text-slate-400">+{project.line_items.length - 4}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{format(new Date(project.created_date), "MM/dd/yyyy")}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase border rounded-sm ${STATUS_COLORS[project.status] || STATUS_COLORS.draft}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {fmtCurrency(project.quote_total || project.total_cost)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Link to={`${createPageUrl("NewAllInOneEstimate")}?edit=${project.id}`} title="Edit">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="w-3.5 h-3.5" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Clone estimate"
                          onClick={() => handleDuplicate(project)} disabled={!!duplicatingId}>
                          {duplicatingId === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] px-1.5 text-slate-500"
                          onClick={() => toggleArchive(project)}>
                          {project.status === "archived" ? "Restore" : "Archive"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(project)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-xs text-slate-500 border-t border-slate-200">
              Showing {filteredProjects.length} of {projects.length} estimates
            </p>
          </div>
        )}
      </div>
    </div>
  );
}