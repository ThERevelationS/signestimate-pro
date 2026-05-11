import React from "react";

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

export default function CostBreakdownBar({ labor = 0, materials = 0, supplies = 0 }) {
  const total = labor + materials + supplies;
  if (total <= 0) return null;

  const laborPct = (labor / total) * 100;
  const materialsPct = (materials / total) * 100;
  const suppliesPct = (supplies / total) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
        {laborPct > 0 && (
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${laborPct}%` }}
            title={`Labor: ${fmt(labor)} (${laborPct.toFixed(0)}%)`}
          />
        )}
        {materialsPct > 0 && (
          <div
            className="bg-purple-500 transition-all"
            style={{ width: `${materialsPct}%` }}
            title={`Materials: ${fmt(materials)} (${materialsPct.toFixed(0)}%)`}
          />
        )}
        {suppliesPct > 0 && (
          <div
            className="bg-amber-500 transition-all"
            style={{ width: `${suppliesPct}%` }}
            title={`Supplies: ${fmt(supplies)} (${suppliesPct.toFixed(0)}%)`}
          />
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500" /> Labor {laborPct.toFixed(0)}%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500" /> Materials {materialsPct.toFixed(0)}%</span>
        {suppliesPct > 0 && (
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> Supplies {suppliesPct.toFixed(0)}%</span>
        )}
      </div>
    </div>
  );
}