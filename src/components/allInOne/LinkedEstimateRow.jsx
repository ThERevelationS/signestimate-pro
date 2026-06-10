import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, AlertTriangle, Hammer, Link2, ChevronUp, Copy, Check, X } from "lucide-react";
import { fmtCurrency } from "@/lib/formatters";
import { ESTIMATOR_MODULES_BY_KEY } from "./estimatorRegistry";

// One section of the All-In-One estimate. "Edit Section" loads the module's
// FULL estimator inline on the same page (handled by the parent). Supports
// inline rename, duplicate, and shows the section's share of the grand total.
export default function LinkedEstimateRow({ item, isOpen, percent, onEdit, onRemove, onRename, onDuplicate }) {
  const mod = ESTIMATOR_MODULES_BY_KEY[item.module_key];
  const Icon = mod?.icon;
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(item.project_name || "");

  const commitRename = () => {
    setRenaming(false);
    const next = draftName.trim();
    if (next && next !== item.project_name) onRename?.(next);
  };

  return (
    <div className={`rounded-lg border ${item.missing ? "border-red-200 bg-red-50" : isOpen ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-3 p-3 flex-wrap sm:flex-nowrap">
        {Icon && (
          <div className={`w-9 h-9 rounded-lg ${mod.colors.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${mod.colors.text}`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {renaming ? (
              <span className="flex items-center gap-1">
                <Input
                  autoFocus
                  className="h-7 text-sm w-56"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenaming(false);
                  }}
                />
                <button onClick={commitRename} className="text-emerald-600 hover:text-emerald-700" title="Save name"><Check className="w-4 h-4" /></button>
                <button onClick={() => setRenaming(false)} className="text-slate-400 hover:text-slate-600" title="Cancel"><X className="w-4 h-4" /></button>
              </span>
            ) : (
              <button
                className="font-medium text-slate-900 truncate hover:underline decoration-dotted text-left"
                title="Click to rename section"
                onClick={() => { if (!item.missing && onRename) { setDraftName(item.project_name || ""); setRenaming(true); } }}
              >
                {item.project_name || "Untitled"}
              </button>
            )}
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
            <p className="text-xs text-slate-500 truncate">
              {item.client_name}
              {item.updated_date_snapshot && (
                <span className="text-slate-400"> · updated {new Date(item.updated_date_snapshot).toLocaleDateString()}</span>
              )}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <span className="font-semibold text-slate-900 text-sm tabular-nums block">
            {fmtCurrency(item.total_snapshot)}
          </span>
          {percent > 0 && <span className="text-[10px] text-slate-400">{percent.toFixed(1)}% of total</span>}
        </div>
        {!item.missing && mod && (
          <>
            <Button size="sm" variant={isOpen ? "default" : "outline"} onClick={onEdit} className="flex-shrink-0">
              {isOpen ? (
                <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Collapse</>
              ) : (
                <><Pencil className="w-3.5 h-3.5 mr-1" /> Edit Section</>
              )}
            </Button>
            {onDuplicate && (
              <Button size="sm" variant="ghost" onClick={onDuplicate} className="flex-shrink-0 text-slate-500 hover:text-slate-800" title="Duplicate this section">
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </>
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
      {percent > 0 && mod && (
        <div className="h-1 rounded-b-lg bg-slate-100 overflow-hidden">
          <div className="h-full" style={{ width: `${Math.min(100, percent)}%`, backgroundColor: mod.colors.hex }} />
        </div>
      )}
    </div>
  );
}