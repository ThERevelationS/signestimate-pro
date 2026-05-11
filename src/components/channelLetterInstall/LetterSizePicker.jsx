import React from "react";

// Visual representation with real-world examples
const SIZES = [
  { id: "small", label: "Small", range: '12"-18"', example: "Storefront window", barHeight: 16 },
  { id: "medium", label: "Medium", range: '18"-30"', example: "Standard storefront", barHeight: 26 },
  { id: "large", label: "Large", range: '30"-48"', example: "Building façade", barHeight: 38 },
  { id: "extra_large", label: "XL", range: '48"-60"', example: "Highway-visible sign", barHeight: 50 },
  { id: "extra_extra_large", label: "XXL", range: '60"+', example: "Monument / tower sign", barHeight: 62 },
];

export default function LetterSizePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {SIZES.map(s => {
        const selected = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`relative flex flex-col items-center justify-end p-2 rounded-lg border-2 transition-all min-h-[100px] ${
              selected
                ? "border-purple-500 bg-purple-50 text-purple-900 shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
            title={`${s.range} — ${s.example}`}
          >
            <div
              className={`w-3 rounded-sm transition-colors ${selected ? "bg-purple-500" : "bg-slate-400"}`}
              style={{ height: `${s.barHeight}px` }}
            />
            <div className="text-[11px] font-semibold mt-1">{s.label}</div>
            <div className="text-[9px] opacity-70">{s.range}</div>
            <div className="text-[8px] opacity-60 text-center leading-tight mt-0.5">{s.example}</div>
          </button>
        );
      })}
    </div>
  );
}