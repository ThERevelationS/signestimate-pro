import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Package, Search } from "lucide-react";
import { fmtCurrency } from "@/lib/formatters";
import {
  ESTIMATOR_MODULES_BY_KEY, getModuleDetailLines, getModuleBreakdown,
} from "./estimatorRegistry";
import { downloadCSV } from "./aioExport";

// SINGLE POINT bill of materials — every section's line items (letters,
// equipment, crew, foundations, …) aggregated into one searchable table.
export default function AllInOneBOMTab({ project, sourceProjects }) {
  const [search, setSearch] = useState("");
  const lineItems = project.line_items || [];

  const allRows = useMemo(() => {
    const rows = [];
    lineItems.forEach((li) => {
      const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
      if (!mod || li.missing) return;
      const src = sourceProjects[li.project_id];
      if (!src) return;
      let lines = getModuleDetailLines(mod, src);
      if (lines.length === 0) {
        // Fall back to the cost breakdown so every section is represented.
        lines = getModuleBreakdown(mod, src).map((l) => ({
          group: "Cost Component", name: l.label, qty: 1, cost: l.amount,
        }));
      }
      lines.forEach((l) => rows.push({ ...l, section: li.project_name, mod }));
    });
    return rows;
  }, [lineItems, sourceProjects]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.toLowerCase();
    return allRows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.group.toLowerCase().includes(q) ||
      (r.section || "").toLowerCase().includes(q) ||
      r.mod.shortName.toLowerCase().includes(q)
    );
  }, [allRows, search]);

  const totalCost = filtered.reduce((s, r) => s + (r.cost || 0), 0);

  const exportCSV = () => {
    const rows = [["Section", "Module", "Group", "Item", "Qty", "Cost"]];
    filtered.forEach((r) => rows.push([r.section, r.mod.shortName, r.group, r.name, r.qty, (r.cost || 0).toFixed(2)]));
    rows.push([]);
    rows.push(["", "", "", "Total", "", totalCost.toFixed(2)]);
    downloadCSV(`${project.project_name || "estimate"}-bill-of-materials.csv`, rows);
  };

  if (lineItems.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="py-16 text-center text-slate-500">
          <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No sections yet — the combined bill of materials appears once you build sections.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="border-b border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" /> Combined Bill of Materials
            <Badge variant="outline" className="ml-1">{filtered.length} lines</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
        </div>
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input className="pl-8 h-9" placeholder="Search items, groups, sections…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {allRows.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            Line items appear here once sections are built and saved (loading from source estimates…).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 border-b">
                  <th className="py-2 pr-3 font-medium">Section</th>
                  <th className="py-2 pr-3 font-medium">Module</th>
                  <th className="py-2 pr-3 font-medium">Group</th>
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium text-right">Qty</th>
                  <th className="py-2 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-3 text-slate-600 max-w-[180px] truncate">{r.section}</td>
                    <td className="py-2 pr-3"><Badge className={`${r.mod.colors.badge} border-0 text-[10px]`}>{r.mod.shortName}</Badge></td>
                    <td className="py-2 pr-3 text-slate-500 text-xs">{r.group}</td>
                    <td className="py-2 pr-3 text-slate-900 max-w-[280px] truncate">{r.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{r.qty}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{r.cost ? fmtCurrency(r.cost) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={5} className="py-2.5 pr-3 text-right">Total (listed lines)</td>
                  <td className="py-2.5 text-right tabular-nums text-green-600">{fmtCurrency(totalCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}