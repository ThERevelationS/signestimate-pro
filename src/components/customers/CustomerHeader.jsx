import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Layers, FilePlus2, Pencil, Building2 } from "lucide-react";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/formatters";

const STATUS_LABEL = { prospect: "Prospect", active: "Active", inactive: "Inactive" };

// Customer detail header: identity, status, quick actions and account rollups.
export default function CustomerHeader({ customer, flags, stats, onEdit, onSetStatus }) {
  return (
    <div className="bg-white border border-slate-300 rounded-sm px-4 py-3 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-sm bg-zinc-900 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-lime-400" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{customer.company_name}</h1>
            <button onClick={onEdit} className="text-lime-600 hover:text-lime-700 text-xs font-semibold flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {flags.map((f) => (
              <span key={f.id} className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm border
                ${f.flag_color === "red" ? "bg-red-50 text-red-700 border-red-300"
                  : f.flag_color === "blue" ? "bg-blue-50 text-blue-700 border-blue-300"
                  : f.flag_color === "green" ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-amber-50 text-amber-700 border-amber-300"}`}>
                {f.text}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Account Created: {customer.created_date ? format(new Date(customer.created_date), "MM/dd/yyyy hh:mm a") : "—"}
          </p>
          <p className="text-xs text-slate-500">
            Customer Status: <b className="text-slate-800">{STATUS_LABEL[customer.customer_status] || "Prospect"}</b>
            {["prospect", "active"].includes(customer.customer_status || "prospect") ? (
              <button className="ml-2 text-lime-600 hover:underline" onClick={() => onSetStatus("inactive")}>Set Inactive</button>
            ) : (
              <button className="ml-2 text-lime-600 hover:underline" onClick={() => onSetStatus("active")}>Set Active</button>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-6">
        <div className="flex gap-2">
          <Link to={`${createPageUrl("NewAllInOneEstimate")}?customer=${customer.id}`}>
            <Button size="sm" variant="outline" className="h-8 rounded-sm text-xs"><Layers className="w-3.5 h-3.5 mr-1" /> New Estimate</Button>
          </Link>
          <Link to={createPageUrl("QuickProductEditor")}>
            <Button size="sm" variant="outline" className="h-8 rounded-sm text-xs"><FilePlus2 className="w-3.5 h-3.5 mr-1" /> New Product</Button>
          </Link>
        </div>
        <div className="text-xs text-right space-y-0.5">
          <p className="text-slate-500">Open Pipeline: <b className="text-slate-900">{fmtCurrency(stats.pipeline)}</b></p>
          <p className="text-slate-500">Approved: <b className="text-emerald-700">{fmtCurrency(stats.approved)}</b></p>
          <p className="text-slate-500">Estimates: <b className="text-slate-900">{stats.count}</b></p>
        </div>
      </div>
    </div>
  );
}