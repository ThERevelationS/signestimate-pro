import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight } from "lucide-react";

// Shared building blocks for the Quote Settings panel groups.

export const SettingsGroup = ({ title, icon: Icon, count, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-left"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        {Icon && <Icon className="w-3.5 h-3.5 text-indigo-600" />}
        <span className="text-xs font-semibold text-slate-700 flex-1">{title}</span>
        {count !== undefined && <span className="text-[10px] text-slate-400">{count}</span>}
      </button>
      {open && <div className="p-3 space-y-2.5 bg-white">{children}</div>}
    </div>
  );
};

export const TextField = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <Input className="h-8" type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export const NumField = ({ label, value, onChange, min = 0, step = 1, suffix }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <div className="flex items-center gap-1.5">
      <Input
        className="h-8 w-24"
        type="number"
        min={min}
        step={step}
        value={value ?? 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
      />
      {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
    </div>
  </div>
);

export const AreaField = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <Textarea className="text-sm" rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export const ToggleRow = ({ label, hint, checked, onChange }) => (
  <div className="flex items-center justify-between gap-3 py-0.5">
    <div className="text-xs min-w-0">
      <p className="font-medium text-slate-700">{label}</p>
      {hint && <p className="text-slate-400">{hint}</p>}
    </div>
    <Switch checked={!!checked} onCheckedChange={onChange} />
  </div>
);