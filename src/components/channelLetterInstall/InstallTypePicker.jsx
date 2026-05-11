import React from "react";
import { Square, Sun, Layers } from "lucide-react";

const TYPES = [
  {
    id: "flush_mount",
    label: "Flush Mount",
    description: "Letters mounted flat to wall",
    icon: Square,
    accent: "border-blue-500 bg-blue-50 text-blue-900",
    accentDot: "bg-blue-500",
  },
  {
    id: "halo_lit",
    label: "Halo-Lit",
    description: "Backlit with standoffs",
    icon: Sun,
    accent: "border-amber-500 bg-amber-50 text-amber-900",
    accentDot: "bg-amber-500",
  },
  {
    id: "raceway",
    label: "Raceway",
    description: "Letters on mounted bar",
    icon: Layers,
    accent: "border-purple-500 bg-purple-50 text-purple-900",
    accentDot: "bg-purple-500",
  },
];

export default function InstallTypePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TYPES.map(t => {
        const Icon = t.icon;
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`relative p-3 rounded-lg border-2 transition-all text-left ${
              selected
                ? t.accent + " shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {selected && (
              <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${t.accentDot}`} />
            )}
            <Icon className="w-5 h-5 mb-1.5" />
            <div className="text-sm font-semibold">{t.label}</div>
            <div className="text-[10px] opacity-70 leading-tight">{t.description}</div>
          </button>
        );
      })}
    </div>
  );
}