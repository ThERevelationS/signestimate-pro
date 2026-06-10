import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, AlertTriangle, Hammer, Link2 } from "lucide-react";
import { fmtCurrency } from "@/lib/formatters";
import { ESTIMATOR_MODULES_BY_KEY } from "./estimatorRegistry";

// One section of the All-In-One estimate. "Edit Section" loads the module's
// FULL estimator inline on the same page (handled by the parent).
export default function LinkedEstimateRow({ item, onEdit, onRemove }) {
  const mod = ESTIMATOR_MODULES_BY_KEY[item.module_key];
  const Icon = mod?.icon;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${item.missing ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      {Icon && (
        <div className={`w-9 h-9 rounded-lg ${mod.colors.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${mod.colors.text}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-slate-900 truncate">{item.project_name || "Untitled"}</p>
          {mod && <Badge className={`${mod.colors.badge} border-0 text-[10px]`}>{mod.shortName}</Badge>}
          {item.owned ? (
            <Badge className="bg-indigo-100 text-indigo-800 border-0 text-[10px] flex items-center gap-1">
              <Hammer className="w-2.5 h-2.5" /> Built here
            </Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px] flex items-center gap-1">
              <Link2 className="w-2.5 h-2.5" /> Linked
            </Badge>
          )}
        </div>
        {item.missing ? (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Source estimate not found — it may have been deleted.
          </p>
        ) : (
          <p className="text-xs text-slate-500 truncate">{item.client_name}</p>
        )}
      </div>
      <span className="font-semibold text-slate-900 text-sm flex-shrink-0 tabular-nums">
        {fmtCurrency(item.total_snapshot)}
      </span>
      {!item.missing && mod && (
        <Button size="sm" variant="outline" onClick={onEdit} className="flex-shrink-0">
          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Section
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
        title={item.owned ? "Remove section (deletes its sub-estimate)" : "Remove from this estimate"}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}