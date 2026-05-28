// Per-workflow personnel (Designer / Printer Op / Installer / Helper, etc.)
// Each row has a role, hourly_rate, hours. When ANY row has hours > 0, the
// calculator uses these rows for labor cost INSTEAD of operator_rate × minutes.
// This gives proper role-based costing.

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, X } from "lucide-react";

const ROLE_PRESETS = [
  { id: "Designer",       defaultRate: 65 },
  { id: "Pre-Press",      defaultRate: 55 },
  { id: "Printer Op",     defaultRate: 55 },
  { id: "Cutter Op",      defaultRate: 50 },
  { id: "Laminator Op",   defaultRate: 45 },
  { id: "Weeder",         defaultRate: 38 },
  { id: "Application Tech", defaultRate: 45 },
  { id: "Installer",      defaultRate: 65 },
  { id: "Helper",         defaultRate: 32 },
];

const num = (v) => parseFloat(v) || 0;

export default function VinylWorkflowPersonnel({ personnel = [], onChange, suggestedHours = 0 }) {
  const update = (idx, patch) => {
    const next = [...personnel];
    next[idx] = { ...next[idx], ...patch };
    next[idx].total_cost = num(next[idx].hourly_rate) * num(next[idx].hours);
    onChange(next);
  };
  const remove = (idx) => onChange(personnel.filter((_, i) => i !== idx));
  const add = (role) => {
    const preset = ROLE_PRESETS.find(r => r.id === role) || { id: role, defaultRate: 50 };
    onChange([...(personnel || []), {
      role: preset.id,
      hourly_rate: preset.defaultRate,
      hours: 0,
      total_cost: 0,
    }]);
  };

  const totalCost  = personnel.reduce((s, p) => s + num(p.total_cost), 0);
  const totalHours = personnel.reduce((s, p) => s + num(p.hours), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" /> Workflow Personnel
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value="" onValueChange={(v) => v && add(v)}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="+ Add role…" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_PRESETS.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.id} · ${r.defaultRate}/hr</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {personnel.length === 0 ? (
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-3">
            No per-role personnel set. Labor is being calculated at the printer's operator rate
            ({suggestedHours.toFixed(2)} hr machine + weeding + install). Add roles above for
            granular Designer / Printer / Installer costing.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-slate-500">
              <div className="col-span-5">Role</div>
              <div className="col-span-3 text-right">$/hr</div>
              <div className="col-span-2 text-right">Hours</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {personnel.map((p, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input value={p.role || ""} onChange={(e) => update(idx, { role: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="col-span-3">
                  <Input type="number" step="0.5" value={p.hourly_rate ?? ""} onChange={(e) => update(idx, { hourly_rate: e.target.value })}
                    className="h-8 text-sm text-right tabular-nums" />
                </div>
                <div className="col-span-2">
                  <Input type="number" step="0.25" value={p.hours ?? ""} onChange={(e) => update(idx, { hours: e.target.value })}
                    className="h-8 text-sm text-right tabular-nums" />
                </div>
                <div className="col-span-1 text-right text-sm tabular-nums">
                  ${num(p.total_cost).toFixed(2)}
                </div>
                <div className="col-span-1 text-right">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(idx)}>
                    <X className="w-3.5 h-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-500">{totalHours.toFixed(2)} hr total</span>
              <span className="font-semibold tabular-nums">${totalCost.toFixed(2)}</span>
            </div>
          </>
        )}
        {personnel.length === 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            <span className="text-[10px] text-slate-500 mr-1">Quick add:</span>
            {["Designer", "Printer Op", "Installer"].map(role => (
              <Button key={role} size="sm" variant="outline" className="h-6 text-xs" onClick={() => add(role)}>
                <Plus className="w-3 h-3 mr-1" /> {role}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}