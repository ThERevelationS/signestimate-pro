import React from "react";
import { fmtCurrency } from "@/lib/formatters";

const total = (rows) => rows.reduce((s, e) => s + (Number(e.quote_total) || Number(e.total_cost) || 0), 0);

// Analytics tab — this year / last year / all-time estimate performance,
// computed live from the customer's estimates.
export default function AnalyticsTab({ estimates }) {
  const year = new Date().getFullYear();
  const inYear = (y) => estimates.filter((e) => new Date(e.created_date).getFullYear() === y);
  const buckets = { "This Year": inYear(year), "Last Year": inYear(year - 1), "All-Time": estimates };
  const approved = (rows) => rows.filter((e) => e.status === "approved");

  const cell = (v) => <td className="px-3 py-1.5 text-center tabular-nums">{v}</td>;

  const table = (title, rowsFor, valueOf, countLabel) => (
    <div className="flex-1 min-w-[280px] border border-slate-300 rounded-sm overflow-hidden">
      <p className="bg-lime-500 text-white text-center text-sm font-bold py-1">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 text-slate-700 text-xs">
            <th className="px-3 py-1.5" />
            {Object.keys(buckets).map((k) => <th key={k} className="px-3 py-1.5 border-l border-slate-200">{k}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-slate-200">
            <td className="px-3 py-1.5 text-right text-slate-600">Total $</td>
            {Object.values(buckets).map((rows, i) => <React.Fragment key={i}>{cell(fmtCurrency(valueOf(rowsFor(rows))))}</React.Fragment>)}
          </tr>
          <tr className="border-t border-slate-200">
            <td className="px-3 py-1.5 text-right text-slate-600">Average $</td>
            {Object.values(buckets).map((rows, i) => {
              const r = rowsFor(rows);
              return <React.Fragment key={i}>{cell(fmtCurrency(r.length ? valueOf(r) / r.length : 0))}</React.Fragment>;
            })}
          </tr>
          <tr className="border-t border-slate-200">
            <td className="px-3 py-1.5 text-right text-slate-600"># of {countLabel}</td>
            {Object.values(buckets).map((rows, i) => <React.Fragment key={i}>{cell(rowsFor(rows).length)}</React.Fragment>)}
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-wrap gap-4">
      {table("Estimates Quoted", (r) => r, total, "Estimates")}
      {table("Approved Work", approved, total, "Approvals")}
    </div>
  );
}