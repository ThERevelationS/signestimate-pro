import React from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Ruler, Clock, Zap, Wrench, Sparkles, Lightbulb } from "lucide-react";
import { SIGN_TYPES, ACTIONS, ACTION_GROUPS, ACTIONS_FOR_SIGN_TYPE, LETTER_SIZES, CABINET_SIZES, sizeAxisFor } from "./constants";
import { SIZE_FIELD } from "./defaults";
import SectionCard, { AnimatedGrid } from "./SectionCard";

// Per-action-group styling — color + icon
const GROUP_THEMES = {
  "Cosmetic":   { Icon: Sparkles,   bar: "from-pink-400 to-rose-500",        text: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200" },
  "LED / Lamp": { Icon: Lightbulb,  bar: "from-amber-400 to-orange-500",     text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" },
  "Electrical": { Icon: Zap,        bar: "from-yellow-400 to-amber-500",     text: "text-yellow-700",  bg: "bg-yellow-50",  border: "border-yellow-200" },
  "Component":  { Icon: Wrench,     bar: "from-violet-400 to-purple-500",    text: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200" },
};

// Per-sign-type tab styling — uses the sign type's color
const SIGN_TYPE_ACTIVE_BG = {
  blue:    "data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500    data-[state=active]:to-blue-700",
  amber:   "data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500   data-[state=active]:to-orange-600",
  purple:  "data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500  data-[state=active]:to-purple-700",
  teal:    "data-[state=active]:bg-gradient-to-br data-[state=active]:from-teal-500    data-[state=active]:to-teal-700",
  indigo:  "data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-500  data-[state=active]:to-indigo-700",
  stone:   "data-[state=active]:bg-gradient-to-br data-[state=active]:from-stone-500   data-[state=active]:to-stone-700",
  slate:   "data-[state=active]:bg-gradient-to-br data-[state=active]:from-slate-500   data-[state=active]:to-slate-700",
  emerald: "data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-700",
};

// One card per (action) showing every size as a small numeric input.
function ActionRateCard({ action, signType, rate, isLocked, onChange }) {
  const isCabinet = sizeAxisFor(signType.id) === "cabinet";
  const sizes = isCabinet ? CABINET_SIZES : LETTER_SIZES;
  const basis = rate.rate_basis || (isCabinet ? "per_cabinet" : "per_letter");
  const isFlat = basis === "flat";
  const theme = GROUP_THEMES[action.group] || GROUP_THEMES["Component"];
  const Icon = theme.Icon;

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`border ${theme.border} rounded-xl bg-white hover:shadow-md transition-shadow overflow-hidden`}
    >
      <div className={`h-1 bg-gradient-to-r ${theme.bar}`} />
      <div className={`px-4 py-3 ${theme.bg}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.bar} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${theme.text} truncate`}>{action.label}</div>
              <div className="text-[11px] text-slate-500">
                {isFlat ? "Flat per service item" : `Per ${isCabinet ? "cabinet" : "letter"}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            <Clock className="w-3 h-3" />
            min
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Basis selector */}
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Rate Basis</Label>
          <select
            className={`h-9 w-full rounded-md border border-slate-200 text-xs bg-white px-2 mt-1 disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all focus:border-transparent`}
            style={{ outlineColor: undefined }}
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
            <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Minutes (flat)</Label>
            <Input
              type="number" min="0" step="1"
              value={rate.base_minutes_flat ?? 0}
              disabled={isLocked}
              onChange={(e) => onChange({ base_minutes_flat: parseFloat(e.target.value) || 0 })}
              className="h-9 text-sm tabular-nums mt-1 focus:ring-2 focus:ring-slate-200 transition-all"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {sizes.map(sz => {
              const field = SIZE_FIELD[sz.id];
              return (
                <div key={sz.id}>
                  <Label className={`text-[10px] font-semibold ${theme.text}`}>{sz.label}</Label>
                  <Input
                    type="number" min="0" step="1"
                    value={rate[field] ?? 0}
                    disabled={isLocked}
                    onChange={(e) => onChange({ [field]: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-sm tabular-nums mt-1 focus:ring-2 focus:ring-slate-200 transition-all"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
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
      <motion.p
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-xs text-slate-600 italic bg-slate-50 border-l-2 border-cyan-400 px-3 py-2 rounded-r-lg"
      >
        {signType.description}.
      </motion.p>
      {grouped.map((g, idx) => {
        const theme = GROUP_THEMES[g.group] || GROUP_THEMES["Component"];
        const Icon = theme.Icon;
        return (
          <motion.div
            key={g.group}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.06 }}
          >
            <div className={`flex items-center gap-2 mb-3 ${theme.text}`}>
              <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${theme.bar} flex items-center justify-center`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider">{g.group}</div>
              <div className={`flex-1 h-px bg-gradient-to-r ${theme.bar} opacity-30`} />
            </div>
            <AnimatedGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            </AnimatedGrid>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function RatesBySignTypeTab({ rateMap, isLocked, onChangeRate }) {
  return (
    <SectionCard
      icon={Ruler}
      theme="cyan"
      title="Action Rates"
      description="Minutes per letter (or per cabinet) by sign type and action. The estimator multiplies these by quantity and applies height + site multipliers."
    >
      <Tabs defaultValue={SIGN_TYPES[0].id} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-5 h-auto p-1.5 gap-1 bg-cyan-50/40 border border-cyan-100 rounded-xl">
          {SIGN_TYPES.map(st => (
            <TabsTrigger
              key={st.id}
              value={st.id}
              className={`py-2 text-xs rounded-lg transition-all data-[state=active]:text-white data-[state=active]:shadow-md ${SIGN_TYPE_ACTIVE_BG[st.color] || SIGN_TYPE_ACTIVE_BG.slate}`}
            >
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
    </SectionCard>
  );
}