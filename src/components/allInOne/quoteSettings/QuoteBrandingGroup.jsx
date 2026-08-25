import React from "react";
import { Label } from "@/components/ui/label";
import { Building2, Palette } from "lucide-react";
import { SettingsGroup, TextField, NumField, ToggleRow } from "./quoteSettingsUi";

const PRESET_COLORS = ["#4f46e5", "#0f172a", "#0891b2", "#65a30d", "#dc2626", "#ea580c", "#7c3aed", "#475569"];

// Company identity + quote branding.
export default function QuoteBrandingGroup({ project, updateField }) {
  const f = (k) => (v) => updateField(k, v);
  return (
    <>
      <SettingsGroup title="Company & Contact Info" icon={Building2} defaultOpen>
        <TextField label="Your Company Name" value={project.company_name} onChange={f("company_name")} placeholder="Shown in the quote header" />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Company Phone" value={project.company_phone} onChange={f("company_phone")} />
          <TextField label="Company Email" value={project.company_email} onChange={f("company_email")} />
        </div>
        <TextField label="Company Address" value={project.company_address} onChange={f("company_address")} placeholder="Street, City, State ZIP" />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Website" value={project.company_website} onChange={f("company_website")} />
          <TextField label="License #" value={project.company_license} onChange={f("company_license")} />
        </div>
        <TextField label="Logo URL" value={project.company_logo_url} onChange={f("company_logo_url")} placeholder="https://…" />
        <ToggleRow label="Show logo" hint="Prints the logo above the company name" checked={project.show_logo} onChange={f("show_logo")} />
      </SettingsGroup>

      <SettingsGroup title="Quote Branding" icon={Palette}>
        <TextField label="Quote Title" value={project.quote_title ?? "Project Estimate"} onChange={f("quote_title")} placeholder="Project Estimate" />
        <div>
          <Label className="text-xs">Accent Color</Label>
          <div className="flex items-center gap-1.5 mt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => updateField("quote_accent_color", c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full border-2 ${(project.quote_accent_color || "#4f46e5") === c ? "border-slate-900" : "border-white"}`}
                title={c}
              />
            ))}
            <input
              type="color"
              value={project.quote_accent_color || "#4f46e5"}
              onChange={(e) => updateField("quote_accent_color", e.target.value)}
              className="w-8 h-6 rounded border border-slate-200 bg-white"
            />
          </div>
        </div>
        <NumField label="Quote Valid (days)" value={project.quote_valid_days ?? 30} onChange={f("quote_valid_days")} min={1} suffix="days" />
      </SettingsGroup>
    </>
  );
}