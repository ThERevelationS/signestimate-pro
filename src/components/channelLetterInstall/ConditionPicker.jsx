import React from "react";
import { Check } from "lucide-react";
import CyclingImage from "./CyclingImage";

const BASE = "https://media.base44.com/images/public/68a5a85045cf8570330146ef/";

const CONDITIONS = [
  {
    id: "thick_hollow_walls",
    label: "Thick / Hollow Walls",
    description: "Brick veneer, masonry, hollow cavity",
    images: [
      "354337612", "84462815e", "5b7a796e9", "3e74960b9", "f3485fd9a",
      "bf147d559", "d188f44b1", "5d1898ed4", "084e9cdf8", "dade9676f",
    ],
    accent: "border-orange-500 bg-orange-50 text-orange-900",
    accentDot: "bg-orange-500",
  },
  {
    id: "parapet",
    label: "Parapet",
    description: "Working over rooftop edge wall",
    images: [
      "46e545715", "dc634e87b", "d20b09c6e", "f0be4b794", "4678784bb",
      "f56669274", "43a05074f", "46609c428", "50ac973f7", "0b19729fe",
    ],
    accent: "border-red-500 bg-red-50 text-red-900",
    accentDot: "bg-red-500",
  },
  {
    id: "poor_electrical_access",
    label: "Poor Electrical Access",
    description: "Difficult conduit / power routing",
    images: [
      "1ec96707a", "d5ae58684", "57fcecc8c", "c5347f3af", "509147fed",
      "6b56939ac", "dcf9c1adc", "8ec6bf0fe", "e09579e01", "0915a9043",
    ],
    accent: "border-yellow-500 bg-yellow-50 text-yellow-900",
    accentDot: "bg-yellow-500",
  },
].map(c => ({ ...c, images: c.images.map(id => `${BASE}${id}_generated_image.png`) }));

export default function ConditionPicker({ values, onChange }) {
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
            <CyclingImage
              images={c.images}
              alt={c.label}
              className="w-full aspect-video"
              intervalMs={3000}
            />
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