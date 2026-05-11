import React from "react";

const TYPES = [
  {
    id: "flush_mount",
    label: "Flush Mount",
    description: "Letters mounted flat to wall",
    example: "e.g. retail storefront, office lobby",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/46f5905ee_generated_image.png",
    accent: "border-blue-500 bg-blue-50 text-blue-900",
    accentDot: "bg-blue-500",
  },
  {
    id: "halo_lit",
    label: "Halo-Lit",
    description: "Backlit with standoffs (reverse-lit)",
    example: "e.g. corporate HQ, restaurant exterior",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/fef3762ec_generated_image.png",
    accent: "border-amber-500 bg-amber-50 text-amber-900",
    accentDot: "bg-amber-500",
  },
  {
    id: "raceway",
    label: "Raceway",
    description: "Letters mounted on a power-feed bar",
    example: "e.g. strip mall, shopping center",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/fff304050_generated_image.png",
    accent: "border-purple-500 bg-purple-50 text-purple-900",
    accentDot: "bg-purple-500",
  },
];

export default function InstallTypePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TYPES.map(t => {
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`relative rounded-lg border-2 transition-all text-left overflow-hidden ${
              selected
                ? t.accent + " shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {selected && (
              <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${t.accentDot} z-10`} />
            )}
            <div className="w-full aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
              <img
                src={t.image}
                alt={t.label}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="p-2.5">
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="text-[10px] opacity-70 leading-tight">{t.description}</div>
              <div className="text-[9px] opacity-60 leading-tight mt-1 italic">{t.example}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}