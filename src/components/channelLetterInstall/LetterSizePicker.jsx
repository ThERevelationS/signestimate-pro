import React from "react";

const SIZES = [
  {
    id: "extra_small",
    label: "XS",
    range: '2"-8"',
    example: "Door / suite plaque",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/555cbbeca_generated_image.png",
  },
  {
    id: "small",
    label: "Small",
    range: '8"-12"',
    example: "Window / shop sign",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/e2e2d9788_generated_image.png",
  },
  {
    id: "medium",
    label: "Medium",
    range: '12"-24"',
    example: "Standard storefront",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/f75172321_generated_image.png",
  },
  {
    id: "large",
    label: "Large",
    range: '24"-48"',
    example: "Building façade",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/61ed95929_generated_image.png",
  },
  {
    id: "extra_large",
    label: "XL",
    range: '48"-60"',
    example: "Highway-visible sign",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/0a7924cfe_generated_image.png",
  },
  {
    id: "extra_extra_large",
    label: "XXL",
    range: '60"+',
    example: "Monument / tower sign",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/918d12caf_generated_image.png",
  },
];

export default function LetterSizePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
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
            <div className="w-full aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
              <img
                src={s.image}
                alt={`${s.label} channel letters`}
                className="w-full h-full object-contain"
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