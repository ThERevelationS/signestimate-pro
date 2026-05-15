import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Box, Paintbrush, Router, Layers, X, AlertCircle } from "lucide-react";
import { DimensionalLetterMaterial, ChannelLetterInstallInventory } from "@/entities/all";
import BackerFabModal from "./BackerFabModal";

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

/**
 * BackerSection — renders inside a Dimensional Letters purchase row
 * when backer_enabled is true. Lets the user pick:
 *  - Backer material (from DimensionalLetterMaterial)
 *  - Standoff (from ChannelLetterInstallInventory where applies_to_list includes "backer")
 *  - # of standoffs
 *  - Build Backer Fab Cost (opens BackerFabModal)
 */
export default function BackerSection({ purchase, onUpdate, onDisable }) {
  const [materials, setMaterials] = useState([]);
  const [standoffs, setStandoffs] = useState([]);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [mats, inv] = await Promise.all([
          DimensionalLetterMaterial.filter({ is_active: true }, "sort_order"),
          ChannelLetterInstallInventory.list("sort_order"),
        ]);
        setMaterials(mats);
        const filtered = (inv || []).filter(i => {
          const list = Array.isArray(i.applies_to_list) ? i.applies_to_list : [];
          return list.includes("backer");
        });
        setStandoffs(filtered);
      } catch (e) {
        console.error("BackerSection load failed", e);
      }
    })();
  }, []);

  const fab = purchase.backer_fab_config;
  const hasFab = !!fab?.unit_total_cost;
  const standoffPicked = standoffs.find(s => s.id === purchase.backer_standoff_inventory_id);
  const standoffUnitCost = standoffPicked ? (parseFloat(standoffPicked.cost_per_letter) || parseFloat(standoffPicked.cost_flat) || 0) : 0;
  const standoffTotalCost = standoffUnitCost * (parseFloat(purchase.backer_standoff_qty) || 0);

  return (
    <div className="border-2 border-orange-200 bg-orange-50/40 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-semibold text-orange-900">Backer Panel Configuration</span>
          <Badge className="bg-orange-200 text-orange-900 border-orange-300 text-[10px]">SWITCHES PRICING SCHEDULE</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onDisable} className="h-7 text-xs text-orange-700 hover:bg-orange-100">
          <X className="w-3 h-3 mr-1" /> Remove Backer
        </Button>
      </div>

      {/* Material picker (informational — actual fab pick happens in modal) + standoff picker */}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs flex items-center gap-1"><Box className="w-3 h-3" /> Backer Material</Label>
          <Select
            value={purchase.backer_material_id || ""}
            onValueChange={(v) => onUpdate({ backer_material_id: v })}
          >
            <SelectTrigger className="h-9 mt-1 bg-white">
              <SelectValue placeholder="Pick a material..." />
            </SelectTrigger>
            <SelectContent>
              {materials.length === 0 && <SelectItem value="__none" disabled>No materials in library</SelectItem>}
              {materials.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.material_name} ({m.thickness_inches}")</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Standoff Type</Label>
          <Select
            value={purchase.backer_standoff_inventory_id || ""}
            onValueChange={(v) => onUpdate({ backer_standoff_inventory_id: v })}
          >
            <SelectTrigger className="h-9 mt-1 bg-white">
              <SelectValue placeholder="Pick a standoff..." />
            </SelectTrigger>
            <SelectContent>
              {standoffs.length === 0 && <SelectItem value="__none" disabled>No backer standoffs in inventory</SelectItem>}
              {standoffs.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.item_name} — {fmt(parseFloat(s.cost_per_letter) || parseFloat(s.cost_flat) || 0)}/ea</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {standoffs.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">
            No standoffs yet. Add them in <strong>Channel Letter Install Inventory → Materials → Backer</strong> group.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Qty of Standoffs (per letter)</Label>
          <Input
            type="number" min="0" step="1"
            value={purchase.backer_standoff_qty ?? 0}
            onChange={(e) => onUpdate({ backer_standoff_qty: parseFloat(e.target.value) || 0 })}
            className="h-9 mt-1 bg-white"
          />
        </div>
        <div>
          <Label className="text-xs">Backer Width (in)</Label>
          <Input
            type="number" min="0" step="0.5"
            value={purchase.backer_width_inches ?? 0}
            onChange={(e) => onUpdate({ backer_width_inches: parseFloat(e.target.value) || 0 })}
            className="h-9 mt-1 bg-white"
          />
        </div>
        <div>
          <Label className="text-xs">Backer Height (in)</Label>
          <Input
            type="number" min="0" step="0.5"
            value={purchase.backer_height_inches ?? 0}
            onChange={(e) => onUpdate({ backer_height_inches: parseFloat(e.target.value) || 0 })}
            className="h-9 mt-1 bg-white"
          />
        </div>
      </div>

      {/* Build Backer Fab Cost button (separate from letter fab) */}
      <div className="border-t border-orange-200 pt-3">
        {hasFab ? (
          <div className="bg-white border border-orange-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-900">Backer Fab Built</span>
              <Badge variant="outline" className="bg-orange-50 text-xs text-orange-700 border-orange-300 ml-auto">
                {fmt(fab.unit_total_cost)} / backer
              </Badge>
            </div>
            <div className="flex gap-3 text-[11px] text-orange-800 flex-wrap">
              {fab.material_name && <span className="flex items-center gap-1"><Box className="w-3 h-3" /> {fab.material_name}</span>}
              <span className="flex items-center gap-1"><Router className="w-3 h-3" /> {fab.cutting_method?.toUpperCase()} {fmt(fab.unit_cut_cost)}</span>
              {fab.paint_letters
                ? <span className="flex items-center gap-1"><Paintbrush className="w-3 h-3" /> Paint {fmt(fab.unit_paint_cost)}</span>
                : <span className="flex items-center gap-1 text-slate-500"><Paintbrush className="w-3 h-3" /> Paint excluded</span>
              }
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setFabOpen(true)} className="bg-white">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Edit Backer Fab
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onUpdate({ backer_fab_config: null })}
                className="text-red-600 hover:text-red-700"
              >
                Reset Backer Fab
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setFabOpen(true)}
            className="w-full border-2 border-dashed border-orange-300 bg-orange-50/40 text-orange-700 hover:bg-orange-50 hover:border-orange-400"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Build Backer Fab Cost from CNC + Paint
          </Button>
        )}
      </div>

      {/* Mini rollup */}
      <div className="bg-white rounded-lg border border-orange-200 p-2.5 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Backer Fab × Qty</div>
          <div className="font-semibold tabular-nums text-slate-900">{fmt((fab?.unit_total_cost || 0) * (parseFloat(purchase.qty) || 0))}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Standoffs ({purchase.backer_standoff_qty || 0})</div>
          <div className="font-semibold tabular-nums text-slate-900">{fmt(standoffTotalCost)}</div>
          <div className="text-[10px] text-slate-400">Per install line</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Pricing Schedule</div>
          <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]">w/ Backer</Badge>
        </div>
      </div>

      <BackerFabModal
        open={fabOpen}
        onOpenChange={setFabOpen}
        purchase={purchase}
        onSave={(patch) => onUpdate(patch)}
      />
    </div>
  );
}