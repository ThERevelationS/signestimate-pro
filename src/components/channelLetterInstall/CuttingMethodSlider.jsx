import React from "react";
import { Router, Zap } from "lucide-react";

/**
 * Segmented button slider for picking the cutting method.
 * Used inline in DimensionalFabPanel and BackerFabPanel.
 */
export default function CuttingMethodSlider({ value, onChange, disabled = false }) {
  const options = [
    { key: "cnc",   label: "CNC Routing",   icon: Router, activeBg: "bg-green-600", activeIcon: "text-white" },
    { key: "laser", label: "Laser Cutting", icon: Zap,    activeBg: "bg-red-600",   activeIcon: "text-white" },
  ];

  return (
    <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1 w-full max-w-md">
      {options.map((opt) => {
        const active = value === opt.key;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className={[
              "flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-all",
              active
                ? `${opt.activeBg} text-white shadow-sm`
                : "text-slate-600 hover:bg-white hover:text-slate-900",
              disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            <Icon className={`w-4 h-4 ${active ? opt.activeIcon : ""}`} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}