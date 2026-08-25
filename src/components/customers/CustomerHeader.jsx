import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Layers, ShoppingCart, Pencil, Building2, TrendingUp, CheckCircle2, FileText } from "lucide-react";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/formatters";

const STATUS_LABEL = { prospect: "Prospect", active: "Active", inactive: "Inactive" };

const STATUS_STYLE = {
  prospect: "bg-slate-100 text-slate-600",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-red-50 text-red-700 ring-red-200",
};

// Customer detail header: identity, status, quick actions and account rollups.
export default function CustomerHeader({ customer, flags, stats, onEdit, onSetStatus }) {
  const status = customer.customer_status || "prospect";
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-red-600 to-red-500" />
      <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center flex-shrink-0 shadow-sm shadow-red-600/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{customer.company_name}</h1>
              <button onClick={onEdit}
                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-semibold px-2 py-0.5 rounded-md hover:bg-red-50 transition-colors">
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${STATUS_STYLE[status]}`}>
                {STATUS_LABEL[status]}
              </span>
              {flags.map((f) => (
                <span key={f.id} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ring-1
                  ${f.flag_color === "red" ? "bg-red-50 text-red-700 ring-red-200"
                    : f.flag_color === "blue" ? "bg-blue-50 text-blue-700 ring-blue-200"
                    : f.flag_color === "green" ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
                  {f.text}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Account Created: <span className="text-slate-700">{customer.created_date ? format(new Date(customer.created_date), "MM/dd/yyyy hh:mm a") : "—"}</span>
            </p>
            <p className="text-xs text-slate-500">
              Customer Status: <b className="text-slate-800">{STATUS_LABEL[status]}</b>
              {["prospect", "active"].includes(status) ? (
                <button className="ml-2 text-red-600 hover:text-red-700 font-semibold hover:underline" onClick={() => onSetStatus("inactive")}>Set Inactive</button>
              ) : (
                <button className="ml-2 text-red-600 hover:text-red-700 font-semibold hover:underline" onClick={() => onSetStatus("active")}>Set Active</button>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex gap-2">
            <Link to={`${createPageUrl("NewAllInOneEstimate")}?customer=${customer.id}`}>
              <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm shadow-red-600/25 transition-all hover:shadow-md hover:-translate-y-px">
                <Layers className="w-4 h-4" /> New Estimate
              </button>
            </Link>
            <Link to={`${createPageUrl("NewAllInOneEstimate")}?customer=${customer.id}&mode=order`}>
              <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-red-700 text-xs font-semibold ring-1 ring-red-200 hover:bg-red-50 hover:ring-red-300 transition-all">
                <ShoppingCart className="w-4 h-4" /> New Order
              </button>
            </Link>
          </div>
          <div className="hidden sm:flex items-center gap-3 pl-5 border-l border-slate-200">
            <Stat icon={<TrendingUp className="w-3.5 h-3.5" />} label="Open Pipeline" value={fmtCurrency(stats.pipeline)} tone="slate" />
            <Stat icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Approved" value={fmtCurrency(stats.approved)} tone="green" />
            <Stat icon={<FileText className="w-3.5 h-3.5" />} label="Estimates" value={stats.count} tone="slate" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, tone }) {
  const toneCls = tone === "green" ? "text-emerald-700" : "text-slate-900";
  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wide font-semibold text-slate-400">
        {icon} {label}
      </div>
      <div className={`text-sm font-bold tabular-nums ${toneCls}`}>{value}</div>
    </div>
  );
}