import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Package, Ruler } from "lucide-react";

/**
 * Consumables inventory with two cost modes:
 *  - Flat per-job: line total = cost × qty → feeds base_supplies_per_job
 *  - Per sqft:    line total = cost × qty → feeds default_paint_supplies_per_sqft
 *
 * items shape: [{ name: string, cost: number, qty: number, per_sqft: boolean }]
 */
export default function ConsumablesCalculator({ items, setItems, isLocked, onFlatTotalChange, onPerSqftTotalChange }) {
  const safeItems = Array.isArray(items) ? items : [];

  const flatItems = safeItems.map((it, originalIdx) => ({ it, originalIdx })).filter(({ it }) => !it.per_sqft);
  const perSqftItems = safeItems.map((it, originalIdx) => ({ it, originalIdx })).filter(({ it }) => !!it.per_sqft);

  const sumOf = (entries) => entries.reduce((sum, { it }) => {
    const cost = parseFloat(it.cost) || 0;
    const qty = parseFloat(it.qty) || 0;
    return sum + cost * qty;
  }, 0);

  const flatTotal = sumOf(flatItems);
  const perSqftTotal = sumOf(perSqftItems);

  React.useEffect(() => { onFlatTotalChange?.(flatTotal); /* eslint-disable-next-line */ }, [flatTotal]);
  React.useEffect(() => { onPerSqftTotalChange?.(perSqftTotal); /* eslint-disable-next-line */ }, [perSqftTotal]);

  const addItem = (perSqft = false) => {
    setItems([...safeItems, { name: "", cost: 0, qty: 1, per_sqft: perSqft }]);
  };

  const removeItem = (originalIdx) => {
    setItems(safeItems.filter((_, i) => i !== originalIdx));
  };

  const updateItem = (originalIdx, field, value) => {
    setItems(safeItems.map((it, i) => (i === originalIdx ? { ...it, [field]: value } : it)));
  };

  const renderRow = ({ it: item, originalIdx }) => {
    const lineTotal = (parseFloat(item.cost) || 0) * (parseFloat(item.qty) || 0);
    return (
      <div key={originalIdx} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="col-span-12 md:col-span-4">
          <Label className="text-xs">Item Name</Label>
          <Input
            value={item.name || ""}
            onChange={(e) => updateItem(originalIdx, "name", e.target.value)}
            placeholder="e.g., Masking tape, Rollers, Tack cloth"
            disabled={isLocked}
            className="mt-1 h-9"
          />
        </div>
        <div className="col-span-4 md:col-span-2">
          <Label className="text-xs">Cost ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.cost ?? 0}
            onFocus={(e) => e.target.select()}
            onChange={(e) => updateItem(originalIdx, "cost", parseFloat(e.target.value) || 0)}
            disabled={isLocked}
            className="mt-1 h-9"
          />
        </div>
        <div className="col-span-4 md:col-span-2">
          <Label className="text-xs">Qty</Label>
          <Input
            type="number"
            min="0"
            step="0.25"
            value={item.qty ?? 1}
            onFocus={(e) => e.target.select()}
            onChange={(e) => updateItem(originalIdx, "qty", parseFloat(e.target.value) || 0)}
            disabled={isLocked}
            className="mt-1 h-9"
          />
        </div>
        <div className="col-span-4 md:col-span-2 flex items-center gap-2 pb-1">
          <Checkbox
            id={`per_sqft_${originalIdx}`}
            checked={!!item.per_sqft}
            onCheckedChange={(checked) => updateItem(originalIdx, "per_sqft", !!checked)}
            disabled={isLocked}
          />
          <Label htmlFor={`per_sqft_${originalIdx}`} className="text-xs cursor-pointer">Per sqft</Label>
        </div>
        <div className="col-span-7 md:col-span-1 text-right">
          <Label className="text-xs">Line</Label>
          <p className="mt-2 font-semibold text-slate-900 text-sm">${lineTotal.toFixed(2)}</p>
        </div>
        <div className="col-span-1 md:col-span-1 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeItem(originalIdx)}
            disabled={isLocked}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base font-semibold text-slate-900">
          <Package className="w-5 h-5 text-slate-500" />
          Consumables Inventory
        </CardTitle>
        <CardDescription>
          Items default to <strong>flat per-job</strong> cost (top section). Check <strong>"Per sqft"</strong> to move an item to the
          per-sqft section (bottom). Each section's total auto-syncs into its respective setting above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ===== TOP: Flat per-job ===== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              Flat Per-Job Items
            </h4>
            <Button onClick={() => addItem(false)} disabled={isLocked} variant="outline" size="sm">
              <Plus className="w-3 h-3 mr-1" /> Add Flat Item
            </Button>
          </div>

          {flatItems.length === 0 ? (
            <p className="text-sm text-slate-500 italic px-3">No flat per-job items yet.</p>
          ) : (
            flatItems.map(renderRow)
          )}

          <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-green-900">Flat Total → "Base supplies per job"</p>
              <p className="text-xs text-green-700">Applied once per job regardless of size.</p>
            </div>
            <p className="text-xl font-bold text-green-900">${flatTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* ===== BOTTOM: Per sqft ===== */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-800 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-blue-500" />
              Per-Sqft Items
            </h4>
            <Button onClick={() => addItem(true)} disabled={isLocked} variant="outline" size="sm">
              <Plus className="w-3 h-3 mr-1" /> Add Per-Sqft Item
            </Button>
          </div>

          {perSqftItems.length === 0 ? (
            <p className="text-sm text-slate-500 italic px-3">No per-sqft items yet. Check "Per sqft" on any item above to move it here.</p>
          ) : (
            perSqftItems.map(renderRow)
          )}

          <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-blue-900">Per-Sqft Total → "Default paint supplies per sqft"</p>
              <p className="text-xs text-blue-700">Scales with paintable area (and number of colors).</p>
            </div>
            <p className="text-xl font-bold text-blue-900">${perSqftTotal.toFixed(2)}</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}