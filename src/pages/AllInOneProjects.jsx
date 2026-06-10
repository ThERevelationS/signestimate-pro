import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Edit2, Trash2, Layers } from "lucide-react";
import { format } from "date-fns";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { fmtCurrency } from "@/lib/formatters";
import { ESTIMATOR_MODULES_BY_KEY } from "@/components/allInOne/estimatorRegistry";

const PAGE_SIZE = 200;

export default function AllInOneProjects() {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!term) return projects;
    return projects.filter(
      (p) =>
        p.project_name?.toLowerCase().includes(term) ||
        p.client_name?.toLowerCase().includes(term) ||
        p.estimate_number?.toLowerCase().includes(term)
    );
  }, [projects, debouncedSearch]);

  const handleDelete = async (id, name) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will not delete the linked sub-estimates.`)) {
      await base44.entities.AllInOneEstimate.delete(id);
      await loadProjects();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "draft": return "bg-amber-100 text-amber-800 border-amber-200";
      case "calculated": return "bg-green-100 text-green-800 border-green-200";
      case "archived": return "bg-slate-100 text-slate-800 border-slate-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
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

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Layers className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No combined estimates yet. Create one to roll multiple module estimates into a single total.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="p-6 border-b border-slate-50 last:border-b-0 hover:bg-indigo-50/40 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{project.project_name}</h3>
                        <p className="text-slate-600 text-sm">{project.client_name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                        <Link to={`${createPageUrl("NewAllInOneEstimate")}?edit=${project.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit2 className="w-4 h-4 mr-1" /> Edit
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(project.id, project.project_name)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                      <span>{format(new Date(project.created_date), "MMM d, yyyy")}</span>
                      {project.estimate_number && <span>#{project.estimate_number}</span>}
                      <span>{project.line_items?.length || 0} linked estimate{(project.line_items?.length || 0) === 1 ? "" : "s"}</span>
                      <span className="font-semibold text-slate-900">{fmtCurrency(project.total_cost)}</span>
                    </div>
                    {(project.line_items?.length || 0) > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {project.line_items.map((li, i) => {
                          const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
                          return mod ? (
                            <Badge key={i} className={`${mod.colors.badge} border-0 text-[10px]`}>{mod.shortName}</Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}