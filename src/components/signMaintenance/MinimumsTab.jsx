import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge } from "lucide-react";
import { SIGN_TYPES } from "./constants";
import { DEFAULT_MIN_HOURS } from "./defaults";

// Minimum billable hours per sign type. When a service item's calculated
// labor hours come in BELOW this floor, the estimator bumps it up.
export const minimumSettingKey = (signTypeId) => `maintenance_min_hours_${signTypeId}`;

export default function MinimumsTab({ globalSettings, setGlobalSettings, isLocked }) {
  return (
    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Gauge className="w-5 h-5 text-slate-700" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">Minimum Rates by Sign Type</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Minimum billable labor hours per service item. If the calculated labor for a service item comes in below this floor, the estimator bumps it up.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SIGN_TYPES.map(st => {
          const key = minimumSettingKey(st.id);
          const val = globalSettings[key] ?? String(DEFAULT_MIN_HOURS[st.id] ?? 2);
          return (
            <div key={st.id}>
              <div className="flex items-baseline justify-between mb-1.5">
                <Label htmlFor={key} className="text-sm font-medium text-slate-800">{st.label}</Label>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">hrs (min)</span>
              </div>
              <Input
                id={key}
                type="number" min="0" step="0.25"
                value={val}
                disabled={isLocked}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, [key]: e.target.value }))}
                className="h-10 bg-white text-sm tabular-nums font-medium"
              />
              <p className="mt-1.5 text-[11px] text-slate-500 leading-tight">{st.description}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}