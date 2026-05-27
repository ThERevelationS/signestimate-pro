// One vinyl row card — collapsible. Top bar shows the key fields, the
// "Edit details" toggle expands the full editor (every field on the entity).

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ChevronDown, ChevronUp, Droplets, Image as ImageIcon } from "lucide-react";
import {
  VINYL_CATEGORIES, VINYL_USE_CASES, VINYL_FINISHES, VINYL_ADHESIVES,
  APPLICATION_SURFACES, PRINTER_CHEMISTRIES, PRICING_MODES, WEEDING_DIFFICULTY,
  vinylCostPerSqft,
} from "./vinylConstants";

const num = (v, fb = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fb;
};

export default function VinylRowCard({ vinyl, isAdmin, onPatch, onDelete }) {
  const [open, setOpen] = useState(false);

  const toggleArrItem = (field, value) => {
    const cur = Array.isArray(vinyl[field]) ? vinyl[field] : [];
    const next = cur.includes(value) ? cur.filter(x => x !== value) : [...cur, value];
    onPatch({ [field]: next });
  };

  const dollarPerSqft = vinylCostPerSqft(vinyl);

  return (
    <Card className="border-slate-200 overflow-hidden">
      {/* Top compact bar */}
      <div className="p-3 grid md:grid-cols-12 gap-3 items-center bg-white">
        <div className="md:col-span-1 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-md border border-slate-200 flex items-center justify-center text-[10px] text-slate-400"
            style={{ background: vinyl.color_hex || "#fafafa" }}
            title={vinyl.color_name}
          >
            {vinyl.image_url ? <ImageIcon className="w-4 h-4 text-slate-500" /> : <Droplets className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        <div className="md:col-span-3">
          <Label className="text-[10px] uppercase tracking-wider text-slate-500">Name</Label>
          <Input
            value={vinyl.vinyl_name || ""}
            disabled={!isAdmin}
            onChange={(e) => onPatch({ vinyl_name: e.target.value })}
            className="h-9 text-sm font-medium"
            placeholder='e.g. 3M IJ180Cv3 — White 48"'
          />
        </div>

        <div className="md:col-span-2">
          <Label className="text-[10px] uppercase tracking-wider text-slate-500">Brand / Series</Label>
          <Input
            value={`${vinyl.manufacturer || ""}${vinyl.product_series ? ` · ${vinyl.product_series}` : ""}`}
            disabled
            className="h-9 text-sm bg-slate-50"
          />
        </div>

        <div className="md:col-span-1">
          <Label className="text-[10px] uppercase tracking-wider text-slate-500">Width</Label>
          <div className="h-9 flex items-center text-sm tabular-nums text-slate-700">{num(vinyl.roll_width_inches)}"</div>
        </div>

        <div className="md:col-span-1">
          <Label className="text-[10px] uppercase tracking-wider text-slate-500">Length</Label>
          <div className="h-9 flex items-center text-sm tabular-nums text-slate-700">{num(vinyl.roll_length_yards)} yd</div>
        </div>

        <div className="md:col-span-1">
          <Label className="text-[10px] uppercase tracking-wider text-slate-500">$/sqft</Label>
          <div className="h-9 flex items-center text-sm font-semibold tabular-nums text-emerald-700">
            ${dollarPerSqft.toFixed(2)}
          </div>
        </div>

        <div className="md:col-span-3 flex items-center justify-end gap-2">
          <Badge variant="outline" className="text-[10px]">
            {VINYL_CATEGORIES.find(c => c.id === vinyl.vinyl_category)?.label || vinyl.vinyl_category || "—"}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
            {open ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
            {open ? "Collapse" : "Edit details"}
          </Button>
          {isAdmin && (
            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded editor */}
      {open && (
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-4">
          {/* Identification */}
          <Section title="Identification">
            <div className="grid md:grid-cols-4 gap-3">
              <TextField label="Manufacturer" value={vinyl.manufacturer} disabled={!isAdmin} onChange={(v) => onPatch({ manufacturer: v })} />
              <TextField label="Product Series" value={vinyl.product_series} disabled={!isAdmin} onChange={(v) => onPatch({ product_series: v })} />
              <TextField label="Color Name" value={vinyl.color_name} disabled={!isAdmin} onChange={(v) => onPatch({ color_name: v })} />
              <div>
                <Label className="text-[11px] text-slate-500">Color Hex</Label>
                <div className="flex gap-1.5 mt-1">
                  <input
                    type="color"
                    value={vinyl.color_hex || "#ffffff"}
                    disabled={!isAdmin}
                    onChange={(e) => onPatch({ color_hex: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-200 bg-white cursor-pointer disabled:cursor-not-allowed"
                  />
                  <Input
                    value={vinyl.color_hex || ""}
                    disabled={!isAdmin}
                    onChange={(e) => onPatch({ color_hex: e.target.value })}
                    placeholder="#ffffff"
                    className="h-9 text-sm tabular-nums"
                  />
                </div>
              </div>
              <TextField label="Supplier" value={vinyl.supplier} disabled={!isAdmin} onChange={(v) => onPatch({ supplier: v })} />
              <TextField label="Supplier SKU" value={vinyl.supplier_sku} disabled={!isAdmin} onChange={(v) => onPatch({ supplier_sku: v })} />
              <TextField label="Image URL" value={vinyl.image_url} disabled={!isAdmin} onChange={(v) => onPatch({ image_url: v })} />
            </div>
          </Section>

          {/* Classification */}
          <Section title="Classification">
            <div className="grid md:grid-cols-4 gap-3">
              <SelectField label="Category"
                value={vinyl.vinyl_category} disabled={!isAdmin}
                options={VINYL_CATEGORIES.map(c => ({ id: c.id, label: c.label }))}
                onChange={(v) => onPatch({ vinyl_category: v })} />
              <SelectField label="Primary Use Case"
                value={vinyl.vinyl_use_case} disabled={!isAdmin}
                options={VINYL_USE_CASES.map(c => ({ id: c.id, label: c.label }))}
                onChange={(v) => onPatch({ vinyl_use_case: v })} />
              <SelectField label="Finish"
                value={vinyl.finish} disabled={!isAdmin}
                options={VINYL_FINISHES.map(f => ({ id: f, label: f }))}
                onChange={(v) => onPatch({ finish: v })} />
              <SelectField label="Adhesive Type"
                value={vinyl.adhesive_type} disabled={!isAdmin}
                options={VINYL_ADHESIVES.map(a => ({ id: a, label: a }))}
                onChange={(v) => onPatch({ adhesive_type: v })} />
            </div>
          </Section>

          {/* Roll & Pricing */}
          <Section title="Roll & Pricing">
            <div className="grid md:grid-cols-4 gap-3">
              <NumberField label='Roll Width (in)' value={vinyl.roll_width_inches} disabled={!isAdmin} onChange={(v) => onPatch({ roll_width_inches: v })} />
              <NumberField label="Roll Length (yd)" value={vinyl.roll_length_yards} disabled={!isAdmin} onChange={(v) => onPatch({ roll_length_yards: v })} />
              <NumberField label="Thickness (mil)" step="0.1" value={vinyl.thickness_mil} disabled={!isAdmin} onChange={(v) => onPatch({ thickness_mil: v })} />
              <SelectField label="Pricing Mode"
                value={vinyl.pricing_mode || "per_roll"} disabled={!isAdmin}
                options={PRICING_MODES}
                onChange={(v) => onPatch({ pricing_mode: v })} />
              <NumberField label="Cost per Roll ($)" step="0.01" value={vinyl.cost_per_roll} disabled={!isAdmin || vinyl.pricing_mode !== "per_roll"} onChange={(v) => onPatch({ cost_per_roll: v })} />
              <NumberField label="Cost per SqFt ($)" step="0.01" value={vinyl.cost_per_sqft} disabled={!isAdmin || vinyl.pricing_mode !== "per_sqft"} onChange={(v) => onPatch({ cost_per_sqft: v })} />
              <NumberField label="Cost per Linear Ft ($)" step="0.01" value={vinyl.cost_per_linear_foot} disabled={!isAdmin || vinyl.pricing_mode !== "per_linear_foot"} onChange={(v) => onPatch({ cost_per_linear_foot: v })} />
              <NumberField label="MOQ" value={vinyl.minimum_order_quantity} disabled={!isAdmin} onChange={(v) => onPatch({ minimum_order_quantity: v })} />
              <NumberField label="Waste %" value={vinyl.waste_factor_percent} disabled={!isAdmin} onChange={(v) => onPatch({ waste_factor_percent: v })} />
              <NumberField label="Yield Factor (0–1)" step="0.05" value={vinyl.yield_factor} disabled={!isAdmin} onChange={(v) => onPatch({ yield_factor: v })} />
            </div>
          </Section>

          {/* Application */}
          <Section title="Application & Durability">
            <div className="grid md:grid-cols-4 gap-3">
              <SelectField label="Application Method"
                value={vinyl.application_method || "either"} disabled={!isAdmin}
                options={[{id:"dry",label:"Dry"},{id:"wet",label:"Wet"},{id:"either",label:"Either"}]}
                onChange={(v) => onPatch({ application_method: v })} />
              <SelectField label="Indoor / Outdoor"
                value={vinyl.indoor_outdoor || "both"} disabled={!isAdmin}
                options={[{id:"indoor_only",label:"Indoor Only"},{id:"outdoor",label:"Outdoor"},{id:"both",label:"Both"}]}
                onChange={(v) => onPatch({ indoor_outdoor: v })} />
              <NumberField label="Outdoor Life (yrs)" value={vinyl.expected_life_years_outdoor} disabled={!isAdmin} onChange={(v) => onPatch({ expected_life_years_outdoor: v })} />
              <SelectField label="Weeding Difficulty"
                value={vinyl.weeding_difficulty || "moderate"} disabled={!isAdmin}
                options={WEEDING_DIFFICULTY.map(w => ({ id: w, label: w.replace("_"," ") }))}
                onChange={(v) => onPatch({ weeding_difficulty: v })} />
              <NumberField label='Min Letter Height (in)' step="0.25" value={vinyl.min_recommended_letter_height_inches} disabled={!isAdmin} onChange={(v) => onPatch({ min_recommended_letter_height_inches: v })} />
              <ToggleField label="Removable" value={!!vinyl.removable} disabled={!isAdmin} onChange={(v) => onPatch({ removable: v })} />
              <ToggleField label="Needs Lamination" value={!!vinyl.requires_lamination} disabled={!isAdmin} onChange={(v) => onPatch({ requires_lamination: v })} />
              <ToggleField label="Needs Transfer Tape" value={vinyl.requires_transfer_tape !== false} disabled={!isAdmin} onChange={(v) => onPatch({ requires_transfer_tape: v })} />
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Application Surfaces (multi-select)</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {APPLICATION_SURFACES.map(s => {
                  const on = (vinyl.application_surface || []).includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => toggleArrItem("application_surface", s)}
                      className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                        on ? "bg-blue-600 border-blue-600 text-white"
                           : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
                      } ${!isAdmin && "opacity-60 cursor-not-allowed"}`}
                    >
                      {s.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* Printing */}
          <Section title="Printing (only if printable)">
            <div className="grid md:grid-cols-4 gap-3 items-end">
              <ToggleField label="Printable Media" value={!!vinyl.supports_printing} disabled={!isAdmin} onChange={(v) => onPatch({ supports_printing: v })} />
              {vinyl.supports_printing && (
                <div className="md:col-span-3">
                  <Label className="text-[11px] text-slate-500">Printer Compatibility</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {PRINTER_CHEMISTRIES.map(p => {
                      const on = (vinyl.printer_compatibility || []).includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => toggleArrItem("printer_compatibility", p)}
                          className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                            on ? "bg-purple-600 border-purple-600 text-white"
                               : "bg-white border-slate-200 text-slate-700 hover:border-purple-300"
                          } ${!isAdmin && "opacity-60 cursor-not-allowed"}`}
                        >
                          {p.replace(/_/g, " ")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Visibility */}
          <Section title="Where this vinyl shows up">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <ToggleField label="Show in Channel & Dim. Letters"
                value={vinyl.show_in_channel_letters !== false} disabled={!isAdmin}
                onChange={(v) => onPatch({ show_in_channel_letters: v })} />
              <ToggleField label="Show in Sign Maintenance"
                value={vinyl.show_in_sign_maintenance !== false} disabled={!isAdmin}
                onChange={(v) => onPatch({ show_in_sign_maintenance: v })} />
              <ToggleField label="Master-only (hide from modules)"
                value={!!vinyl.show_in_master_only} disabled={!isAdmin}
                onChange={(v) => onPatch({ show_in_master_only: v })} />
              <ToggleField label="Active"
                value={vinyl.is_active !== false} disabled={!isAdmin}
                onChange={(v) => onPatch({ is_active: v })} />
            </div>
          </Section>

          <Section title="Notes">
            <Textarea
              value={vinyl.notes || ""}
              disabled={!isAdmin}
              onChange={(e) => onPatch({ notes: e.target.value })}
              className="h-20 text-sm"
              placeholder="Color matching notes, edge sealing tips, ordering quirks, etc."
            />
          </Section>
        </div>
      )}
    </Card>
  );
}

// ----- small focused field helpers (kept inline — purely presentational) ----

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TextField({ label, value, disabled, onChange }) {
  return (
    <div>
      <Label className="text-[11px] text-slate-500">{label}</Label>
      <Input
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-sm mt-1"
      />
    </div>
  );
}

function NumberField({ label, value, disabled, onChange, step = "1" }) {
  return (
    <div>
      <Label className="text-[11px] text-slate-500">{label}</Label>
      <Input
        type="number" step={step}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
        className="h-9 text-sm tabular-nums mt-1"
      />
    </div>
  );
}

function SelectField({ label, value, disabled, onChange, options }) {
  return (
    <div>
      <Label className="text-[11px] text-slate-500">{label}</Label>
      <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9 mt-1 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ToggleField({ label, value, disabled, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-white rounded-md border border-slate-200 px-3 py-2">
      <span className="text-xs text-slate-700">{label}</span>
      <Switch checked={!!value} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}