import React from "react";
import { ACTIONS, ACTION_GROUPS, ACTIONS_FOR_SIGN_TYPE } from "./constants";
import { Check } from "lucide-react";

export default function ActionPicker({ signType, selected, onToggle }) {
  const applicable = ACTIONS_FOR_SIGN_TYPE[signType] || [];
  const grouped = ACTION_GROUPS.map(group => ({
    group,
    actions: ACTIONS.filter(a => a.group === group && applicable.includes(a.id)),
  })).filter(g => g.actions.length > 0);

  if (!signType) {
    return <div className="text-xs text-slate-400 italic">Pick a sign type first to see applicable maintenance actions.</div>;
  }

  return (
    <div className="space-y-3">
      {grouped.map(g => (
        <div key={g.group}>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{g.group}</div>
          <div className="flex flex-wrap gap-1.5">
            {g.actions.map(a => {
              const on = selected.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onToggle(a.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                    on
                      ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-cyan-300"
                  }`}
                >
                  {on && <Check className="w-3 h-3" />}
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}