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
  {
    id: "escort_required",
    label: "Escort Required",
    description: "Must be escorted on-site at all times",
    images: [
      "2f0c1de7c", "c687a46d3", "1c49571c6", "412d12b68", "ffb60cf1f",
      "917adf941", "700611476", "4650bb73b", "b42272e3d",
    ],
    accent: "border-sky-500 bg-sky-50 text-sky-900",
    accentDot: "bg-sky-500",
  },
  {
    id: "badging_checkin",
    label: "Badging / Check-in",
    description: "Security badge or sign-in required",
    images: [
      "f2ded6395", "aa55e3ae9", "cf1cadee6", "388fcc5a8", "b45f279f4",
      "0f1161fe7", "39a14f0a2", "4200e28a3", "891770826",
    ],
    accent: "border-indigo-500 bg-indigo-50 text-indigo-900",
    accentDot: "bg-indigo-500",
  },
  {
    id: "after_hours_weekend",
    label: "After-Hours / Weekend",
    description: "Night, early morning, or weekend install",
    images: [
      "1cdf0e29e", "f58ad5ed6", "ac51fe06c", "e1e776e0f", "42caaf28b",
      "de4312c59", "89abe805e", "287c5d801", "ae9640c42",
    ],
    accent: "border-violet-500 bg-violet-50 text-violet-900",
    accentDot: "bg-violet-500",
  },
  {
    id: "poor_site_access",
    label: "Poor Site Access",
    description: "No lift room, obstructions, tight space",
    images: [
      "786a757c7", "16a9c332e", "f1fb9a541", "028ff7b47", "22d9b1525",
      "e9785417c", "7794ec650", "87e0ab013", "28eb113ca",
    ],
    accent: "border-rose-500 bg-rose-50 text-rose-900",
    accentDot: "bg-rose-500",
  },
].map(c => ({ ...c, images: c.images.map(id => `${BASE}${id}_generated_image.png`) }));

export default function ConditionPicker({ values, onChange }) {
  const toggle = (id) => onChange({ ...values, [id]: !values[id] });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
              intervalMs={5000}
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