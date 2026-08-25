import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Edit } from "lucide-react";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/formatters";

// Shared CoreBridge detail panel for the machine-time estimators (Laser, CNC)
// — identical data shape (items + total_machine_cost + total_labor_cost).
// Presentation only; totals come straight from the saved estimate.
export default function MachineProjectDetails({ project, editPage, showItemType }) {
  return (
    <div className="bg-white border border-slate-300 rounded-sm shadow-sm">
      <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-bold text-lime-700 uppercase tracking-wide">Estimate Details</h2>
        <Link to={createPageUrl(`${editPage}?edit=${project.id}`)}>
          <Button variant="outline" size="sm" className="h-7 rounded-sm text-xs">
            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
        </Link>
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
      </div>

      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Products</p>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {(project.items || []).map((item, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-sm px-2.5 py-1.5 text-xs">
              <p className="font-medium text-slate-800">{item.description || `Item ${i + 1}`}</p>
              <p className="capitalize text-slate-600">
                {item.material_type}{item.material_thickness ? ` — ${item.material_thickness}"` : ""}
              </p>
              {showItemType && item.item_type && (
                <p className="capitalize text-slate-400">{item.item_type.replace(/_/g, " ")}</p>
              )}
            </div>
          ))}
          {(project.items || []).length === 0 && <p className="text-xs text-slate-400 italic">No products on this estimate.</p>}
        </div>
      </div>

      <div className="px-4 py-3 text-sm space-y-1">
        <div className="flex justify-between text-slate-700">
          <span>Total Machine Cost:</span>
          <span className="font-medium tabular-nums">{fmtCurrency(project.total_machine_cost)}</span>
        </div>
        <div className="flex justify-between text-slate-700">
          <span>Total Labor Cost:</span>
          <span className="font-medium tabular-nums">{fmtCurrency(project.total_labor_cost)}</span>
        </div>
        <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1.5 mt-1">
          <span>Total:</span>
          <span className="tabular-nums">
            {fmtCurrency((Number(project.total_machine_cost) || 0) + (Number(project.total_labor_cost) || 0))}
          </span>
        </div>
      </div>

      {project.notes && (
        <div className="px-4 py-3 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Notes</p>
          <p className="text-xs text-slate-600 whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}
    </div>
  );
}