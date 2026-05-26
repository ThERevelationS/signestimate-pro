import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MaintenanceProject } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, Wrench, Trash2, Edit3, Package, Settings } from "lucide-react";

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

export default function SignMaintenanceProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const list = await MaintenanceProject.list("-created_date");
      setProjects(list || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this maintenance estimate?")) return;
    await MaintenanceProject.delete(id);
    load();
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Wrench className="w-8 h-8 text-cyan-600" />
              Sign Maintenance Projects
            </h1>
            <p className="text-slate-600">Existing maintenance estimates</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to={createPageUrl("MaintenanceInventory")}>
              <Button variant="outline" className="bg-white"><Package className="w-4 h-4 mr-2" /> Inventory</Button>
            </Link>
            <Link to={createPageUrl("SignMaintenanceSettings")}>
              <Button variant="outline" className="bg-white"><Settings className="w-4 h-4 mr-2" /> Settings</Button>
            </Link>
            <Button onClick={() => navigate(createPageUrl("NewSignMaintenance"))} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> New Estimate
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-500">Loading…</div>
        ) : projects.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300 bg-white/50">
            <CardContent className="p-12 text-center text-slate-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="mb-3 font-medium">No maintenance estimates yet</p>
              <Button onClick={() => navigate(createPageUrl("NewSignMaintenance"))} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Create your first estimate
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <Card key={p.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{p.project_name || "Untitled"}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{p.status || "draft"}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">{p.client_name || "—"} · {p.estimate_number || "—"}</div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs text-slate-500 truncate">{p.site_address || "No address"}</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-lg font-bold text-slate-900 tabular-nums">{fmt(p.total_cost)}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(createPageUrl("NewSignMaintenance") + `?edit=${p.id}`)}>
                      <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}