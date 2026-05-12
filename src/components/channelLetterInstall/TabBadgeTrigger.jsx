import React from "react";
import { TabsTrigger } from "@/components/ui/tabs";

// Compact currency formatting: $1.2k / $980
const compact = (v) => {
  const n = parseFloat(v) || 0;
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
};

export default function TabBadgeTrigger({ value, icon: Icon, label, amount, count, warn, accent }) {
  const hasAmount = parseFloat(amount) > 0;
  return (
    <TabsTrigger
      value={value}
      className={`
        flex flex-col items-center justify-center gap-0.5 h-14 rounded-lg
        text-slate-700
        data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md
        ${accent ? "data-[state=inactive]:bg-purple-50 data-[state=inactive]:text-purple-900" : ""}
        relative transition-all
      `}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{label}</span>
        {count != null && (
          <span className="text-[10px] bg-slate-200 text-slate-700 data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-full px-1.5 py-0 leading-tight">
            {count}
          </span>
        )}
        {warn && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Action required" />
        )}
      </div>
      {hasAmount && (
        <span className="text-[10px] tabular-nums font-semibold opacity-80">
          {compact(amount)}
        </span>
      )}
    </TabsTrigger>
  );
}