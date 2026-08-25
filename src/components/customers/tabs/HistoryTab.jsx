import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/formatters";

// History tab — every estimate for this customer, plus the account audit line.
export default function HistoryTab({ customer, estimates }) {
  const [tab, setTab] = useState("estimates");
  const [q, setQ] = useState("");

  const rows = estimates.filter((e) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (e.estimate_number || "").toLowerCase().includes(t) || (e.project_name || "").toLowerCase().includes(t);
  });

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {[["estimates", "Estimates"], ["account", "Account"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 text-xs font-semibold border rounded-t-sm ${tab === k ? "bg-white border-slate-300 border-b-white text-slate-900" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "estimates" ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-600">Search:</span>
            <Input className="h-7 rounded-sm text-xs w-64" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="text-xs text-slate-400 ml-auto">{rows.length} estimate{rows.length === 1 ? "" : "s"}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-600 text-white text-left text-xs">
                <th className="px-2 py-1.5">Estimate #</th>
                <th className="px-2 py-1.5">Description</th>
                <th className="px-2 py-1.5"># of Products</th>
                <th className="px-2 py-1.5">Created Date</th>
                <th className="px-2 py-1.5">Status</th>
                <th className="px-2 py-1.5 text-right">Estimate Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="px-2 py-4 text-slate-500 bg-slate-50">No data available in table</td></tr>}
              {rows.map((e, i) => (
                <tr key={e.id} className={`border-b border-slate-200 ${i % 2 ? "bg-slate-50" : ""}`}>
                  <td className="px-2 py-1.5">
                    <Link to={`${createPageUrl("NewAllInOneEstimate")}?edit=${e.id}`} className="text-lime-700 font-semibold hover:underline">
                      {e.estimate_number || "Open"}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5">{e.project_name}</td>
                  <td className="px-2 py-1.5">{e.line_items?.length || 0}</td>
                  <td className="px-2 py-1.5">{format(new Date(e.created_date), "MM/dd/yyyy")}</td>
                  <td className="px-2 py-1.5 uppercase text-[10px] font-bold text-slate-600">{e.status}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{fmtCurrency(e.quote_total || e.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-600 text-white text-left text-xs">
              <th className="px-2 py-1.5">Created</th>
              <th className="px-2 py-1.5">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50 border-b border-slate-200">
              <td className="px-2 py-1.5">{customer.created_date ? format(new Date(customer.created_date), "MM/dd/yyyy hh:mm a") : "—"}</td>
              <td className="px-2 py-1.5">Customer Created</td>
            </tr>
            {estimates.map((e) => (
              <tr key={e.id} className="border-b border-slate-200">
                <td className="px-2 py-1.5">{format(new Date(e.created_date), "MM/dd/yyyy hh:mm a")}</td>
                <td className="px-2 py-1.5">Estimate {e.estimate_number || e.project_name} created</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}