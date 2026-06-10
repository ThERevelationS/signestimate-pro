import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus, Search, Edit2, Trash2, Layers, Copy, Loader2,
  DollarSign, FileStack, CheckCircle2, Flame,
} from "lucide-react";
import { format } from "date-fns";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { fmtCurrency } from "@/lib/formatters";
import { useToast } from "@/components/ui/use-toast";
import { ESTIMATOR_MODULES_BY_KEY, getModuleEntity } from "@/components/allInOne/estimatorRegistry";

const PAGE_SIZE = 200;

const STATUS_COLORS = {
  draft: "bg-amber-100 text-amber-800 border-amber-200",
  calculated: "bg-green-100 text-green-800 border-green-200",
  sent: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  archived: "bg-slate-100 text-slate-800 border-slate-200",
};

const PRIORITY_BADGES = {
  high: { label: "High", cls: "bg-orange-100 text-orange-800" },
  rush: { label: "RUSH", cls: "bg-red-100 text-red-800" },
};

export default function AllInOneProjects() {
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [sortBy, setSortBy] = useState("newest");
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

  const filteredProjects = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    let rows = projects;
    if (statusFilter === "active") rows = rows.filter((p) => p.status !== "archived");
    else if (statusFilter !== "all") rows = rows.filter((p) => p.status === statusFilter);
    if (term) {
      rows = rows.filter(
        (p) =>
          p.project_name?.toLowerCase().includes(term) ||
          p.client_name?.toLowerCase().includes(term) ||
          p.estimate_number?.toLowerCase().includes(term) ||
          p.tags?.toLowerCase().includes(term) ||
          p.site_address?.toLowerCase().includes(term)
      );
    }
    if (sortBy === "newest") rows = [...rows].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    if (sortBy === "oldest") rows = [...rows].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    if (sortBy === "value") rows = [...rows].sort((a, b) => (b.quote_total || b.total_cost || 0) - (a.quote_total || a.total_cost || 0));
    if (sortBy === "name") rows = [...rows].sort((a, b) => (a.project_name || "").localeCompare(b.project_name || ""));
    if (sortBy === "client") rows = [...rows].sort((a, b) => (a.client_name || "").localeCompare(b.client_name || ""));
    return rows;
  }, [projects, debouncedSearch, statusFilter, sortBy]);

  // Pipeline stats across non-archived estimates.
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
      ? `Delete "${project.project_name}"? Its ${owned.length} built-in section estimate${owned.length === 1 ? "" : "s"} will also be permanently deleted.`
      : `Are you sure you want to delete "${project.project_name}"?`;
    if (!confirm(msg)) return;
    // Owned sections were created by this estimate — delete them with it.
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

  // Deep duplicate — clones the estimate AND every owned sub-estimate so the
  // copy is fully independent.
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
    toast({ title: "Estimate duplicated", description: `"${project.project_name} (copy)" created with independent sections.` });
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
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Layers className="w-8 h-8 text-indigo-600" />
              All-In-One Estimates
            </h1>
            <p className="text-slate-600">Combined estimates built from multiple estimator modules</p>
          </div>
          <Link to={createPageUrl("NewAllInOneEstimate")}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3">
              <Plus className="w-5 h-5 mr-2" />
              New Estimate
            </Button>
          </Link>
        </div>

        {/* Pipeline stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={FileStack} label="Active Estimates" value={stats.count} />
          <StatCard icon={DollarSign} label="Pipeline Value" value={fmtCurrency(stats.pipeline)} accent="text-green-600" />
          <StatCard icon={Edit2} label="Drafts" value={stats.drafts} />
          <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} accent="text-emerald-600" />
        </div>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, client, estimate #, tags, address…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="calculated">Calculated</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="value">Highest value</SelectItem>
                  <SelectItem value="name">By name</SelectItem>
                  <SelectItem value="client">By client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Layers className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No combined estimates match. Create one to roll multiple module estimates into a single total.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {filteredProjects.map((project) => {
                  const prio = PRIORITY_BADGES[project.priority];
                  const dueSoon = project.target_install_date &&
                    new Date(project.target_install_date) - Date.now() < 14 * 86400000 &&
                    new Date(project.target_install_date) >= Date.now();
                  return (
                    <div key={project.id} className="p-6 border-b border-slate-50 last:border-b-0 hover:bg-indigo-50/40 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate flex items-center gap-2">
                            {project.project_name}
                            {prio && <Badge className={`${prio.cls} border-0 text-[10px] flex items-center gap-0.5`}><Flame className="w-2.5 h-2.5" />{prio.label}</Badge>}
                          </h3>
                          <p className="text-slate-600 text-sm">{project.client_name}{project.site_address && <span className="text-slate-400"> · {project.site_address}</span>}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={STATUS_COLORS[project.status] || STATUS_COLORS.draft}>{project.status}</Badge>
                          <Link to={`${createPageUrl("NewAllInOneEstimate")}?edit=${project.id}`}>
                            <Button variant="outline" size="sm">
                              <Edit2 className="w-4 h-4 mr-1" /> Edit
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(project)}
                            disabled={!!duplicatingId}
                            className="text-slate-500 hover:text-slate-800"
                            title="Duplicate (deep copy incl. all built sections)"
                          >
                            {duplicatingId === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleArchive(project)}
                            className="text-slate-500 hover:text-slate-800 text-xs"
                            title={project.status === "archived" ? "Restore" : "Archive"}
                          >
                            {project.status === "archived" ? "Restore" : "Archive"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(project)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                        <span>{format(new Date(project.created_date), "MMM d, yyyy")}</span>
                        {project.estimate_number && <span>#{project.estimate_number}</span>}
                        {project.target_install_date && (
                          <span className={dueSoon ? "text-orange-600 font-medium" : ""}>
                            Install: {format(new Date(project.target_install_date), "MMM d")}{dueSoon && " (soon)"}
                          </span>
                        )}
                        <span>{project.line_items?.length || 0} section{(project.line_items?.length || 0) === 1 ? "" : "s"}</span>
                        <span className="font-semibold text-slate-900">
                          {fmtCurrency(project.quote_total || project.total_cost)}
                          {project.quote_total > 0 && project.quote_total !== project.total_cost && (
                            <span className="text-xs text-slate-400 font-normal ml-1">(quote)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {(project.line_items || []).map((li, i) => {
                          const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
                          return mod ? (
                            <Badge key={i} className={`${mod.colors.badge} border-0 text-[10px]`}>{mod.shortName}</Badge>
                          ) : null;
                        })}
                        {(project.tags || "").split(",").map((t) => t.trim()).filter(Boolean).map((t, i) => (
                          <Badge key={`tag-${i}`} variant="outline" className="text-[10px] text-slate-500">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent = "text-slate-900" }) {
  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`font-bold truncate ${accent}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}