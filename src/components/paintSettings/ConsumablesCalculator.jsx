import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Package } from "lucide-react";

/**
 * Small inventory of per-job consumables. The sum of (cost × qty) becomes
 * the "Base supplies per job" value (base_supplies_per_job setting).
 *
 * items shape: [{ name: string, cost: number, qty: number }]
 */
export default function ConsumablesCalculator({ items, setItems, isLocked, onTotalChange }) {
  const safeItems = Array.isArray(items) ? items : [];

  const total = safeItems.reduce((sum, it) => {
    const cost = parseFloat(it.cost) || 0;
    const qty = parseFloat(it.qty) || 0;
    return sum + cost * qty;
  }, 0);

  React.useEffect(() => {
    onTotalChange?.(total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const addItem = () => {
    setItems([...safeItems, { name: "", cost: 0, qty: 1 }]);
  };

  const removeItem = (idx) => {
    setItems(safeItems.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    setItems(safeItems.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base font-semibold text-slate-900">
          <Package className="w-5 h-5 text-slate-500" />
          Consumables Inventory (per job)
        </CardTitle>
        <CardDescription>
          Add the real consumables you use on a typical job. The total auto-fills "Base supplies per job" above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {safeItems.length === 0 && (
          <p className="text-sm text-slate-500 italic">
            No consumables yet. Click "Add Item" to start building your real per-job supply cost.
          </p>
        )}

        {safeItems.map((item, idx) => {
          const lineTotal = (parseFloat(item.cost) || 0) * (parseFloat(item.qty) || 0);
          return (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="col-span-12 md:col-span-5">
                <Label className="text-xs">Item Name</Label>
                <Input
                  value={item.name || ""}
                  onChange={(e) => updateItem(idx, "name", e.target.value)}
                  placeholder="e.g., Masking tape, Tack cloth, Mixing stick"
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
                  onChange={(e) => updateItem(idx, "cost", parseFloat(e.target.value) || 0)}
                  disabled={isLocked}
                  className="mt-1 h-9"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs">Qty / Job</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={item.qty ?? 1}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateItem(idx, "qty", parseFloat(e.target.value) || 0)}
                  disabled={isLocked}
                  className="mt-1 h-9"
                />
              </div>
              <div className="col-span-3 md:col-span-2 text-right">
                <Label className="text-xs">Line Total</Label>
                <p className="mt-2 font-semibold text-slate-900">${lineTotal.toFixed(2)}</p>
              </div>
              <div className="col-span-1 md:col-span-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(idx)}
                  disabled={isLocked}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        <Button onClick={addItem} disabled={isLocked} variant="outline" size="sm" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>

        <div className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-green-900">Calculated Total</p>
            <p className="text-xs text-green-700">Auto-syncs into "Base supplies per job".</p>
          </div>
          <p className="text-2xl font-bold text-green-900">${total.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}