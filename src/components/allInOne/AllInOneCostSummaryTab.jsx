import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, PieChart as PieIcon, TrendingUp, Layers, Boxes } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { fmtCurrency } from "@/lib/formatters";
import {
  ESTIMATOR_MODULES, ESTIMATOR_MODULES_BY_KEY, getModuleBreakdown,
} from "./estimatorRegistry";
import { downloadCSV } from "./aioExport";

// SINGLE POINT cost summary — aggregates every section's cost components
// (pulled live from the source sub-estimates) into one combined view.
export default function AllInOneCostSummaryTab({ project, sourceProjects, grandTotal }) {
  const lineItems = project.line_items || [];

  const moduleTotals = useMemo(() =>
    ESTIMATOR_MODULES
      .map((mod) => {
        const items = lineItems.filter((li) => li.module_key === mod.key);
        return {
          mod,
          count: items.length,
          total: items.reduce((s, li) => s + (Number(li.total_snapshot) || 0), 0),
        };
      })
      .filter((s) => s.count > 0),
  [lineItems]);

  const pieData = moduleTotals
    .filter((m) => m.total > 0)
    .map((m) => ({ name: m.mod.shortName, value: m.total, color: m.mod.colors.hex }));

  const largest = lineItems.reduce(
    (best, li) => ((Number(li.total_snapshot) || 0) > (Number(best?.total_snapshot) || 0) ? li : best),
    null
  );
  const avg = lineItems.length > 0 ? grandTotal / lineItems.length : 0;

  const taxPct = Number(project.tax_percent) || 0;
  const tax = grandTotal * (taxPct / 100);
  const totalWithTax = grandTotal + tax;
  const depositPct = Number(project.deposit_percent) || 0;
  const deposit = totalWithTax * (depositPct / 100);

  const exportCSV = () => {
    const rows = [["Section", "Module", "Cost Component", "Amount"]];
    lineItems.forEach((li) => {
      const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
      if (!mod) return;
      getModuleBreakdown(mod, sourceProjects[li.project_id]).forEach((l) => {
        rows.push([li.project_name, mod.shortName, l.label, l.amount.toFixed(2)]);
      });
    });
    rows.push([]);
    rows.push(["", "", "Subtotal", grandTotal.toFixed(2)]);
    if (taxPct > 0) rows.push(["", "", `Tax (${taxPct}%)`, tax.toFixed(2)]);
    rows.push(["", "", "Grand Total", totalWithTax.toFixed(2)]);
    downloadCSV(`${project.project_name || "estimate"}-cost-summary.csv`, rows);
  };

  if (lineItems.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="py-16 text-center text-slate-500">
          <PieIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No sections yet — build sections in the Build Estimate tab and the combined cost summary appears here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="Sections" value={lineItems.length} />
        <StatCard icon={Boxes} label="Modules Used" value={moduleTotals.length} />
        <StatCard icon={TrendingUp} label="Average Section" value={fmtCurrency(avg)} />
        <StatCard icon={TrendingUp} label="Largest Section" value={fmtCurrency(largest?.total_snapshot || 0)} sub={largest?.project_name} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Distribution + totals */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center gap-2"><PieIcon className="w-5 h-5" /> Cost Distribution</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
          </CardHeader>
          <CardContent className="pt-4">
            {pieData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Totals appear once sections are calculated.</p>
            )}
            <div className="space-y-1.5 text-sm mt-4">
              {moduleTotals.map(({ mod, count, total }) => (
                <div key={mod.key} className="flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mod.colors.hex }} />
                    {mod.shortName} <span className="text-xs text-slate-400">×{count}</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {fmtCurrency(total)}
                    {grandTotal > 0 && <span className="text-xs text-slate-400 ml-1">({((total / grandTotal) * 100).toFixed(0)}%)</span>}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between font-semibold"><span>Subtotal</span><span className="tabular-nums">{fmtCurrency(grandTotal)}</span></div>
                {taxPct > 0 && <div className="flex justify-between text-slate-600"><span>Tax ({taxPct}%)</span><span className="tabular-nums">{fmtCurrency(tax)}</span></div>}
                <div className="flex justify-between font-bold text-lg"><span>Grand Total</span><span className="text-green-600 tabular-nums">{fmtCurrency(totalWithTax)}</span></div>
                {depositPct > 0 && <div className="flex justify-between text-indigo-700 text-sm"><span>Deposit due ({depositPct}%)</span><span className="tabular-nums">{fmtCurrency(deposit)}</span></div>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-section component breakdown */}
        <Card className="bg-white border-0 shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg">Section Breakdowns</CardTitle>
            <p className="text-sm text-slate-500">Cost components pulled live from each section's saved sub-estimate.</p>
          </CardHeader>
          <CardContent className="pt-4 grid md:grid-cols-2 gap-4">
            {lineItems.map((li, idx) => {
              const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
              if (!mod) return null;
              const src = sourceProjects[li.project_id];
              const lines = getModuleBreakdown(mod, src);
              const Icon = mod.icon;
              return (
                <div key={`${li.project_id}-${idx}`} className="border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${mod.colors.text}`} />
                    <span className="font-semibold text-sm text-slate-900 truncate flex-1">{li.project_name}</span>
                    <Badge className={`${mod.colors.badge} border-0 text-[10px]`}>{mod.shortName}</Badge>
                  </div>
                  {li.missing ? (
                    <p className="text-xs text-red-500">Source estimate missing.</p>
                  ) : !src ? (
                    <p className="text-xs text-slate-400">Loading breakdown…</p>
                  ) : lines.length === 0 ? (
                    <p className="text-xs text-slate-400">No costs calculated yet — open the section and save it.</p>
                  ) : (
                    <div className="space-y-1 text-xs">
                      {lines.map((l, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-slate-500">{l.label}</span>
                          <span className="tabular-nums text-slate-700">{fmtCurrency(l.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between border-t mt-2 pt-1.5 text-sm font-semibold">
                    <span>Section total</span>
                    <span className="tabular-nums">{fmtCurrency(li.total_snapshot)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="font-bold text-slate-900 truncate">{value}</p>
          {sub && <p className="text-[10px] text-slate-400 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}