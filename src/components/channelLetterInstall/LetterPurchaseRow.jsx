import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy, Link2 } from "lucide-react";
import { LETTER_TYPE_LABELS, SIZE_UNITS, resolveUnitCost } from "./lettersCalculator";

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

const SIZE_LABEL = {
  in: 'Letter Height (in)',
  ft: 'Raceway Length (ft)',
  sqft: 'Area (sq ft)',
};

const QTY_LABEL = {
  raceway: '# of Raceways',
  channel_raceway_mounted: '# of Letters',
  channel_flush_mounted: '# of Letters',
  channel_halo_lit: '# of Letters',
  capsule_logo_pillbox: '# of Logos',
  dimensional_letters: '# of Letters',
};

const TYPE_COLOR = {
  raceway: "bg-blue-100 text-blue-800 border-blue-200",
  channel_raceway_mounted: "bg-indigo-100 text-indigo-800 border-indigo-200",
  channel_flush_mounted: "bg-purple-100 text-purple-800 border-purple-200",
  channel_halo_lit: "bg-pink-100 text-pink-800 border-pink-200",
  capsule_logo_pillbox: "bg-amber-100 text-amber-800 border-amber-200",
  dimensional_letters: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function LetterPurchaseRow({ purchase, settings, onUpdate, onRemove, onDuplicate, index }) {
  const sizeUnit = SIZE_UNITS[purchase.letter_type];
  const autoUnitCost = resolveUnitCost({ ...purchase, unit_cost_override: false }, settings);
  const effectiveUnit = purchase.unit_cost_override ? (parseFloat(purchase.unit_cost) || 0) : autoUnitCost;

  const update = (patch) => onUpdate({ ...purchase, ...patch });

  const handleTypeChange = (newType) => {
    // Reset size_value to a sensible default for the new type
    let size_value = purchase.size_value;
    if (SIZE_UNITS[newType] !== sizeUnit) {
      size_value = newType === "raceway" ? 8 : newType.startsWith("channel_") ? 24 : 6;
    }
    update({
      letter_type: newType,
      size_value,
      unit_cost_override: false,
      create_install_item: newType !== "raceway",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`${TYPE_COLOR[purchase.letter_type] || "bg-slate-100"} font-medium`}>
          #{index + 1} · {LETTER_TYPE_LABELS[purchase.letter_type]}
        </Badge>
        {purchase.create_install_item && purchase.letter_type !== "raceway" && (
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
            <Link2 className="w-3 h-3 mr-1" /> Auto-creates install item
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-lg font-bold tabular-nums text-slate-900 mr-2">
            {fmt(purchase.total_cost)}
          </span>
          <Button variant="ghost" size="icon" onClick={onDuplicate} className="h-8 w-8" title="Duplicate">
            <Copy className="w-4 h-4 text-slate-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" title="Remove">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Type + raceway-index selector */}
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Letter Type</Label>
          <Select value={purchase.letter_type} onValueChange={handleTypeChange}>
            <SelectTrigger className="mt-1 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LETTER_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {purchase.letter_type === "raceway" && (
          <div>
            <Label className="text-xs">Raceway Tier</Label>
            <Select
              value={String(purchase.raceway_index || 1)}
              onValueChange={(v) => update({ raceway_index: parseInt(v, 10) })}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1st Raceway</SelectItem>
                <SelectItem value="2">2nd Raceway</SelectItem>
                <SelectItem value="3">3rd Raceway</SelectItem>
                <SelectItem value="4">4th Raceway</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className={purchase.letter_type === "raceway" ? "" : "md:col-span-2"}>
          <Label className="text-xs">Description (optional)</Label>
          <Input
            value={purchase.description || ""}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="e.g., Main building front sign"
            className="mt-1 h-9"
          />
        </div>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">{QTY_LABEL[purchase.letter_type]}</Label>
          <Input
            type="number"
            min="0"
            value={purchase.qty}
            onChange={(e) => update({ qty: parseFloat(e.target.value) || 0 })}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs">{SIZE_LABEL[sizeUnit]}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={purchase.size_value}
            onChange={(e) => update({ size_value: parseFloat(e.target.value) || 0 })}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs flex items-center justify-between">
            <span>Unit Cost</span>
            <label className="flex items-center gap-1 text-[10px] text-slate-500 font-normal">
              <Checkbox
                checked={!!purchase.unit_cost_override}
                onCheckedChange={(c) => update({ unit_cost_override: !!c, unit_cost: !!c ? effectiveUnit : 0 })}
                className="h-3 w-3"
              />
              Override
            </label>
          </Label>
          <div className="relative mt-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              disabled={!purchase.unit_cost_override}
              value={purchase.unit_cost_override ? purchase.unit_cost : autoUnitCost.toFixed(2)}
              onChange={(e) => update({ unit_cost: parseFloat(e.target.value) || 0 })}
              className="h-9 pl-6"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Line Total</Label>
          <div className="mt-1 h-9 flex items-center px-3 bg-slate-50 rounded-md border border-slate-200 font-semibold tabular-nums">
            {fmt(purchase.total_cost)}
          </div>
        </div>
      </div>

      {/* Install link toggle (only for letter types that become an install line) */}
      {purchase.letter_type !== "raceway" && (
        <div className="flex items-center justify-between border-t pt-3 gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={!!purchase.create_install_item}
              onCheckedChange={(c) => update({ create_install_item: !!c })}
            />
            <span>Auto-create matching item on Installation tab</span>
          </label>
          {purchase.create_install_item && (
            <div className="flex items-center gap-2 text-xs">
              <Label className="text-xs">Install Height (ft)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={purchase.install_height_feet}
                onChange={(e) => update({ install_height_feet: parseFloat(e.target.value) || 0 })}
                className="h-8 w-20"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}