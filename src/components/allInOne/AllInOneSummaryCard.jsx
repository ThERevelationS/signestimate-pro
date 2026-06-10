import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calculator } from "lucide-react";
import { fmtCurrency } from "@/lib/formatters";
import { ESTIMATOR_MODULES } from "./estimatorRegistry";

// Per-module subtotals + grand total. Renders from the registry so future
// estimator modules appear automatically.
export default function AllInOneSummaryCard({ lineItems, grandTotal, onRefresh, refreshing }) {
  const subtotals = useMemo(() => {
    return ESTIMATOR_MODULES
      .map((mod) => {
        const items = lineItems.filter((li) => li.module_key === mod.key);
        return {
          mod,
          count: items.length,
          total: items.reduce((sum, li) => sum + (Number(li.total_snapshot) || 0), 0),
        };
      })
      .filter((s) => s.count > 0);
  }, [lineItems]);

  return (
    <Card className="bg-white border-0 shadow-sm sticky top-8">
      <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="w-5 h-5" /> Combined Summary
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing || lineItems.length === 0}>
          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Totals
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {subtotals.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No estimates attached yet. Attach estimates from any module to build the combined total.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {subtotals.map(({ mod, count, total }) => {
              const Icon = mod.icon;
              return (
                <div key={mod.key} className="flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${mod.colors.text}`} />
                    {mod.shortName}
                    <span className="text-xs text-slate-400">×{count}</span>
                  </span>
                  <span className="font-medium">{fmtCurrency(total)}</span>
                </div>
              );
            })}
            <div className="flex justify-between font-bold text-lg border-t pt-3 mt-3">
              <span>Grand Total:</span>
              <span className="text-green-600">{fmtCurrency(grandTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}