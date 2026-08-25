import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Eye } from "lucide-react";

// ============================================================================
// Shared CoreBridge-style estimate queue shell: page header + labeled filter
// panel + dense striped results table + optional sticky detail panel.
// Pages supply their own data loading and column/detail renderers — this
// component is presentation only and contains NO estimating logic.
//
// columns: [{ key, label, align?, render(row) }]
// ============================================================================
export default function ProjectQueue({
  title,
  subtitle,
  newEstimatePage,
  searchTerm,
  onSearchChange,
  rows,
  totalCount,
  columns,
  selectedId,
  onSelect,
  hasMore,
  loadingMore,
  onLoadMore,
  detailPanel,
  emptyMessage = "No estimates found.",
}) {
  return (
    <div className="p-4 md:p-6">
      <div className="max-w-[1500px] mx-auto grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 bg-white border border-slate-300 rounded-sm shadow-sm">
          {/* Page header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-base font-bold text-lime-700 uppercase tracking-wide">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
            <Link to={createPageUrl(newEstimatePage)}>
              <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-sm h-8">
                <Plus className="w-4 h-4 mr-1" /> Create New
              </Button>
            </Link>
          </div>

          {/* Filter panel */}
          <div className="px-4 py-3 bg-slate-100 border-b border-slate-300">
            <div className="max-w-sm">
              <Label className="text-xs">Search (project or customer)</Label>
              <Input
                className="h-8 rounded-sm bg-white"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Type to filter…"
              />
            </div>
          </div>

          {/* Results table */}
          {rows.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">{emptyMessage}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-700 text-white text-xs">
                    {columns.map((c) => (
                      <th key={c.key} className={`px-3 py-2 font-semibold ${c.align === "right" ? "text-right" : "text-left"}`}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      onClick={() => onSelect(row.id)}
                      className={`border-b border-slate-200 cursor-pointer ${
                        selectedId === row.id
                          ? "bg-lime-100 border-l-4 border-l-lime-600"
                          : `${idx % 2 ? "bg-slate-50/60" : "bg-white"} hover:bg-lime-50/60 border-l-4 border-l-transparent`
                      }`}
                    >
                      {columns.map((c) => (
                        <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 text-xs text-slate-500 border-t border-slate-200 flex items-center justify-between">
                <span>Showing {rows.length}{typeof totalCount === "number" ? ` of ${totalCount}` : ""} estimates</span>
                {hasMore && (
                  <Button variant="outline" size="sm" className="h-7 rounded-sm" onClick={onLoadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading…" : "Load more"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:sticky lg:top-24">
          {detailPanel || (
            <div className="bg-white border border-slate-300 rounded-sm shadow-sm p-10 text-center text-slate-500">
              <Eye className="w-9 h-9 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">Select an estimate to see its details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}