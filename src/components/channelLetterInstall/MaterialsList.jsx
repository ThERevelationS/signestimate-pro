import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package } from "lucide-react";
import { materialFromInventory } from "./installCalculator";

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

export default function MaterialsList({ item, inventory, onChange }) {
  const materials = item.materials || [];

  // Build options of inventory items applicable to this line
  const eligibleInventory = (inventory || []).filter(inv => {
    if (inv.applies_to === "all") return true;
    return inv.applies_to === item.installation_type;
  });

  const addMaterial = (invId) => {
    const inv = inventory.find(i => i.id === invId);
    if (!inv) return;
    if (materials.some(m => m.inventory_item_id === invId)) return;
    const newMat = materialFromInventory(inv, item);
    onChange([...materials, newMat]);
  };

  const removeMaterial = (idx) => {
    const next = [...materials];
    next.splice(idx, 1);
    onChange(next);
  };

  const updateMaterial = (idx, patch) => {
    const next = [...materials];
    next[idx] = { ...next[idx], ...patch };
    next[idx].total_cost = (parseFloat(next[idx].unit_cost) || 0) * (parseFloat(next[idx].quantity) || 0);
    onChange(next);
  };

  const totalMaterials = materials.reduce((s, m) => s + (parseFloat(m.total_cost) || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Materials</span>
          <span className="text-xs text-slate-400">({materials.length})</span>
        </div>
        <Select value="" onValueChange={addMaterial}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[160px]">
            <SelectValue placeholder="+ Add material..." />
          </SelectTrigger>
          <SelectContent>
            {eligibleInventory.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-slate-500">No inventory items match this install type</div>
            ) : eligibleInventory.map(inv => (
              <SelectItem
                key={inv.id}
                value={inv.id}
                disabled={materials.some(m => m.inventory_item_id === inv.id)}
              >
                {inv.item_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {materials.length === 0 ? (
        <div className="text-xs text-slate-400 italic px-2 py-3 text-center border border-dashed border-slate-200 rounded">
          No materials added. Use the dropdown to add from inventory.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium">Item</th>
                <th className="text-right px-2 py-1.5 font-medium w-20">Unit $</th>
                <th className="text-right px-2 py-1.5 font-medium w-16">Qty</th>
                <th className="text-right px-2 py-1.5 font-medium w-20">Total</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-2 py-1">{m.item_name}</td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={m.unit_cost ?? 0}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateMaterial(idx, { unit_cost: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs text-right"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={m.quantity ?? 0}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateMaterial(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs text-right"
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-medium tabular-nums">{fmt(m.total_cost)}</td>
                  <td className="px-1 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMaterial(idx)}
                      className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan="3" className="px-2 py-1.5 text-right font-medium">Materials Total</td>
                <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{fmt(totalMaterials)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}