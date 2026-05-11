import React from "react";

// Visual representation — bar height roughly proportional to size tier
const SIZES = [
  { id: "small", label: "Small", range: '12"-18"', barHeight: 18 },
  { id: "medium", label: "Medium", range: '18"-30"', barHeight: 30 },
  { id: "large", label: "Large", range: '30"-48"', barHeight: 44 },
  { id: "extra_large", label: "XL", range: '48"+', barHeight: 60 },
];

export default function LetterSizePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {SIZES.map(s => {
        const selected = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`relative flex flex-col items-center justify-end p-2 rounded-lg border-2 transition-all min-h-[80px] ${
              selected
                ? "border-purple-500 bg-purple-50 text-purple-900 shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
            title={s.range}
          >
            <div
              className={`w-3 rounded-sm transition-colors ${selected ? "bg-purple-500" : "bg-slate-400"}`}
              style={{ height: `${s.barHeight}px` }}
            />
            <div className="text-[11px] font-semibold mt-1">{s.label}</div>
            <div className="text-[9px] opacity-70">{s.range}</div>
          </button>
        );
      })}
    </div>
  );
}