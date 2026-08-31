// List of saved Vinyl Estimator projects.

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { VinylProject } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Droplets, Settings as SettingsIcon } from "lucide-react";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/formatters";

// Mirror the FoundationProjects cap so initial paint isn't blocked
// downloading the full historical list.
const PAGE_SIZE = 200;

export default function VinylProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await VinylProject.list("-created_date", PAGE_SIZE);
      setProjects(data || []);
      setHasMore((data || []).length >= PAGE_SIZE);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = projects.length + PAGE_SIZE;
      const data = await VinylProject.list("-created_date", next);
      setProjects(data || []);
      setHasMore((data || []).length >= next);
    } catch (e) {
      console.error(e);
    }
    setLoadingMore(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await VinylProject.delete(id);
    load();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Droplets className="w-7 h-7 text-blue-600" /> Vinyl Projects
            </h1>
            <p className="text-slate-600">Printed graphics, cut vinyl & laminated decals</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("VinylSettings")}>
              <Button variant="outline"><SettingsIcon className="w-4 h-4 mr-1" /> Machines</Button>
            </Link>
            <Link to={createPageUrl("NewVinylEstimate")}>
              <Button className="bg-slate-800 hover:bg-slate-900 text-white"><Plus className="w-4 h-4 mr-1" /> New Estimate</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-12">Loading…</p>
        ) : projects.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-slate-500">
            <Droplets className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="mb-4">No vinyl projects yet.</p>
            <Link to={createPageUrl("NewVinylEstimate")}>
              <Button className="bg-slate-800 hover:bg-slate-900 text-white"><Plus className="w-4 h-4 mr-1" /> Create First Estimate</Button>
            </Link>
          </CardContent></Card>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {projects.map(p => (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`${createPageUrl("NewVinylEstimate")}?id=${p.id}`} className="flex-1 min-w-0">
                        <CardTitle className="text-base hover:text-blue-600 truncate">{p.project_name}</CardTitle>
                        <p className="text-sm text-slate-500 truncate">{p.client_name}</p>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => remove(p.id, p.project_name)} className="text-red-500 hover:bg-red-50 h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Badge variant="outline" className="capitalize">{p.status || "draft"}</Badge>
                      <span>{p.created_date && format(new Date(p.created_date), "MMM d, yyyy")}</span>
                      <span>· {p.items?.length || 0} part(s)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total</span>
                      <span className="font-semibold tabular-nums">{fmtCurrency(p.total_cost)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load more projects"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}