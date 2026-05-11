import React from "react";
import CyclingImage from "./CyclingImage";

const BASE = "https://media.base44.com/images/public/68a5a85045cf8570330146ef/";

const TYPES = [
  {
    id: "flush_mount",
    label: "Flush Mount",
    description: "Letters mounted flat to wall",
    example: "e.g. retail storefront, office lobby",
    images: [
      "46f5905ee", "fd278dec8", "faf76c3b9", "542d1f9e2", "f0fded6fa",
      "fda8d07c6", "21c9bc4fb", "b052daeed", "79c16ffc7", "80af1236c",
    ],
    accent: "border-blue-500 bg-blue-50 text-blue-900",
    accentDot: "bg-blue-500",
  },
  {
    id: "halo_lit",
    label: "Halo-Lit",
    description: "Backlit with standoffs (reverse-lit)",
    example: "e.g. corporate HQ, restaurant exterior",
    images: [
      "fef3762ec", "79bd2c918", "0bcccdd3a", "8f1f68269", "21925927d",
      "62fb6f9ab", "67db77fb8", "793fd8120", "afbe69411", "041c2928a",
    ],
    accent: "border-amber-500 bg-amber-50 text-amber-900",
    accentDot: "bg-amber-500",
  },
  {
    id: "raceway",
    label: "Raceway",
    description: "Letters mounted on a power-feed bar",
    example: "e.g. strip mall, shopping center",
    images: [
      "fff304050", "ab23bffd2", "26917ff97", "239f865d9", "b339c00ca",
      "ce9921b80", "de8222d6f", "59168c7bd", "69bb91603", "9daa9d8ad",
    ],
    accent: "border-purple-500 bg-purple-50 text-purple-900",
    accentDot: "bg-purple-500",
  },
].map(t => ({ ...t, images: t.images.map(id => `${BASE}${id}_generated_image.png`) }));

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
            <CyclingImage
              images={t.images}
              alt={t.label}
              className="w-full aspect-video"
              intervalMs={5000}
            />
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