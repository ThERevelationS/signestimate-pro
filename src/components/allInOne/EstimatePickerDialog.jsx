import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/formatters";
import { getModuleEntity, getModuleTotal } from "./estimatorRegistry";

// Picks an existing saved estimate from one estimator module to attach to the
// All-In-One estimate. Works for ANY registry module — no per-module code.
export default function EstimatePickerDialog({ module, excludeIds = [], onPick, onClose }) {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!module) return;
    setLoading(true);
    setSearch("");
    getModuleEntity(module).list("-created_date", 200).then((rows) => {
      setProjects(rows || []);
      setLoading(false);
    });
  }, [module]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects
      .filter((p) => !excludeIds.includes(p.id))
      .filter((p) =>
        !term ||
        p.project_name?.toLowerCase().includes(term) ||
        p.client_name?.toLowerCase().includes(term) ||
        p.estimate_number?.toLowerCase().includes(term)
      );
  }, [projects, search, excludeIds]);

  if (!module) return null;
  const Icon = module.icon;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${module.colors.text}`} />
            Attach {module.name} Estimate
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search by project, client, or estimate #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">Loading estimates…</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No saved estimates found for this module.
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{p.project_name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {p.client_name}
                        {p.estimate_number ? ` • #${p.estimate_number}` : ""}
                        {p.created_date ? ` • ${format(new Date(p.created_date), "MMM d, yyyy")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.status && <Badge variant="outline" className="capitalize">{p.status}</Badge>}
                      <span className="font-semibold text-slate-900 text-sm">
                        {fmtCurrency(getModuleTotal(module, p))}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}