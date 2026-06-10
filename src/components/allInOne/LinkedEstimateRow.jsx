import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2, AlertTriangle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { fmtCurrency } from "@/lib/formatters";
import { ESTIMATOR_MODULES_BY_KEY } from "./estimatorRegistry";

// One linked sub-estimate inside the All-In-One estimate.
export default function LinkedEstimateRow({ item, onRemove }) {
  const mod = ESTIMATOR_MODULES_BY_KEY[item.module_key];
  const Icon = mod?.icon;
  const editUrl = mod
    ? `${createPageUrl(mod.newEstimatePage)}?${mod.editParam}=${item.project_id}`
    : null;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${item.missing ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      {Icon && (
        <div className={`w-9 h-9 rounded-lg ${mod.colors.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${mod.colors.text}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-900 truncate">{item.project_name || "Untitled"}</p>
          {mod && <Badge className={`${mod.colors.badge} border-0 text-[10px]`}>{mod.shortName}</Badge>}
        </div>
        {item.missing ? (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Source estimate not found — it may have been deleted.
          </p>
        ) : (
          <p className="text-xs text-slate-500 truncate">{item.client_name}</p>
        )}
      </div>
      <span className="font-semibold text-slate-900 text-sm flex-shrink-0">
        {fmtCurrency(item.total_snapshot)}
      </span>
      {editUrl && !item.missing && (
        <a href={editUrl} target="_blank" rel="noopener noreferrer" title="Open estimate in new tab">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </a>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
        title="Remove from this estimate"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}