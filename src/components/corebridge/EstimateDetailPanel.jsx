import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Edit } from "lucide-react";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/formatters";

// ============================================================================
// Generic CoreBridge detail panel for any estimate queue.
// Presentation only — every number shown is passed in by the page from the
// already-saved estimate, so no estimating logic lives here.
//
// renderItem(item, index) -> { title, lines: [string] }
// totals: [{ label, value }]  (value = raw number, formatted as currency here)
// ============================================================================
export default function EstimateDetailPanel({
  project,
  editPage,
  statusBadge,
  renderItem,
  totals = [],
  grandTotal,
  extraFields,
  editParam = "edit",
  itemsLabel = "Products",
  hideItems = false,
}) {
  const items = project.items || [];

  return (
    <div className="bg-white border border-slate-300 rounded-sm shadow-sm">
      <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-lime-700 uppercase tracking-wide">Estimate Details</h2>
        <div className="flex items-center gap-2">
          {statusBadge}
          <Link to={`${createPageUrl(editPage)}?${editParam}=${project.id}`}>
            <Button variant="outline" size="sm" className="h-7 rounded-sm text-xs">
              <Edit className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-200 text-sm space-y-1">
        <p className="font-semibold text-slate-900">{project.project_name}</p>
        <p className="text-slate-600">Customer: {project.client_name}</p>
        {project.estimate_number && <p className="text-slate-600">Estimate #: {project.estimate_number}</p>}
        {project.hyperlink && (
          <a href={project.hyperlink} target="_blank" rel="noopener noreferrer"
            className="text-lime-700 hover:underline truncate block">
            {project.hyperlink}
          </a>
        )}
        <p className="text-slate-600">Created: {format(new Date(project.created_date), "MM/dd/yyyy")}</p>
        {extraFields}
      </div>

      <div className={`px-4 py-3 border-b border-slate-200 ${hideItems ? "hidden" : ""}`}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{itemsLabel}</p>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {items.map((item, i) => {
            const { title, lines = [] } = renderItem(item, i);
            return (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-sm px-2.5 py-1.5 text-xs">
                <p className="font-medium text-slate-800">{title}</p>
                {lines.filter(Boolean).map((line, li) => (
                  <p key={li} className="text-slate-600">{line}</p>
                ))}
              </div>
            );
          })}
          {items.length === 0 && <p className="text-xs text-slate-400 italic">No products on this estimate.</p>}
        </div>
      </div>

      {totals.length > 0 && (
        <div className="px-4 py-3 text-sm space-y-1">
          {totals.map((t) => (
            <div key={t.label} className="flex justify-between text-slate-700">
              <span>{t.label}:</span>
              <span className="font-medium tabular-nums">{fmtCurrency(t.value)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1.5 mt-1">
            <span>Total:</span>
            <span className="tabular-nums">
              {fmtCurrency(totals.reduce((s, t) => s + (Number(t.value) || 0), 0))}
            </span>
          </div>
        </div>
      )}

      {totals.length === 0 && grandTotal !== undefined && (
        <div className="px-4 py-3 flex justify-between font-bold text-slate-900 text-sm">
          <span>Total:</span>
          <span className="tabular-nums">{fmtCurrency(grandTotal)}</span>
        </div>
      )}

      {project.notes && (
        <div className="px-4 py-3 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Notes</p>
          <p className="text-xs text-slate-600 whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}
    </div>
  );
}