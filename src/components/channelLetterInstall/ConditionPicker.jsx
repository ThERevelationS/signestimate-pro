import React from "react";
import { Check } from "lucide-react";

const CONDITIONS = [
  {
    id: "thick_hollow_walls",
    label: "Thick / Hollow Walls",
    description: "Brick veneer, masonry, hollow cavity",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/354337612_generated_image.png",
    accent: "border-orange-500 bg-orange-50 text-orange-900",
    accentDot: "bg-orange-500",
  },
  {
    id: "parapet",
    label: "Parapet",
    description: "Working over rooftop edge wall",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/46e545715_generated_image.png",
    accent: "border-red-500 bg-red-50 text-red-900",
    accentDot: "bg-red-500",
  },
  {
    id: "poor_electrical_access",
    label: "Poor Electrical Access",
    description: "Difficult conduit / power routing",
    image: "https://media.base44.com/images/public/68a5a85045cf8570330146ef/1ec96707a_generated_image.png",
    accent: "border-yellow-500 bg-yellow-50 text-yellow-900",
    accentDot: "bg-yellow-500",
  },
];

export default function ConditionPicker({ values, onChange }) {
  // values is an object: { thick_hollow_walls: bool, parapet: bool, poor_electrical_access: bool }
  const toggle = (id) => onChange({ ...values, [id]: !values[id] });

  return (
    <div className="grid grid-cols-3 gap-2">
      {CONDITIONS.map(c => {
        const selected = !!values[c.id];
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            className={`relative rounded-lg border-2 transition-all text-left overflow-hidden ${
              selected
                ? c.accent + " shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {selected && (
              <div className={`absolute top-2 right-2 w-5 h-5 rounded-full ${c.accentDot} flex items-center justify-center z-10`}>
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <div className="w-full aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
              <img
                src={c.image}
                alt={c.label}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="p-2.5">
              <div className="text-sm font-semibold">{c.label}</div>
              <div className="text-[10px] opacity-70 leading-tight">{c.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}