import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, X, Copy, Plus, Trash2 } from "lucide-react";
import { fmtCurrency } from "@/lib/formatters";
import { partLineTotal, PART_TYPES } from "./quickProductPricing";

// One part inside the Quick Product editor: collapsed header row + expanded
// three-column body (Part Information · Modifier Information · Pricing).
export default function QuickProductPartRow({
  part, index, selected, onToggleSelect, onChange, onClone, onRemove,
}) {
  const [expanded, setExpanded] = useState(false);
  const set = (k, v) => onChange({ ...part, [k]: v });

  const setModifier = (i, key, value) => {
    const mods = [...(part.modifiers || [])];
    mods[i] = { ...mods[i], [key]: value };
    set("modifiers", mods);
  };

  return (
    <div className="border border-slate-300 bg-slate-50 rounded-sm mb-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-100 border-b border-slate-300">
        <button type="button" onClick={() => setExpanded(!expanded)} className="text-lime-600 hover:text-lime-700">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Part {index + 1}</span>
        <Checkbox checked={!!selected} onCheckedChange={onToggleSelect} />
        <Input
          value={part.part_label || ""}
          onChange={(e) => set("part_label", e.target.value)}
          placeholder="Part label"
          className="h-7 rounded-sm bg-white text-xs flex-1"
        />
        <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">{fmtCurrency(partLineTotal(part))}</span>
        <Button variant="outline" size="sm" className="h-7 rounded-sm text-xs px-2" onClick={onClone}>
          <Copy className="w-3 h-3 mr-1" /> Clone
        </Button>
        <Button variant="outline" size="sm" className="h-7 rounded-sm text-xs px-2" onClick={() => setExpanded(!expanded)}>
          Edit Part
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-red-600" onClick={onRemove}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {expanded && (
        <div className="grid md:grid-cols-3 divide-x divide-slate-300 bg-white">
          {/* Part information */}
          <div className="p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Part Information</p>
            <div>
              <Label className="text-xs">Part Name</Label>
              <Input className="h-7 rounded-sm text-xs" value={part.part_name || ""} onChange={(e) => set("part_name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Part Type</Label>
                <Select value={part.part_type || "fabrication"} onValueChange={(v) => set("part_type", v)}>
                  <SelectTrigger className="h-7 rounded-sm text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PART_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Part Qty</Label>
                <Input type="number" className="h-7 rounded-sm text-xs" value={part.part_qty ?? 1}
                  onChange={(e) => set("part_qty", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Vendor Info</Label>
              <Input className="h-7 rounded-sm text-xs" value={part.vendor_info || ""} onChange={(e) => set("vendor_info", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input className="h-7 rounded-sm text-xs" value={part.notes || ""} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>

          {/* Modifier information */}
          <div className="p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Modifier Information</p>
            {(part.modifiers || []).map((m, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input className="h-7 rounded-sm text-xs" placeholder="Label" value={m.label || ""} onChange={(e) => setModifier(i, "label", e.target.value)} />
                <Input className="h-7 rounded-sm text-xs" placeholder="Value" value={m.value || ""} onChange={(e) => setModifier(i, "value", e.target.value)} />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                  onClick={() => set("modifiers", (part.modifiers || []).filter((_, x) => x !== i))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="h-7 rounded-sm text-xs"
              onClick={() => set("modifiers", [...(part.modifiers || []), { label: "", value: "" }])}>
              <Plus className="w-3 h-3 mr-1" /> Add Modifier
            </Button>
          </div>

          {/* Pricing */}
          <div className="p-3 space-y-2 bg-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pricing Information</p>
            <div>
              <Label className="text-xs">Part Price</Label>
              <Input type="number" step="0.01" className="h-7 rounded-sm text-xs" value={part.part_price ?? 0}
                onChange={(e) => set("part_price", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-xs">Modifier(s)</Label>
              <Input type="number" step="0.01" className="h-7 rounded-sm text-xs" value={part.modifier_price ?? 0}
                onChange={(e) => set("modifier_price", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-xs">Override Price (blank = calculated)</Label>
              <Input type="number" step="0.01" className="h-7 rounded-sm text-xs" value={part.price_override ?? ""}
                onChange={(e) => set("price_override", e.target.value === "" ? null : parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-2 text-xs font-bold text-slate-900">
              <span>Total</span><span>{fmtCurrency(partLineTotal(part))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}