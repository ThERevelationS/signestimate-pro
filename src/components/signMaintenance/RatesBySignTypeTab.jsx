import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Ruler, Clock } from "lucide-react";
import { SIGN_TYPES, ACTIONS, ACTION_GROUPS, ACTIONS_FOR_SIGN_TYPE, LETTER_SIZES, CABINET_SIZES, sizeAxisFor } from "./constants";
import { SIZE_FIELD } from "./defaults";

// One card per (action) showing every size as a small numeric input.
// Looks/feels like the BaseTimesSizeCard grid on the Channel Letter Settings page.
function ActionRateCard({ action, signType, rate, isLocked, onChange }) {
  const isCabinet = sizeAxisFor(signType.id) === "cabinet";
  const sizes = isCabinet ? CABINET_SIZES : LETTER_SIZES;
  const basis = rate.rate_basis || (isCabinet ? "per_cabinet" : "per_letter");
  const isFlat = basis === "flat";

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50/80 transition-colors">
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{action.label}</div>
          <div className="text-[11px] text-slate-500">
            {isFlat ? "Flat per service item" : `Per ${isCabinet ? "cabinet" : "letter"}`}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
          <Clock className="w-3 h-3" />
          minutes
        </div>
      </div>

      {/* Basis selector */}
      <div className="mb-3">
        <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Rate Basis</Label>
        <select
          className="h-9 w-full rounded-md border border-slate-200 text-xs bg-white px-2 mt-1 disabled:bg-slate-50"
          value={basis}
          disabled={isLocked}
          onChange={(e) => onChange({ rate_basis: e.target.value })}
        >
          <option value={isCabinet ? "per_cabinet" : "per_letter"}>{isCabinet ? "Per cabinet" : "Per letter"}</option>
          <option value="flat">Flat per service item</option>
        </select>
      </div>

      {isFlat ? (
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Minutes (flat)</Label>
          <Input
            type="number" min="0" step="1"
            value={rate.base_minutes_flat ?? 0}
            disabled={isLocked}
            onChange={(e) => onChange({ base_minutes_flat: parseFloat(e.target.value) || 0 })}
            className="h-9 text-sm tabular-nums mt-1"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {sizes.map(sz => {
            const field = SIZE_FIELD[sz.id];
            return (
              <div key={sz.id}>
                <Label className="text-[10px] text-slate-500 font-medium">{sz.label}</Label>
                <Input
                  type="number" min="0" step="1"
                  value={rate[field] ?? 0}
                  disabled={isLocked}
                  onChange={(e) => onChange({ [field]: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-sm tabular-nums mt-1"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// One full sub-tab — all applicable actions for one sign type, grouped.
function SignTypePane({ signType, rateMap, isLocked, onChange }) {
  const applicable = ACTIONS_FOR_SIGN_TYPE[signType.id] || [];
  const grouped = ACTION_GROUPS.map(group => ({
    group,
    actions: ACTIONS.filter(a => a.group === group && applicable.includes(a.id)),
  })).filter(g => g.actions.length > 0);

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 italic">{signType.description}.</p>
      {grouped.map(g => (
        <div key={g.group}>
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">{g.group}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {g.actions.map(a => (
              <ActionRateCard
                key={a.id}
                action={a}
                signType={signType}
                rate={rateMap.get(`${signType.id}|${a.id}`) || {}}
                isLocked={isLocked}
                onChange={(patch) => onChange(signType.id, a.id, patch)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RatesBySignTypeTab({ rateMap, isLocked, onChangeRate }) {
  return (
    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Ruler className="w-5 h-5 text-slate-700" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">Action Rates</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Minutes per letter (or per cabinet) by sign type and action. The estimator multiplies these by quantity and applies height + site multipliers.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-6">
        <Tabs defaultValue={SIGN_TYPES[0].id} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-5 h-auto p-1 gap-1">
            {SIGN_TYPES.map(st => (
              <TabsTrigger key={st.id} value={st.id} className="py-2 text-xs">
                {st.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {SIGN_TYPES.map(st => (
            <TabsContent key={st.id} value={st.id} className="space-y-4">
              <SignTypePane signType={st} rateMap={rateMap} isLocked={isLocked} onChange={onChangeRate} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}