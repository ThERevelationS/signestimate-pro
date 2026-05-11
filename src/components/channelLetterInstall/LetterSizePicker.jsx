import React from "react";

const SIZES = [
  {
    id: "small",
    label: "Small",
    range: '12"-18"',
    example: "Storefront window",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/d95004aa0_generated_image.png",
  },
  {
    id: "medium",
    label: "Medium",
    range: '18"-30"',
    example: "Standard storefront",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/2e9fe45a6_generated_image.png",
  },
  {
    id: "large",
    label: "Large",
    range: '30"-48"',
    example: "Building façade",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/42f552d5a_generated_image.png",
  },
  {
    id: "extra_large",
    label: "XL",
    range: '48"-60"',
    example: "Highway-visible sign",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/a9782cfc1_generated_image.png",
  },
  {
    id: "extra_extra_large",
    label: "XXL",
    range: '60"+',
    example: "Monument / tower sign",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/05698e527_generated_image.png",
  },
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
            className={`relative rounded-lg border-2 transition-all overflow-hidden text-left ${
              selected
                ? "border-purple-500 bg-purple-50 text-purple-900 shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
            title={`${s.range} — ${s.example}`}
          >
            <div className="w-full h-16 bg-slate-100 overflow-hidden">
              <img
                src={s.image}
                alt={`${s.label} channel letters`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-1.5 text-center">
              <div className="text-[11px] font-semibold">{s.label}</div>
              <div className="text-[9px] opacity-70">{s.range}</div>
              <div className="text-[8px] opacity-60 leading-tight mt-0.5">{s.example}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}