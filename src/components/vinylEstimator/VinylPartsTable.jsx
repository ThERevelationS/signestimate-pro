// Editable table of vinyl parts. Each row = description + W × H × qty + bleed + rotation toggle.

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

const blankItem = () => ({
  id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  description: "",
  width_inches: 12,
  height_inches: 12,
  quantity: 1,
  bleed_inches: 0,
  allow_rotation: true,
});

export default function VinylPartsTable({ items, onChange }) {
  const update = (idx, patch) => onChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add    = ()    => onChange([...(items || []), blankItem()]);

  return (
    <div className="space-y-2">
      <div className="hidden md:grid grid-cols-[1fr_80px_80px_70px_80px_80px_40px] gap-2 text-[11px] font-medium text-slate-500 px-1">
        <div>Description</div>
        <div>W (in)</div>
        <div>H (in)</div>
        <div>Qty</div>
        <div>Bleed</div>
        <div className="text-center">Rotate?</div>
        <div />
      </div>

      {(items || []).map((it, idx) => (
        <div key={it.id || idx} className="grid grid-cols-[1fr_80px_80px_70px_80px_80px_40px] gap-2 items-center">
          <Input value={it.description || ""} onChange={(e) => update(idx, { description: e.target.value })}
                 placeholder={`Item ${idx + 1}`} className="h-9 text-sm" />
          <Input type="number" step="0.125" value={it.width_inches} onChange={(e) => update(idx, { width_inches: parseFloat(e.target.value) || 0 })} className="h-9 text-sm tabular-nums" />
          <Input type="number" step="0.125" value={it.height_inches} onChange={(e) => update(idx, { height_inches: parseFloat(e.target.value) || 0 })} className="h-9 text-sm tabular-nums" />
          <Input type="number" step="1" min="1" value={it.quantity} onChange={(e) => update(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} className="h-9 text-sm tabular-nums" />
          <Input type="number" step="0.0625" value={it.bleed_inches || 0} onChange={(e) => update(idx, { bleed_inches: parseFloat(e.target.value) || 0 })} className="h-9 text-sm tabular-nums" />
          <div className="flex justify-center">
            <Checkbox checked={it.allow_rotation !== false} onCheckedChange={(v) => update(idx, { allow_rotation: !!v })} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => remove(idx)} className="h-8 w-8 text-red-500 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={add} className="w-full mt-2 h-8">
        <Plus className="w-3.5 h-3.5 mr-1" /> Add Part
      </Button>

      {(!items || items.length === 0) && (
        <p className="text-xs text-slate-400 text-center py-4">No parts added yet — click "Add Part" to start.</p>
      )}
    </div>
  );
}