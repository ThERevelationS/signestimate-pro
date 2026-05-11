import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Copy, Trash2, GripVertical } from "lucide-react";
import MaterialsList from "./MaterialsList";
import { TYPE_LABELS, SIZE_LABELS } from "./installCalculator";

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

export default function InstallLineItem({ item, index, inventory, onUpdate, onRemove, onDuplicate }) {
  const [expanded, setExpanded] = useState(true);
  const isRaceway = item.installation_type === "raceway";

  const update = (patch) => onUpdate({ ...item, ...patch });

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <button onClick={() => setExpanded(e => !e)} className="text-slate-500 hover:text-slate-900">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <span className="text-xs font-semibold text-slate-500 w-6">#{index + 1}</span>
        <Input
          value={item.description || ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder={`${TYPE_LABELS[item.installation_type]} — describe this line...`}
          className="h-8 text-sm flex-1 bg-white"
          onClick={(e) => e.stopPropagation()}
        />
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 capitalize">
          {TYPE_LABELS[item.installation_type]}
        </Badge>
        <Badge variant="outline" className="bg-slate-100 text-slate-700 font-semibold tabular-nums">
          {fmt(item.item_total_cost)}
        </Badge>
        <Button variant="ghost" size="sm" onClick={onDuplicate} className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-200" title="Duplicate">
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onRemove} className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" title="Remove">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {expanded && (
        <CardContent className="p-4 space-y-4">
          {/* Type + core inputs */}
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Installation Type</Label>
              <Select value={item.installation_type} onValueChange={(v) => update({ installation_type: v })}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flush_mount">Flush Mount</SelectItem>
                  <SelectItem value="halo_lit">Halo-Lit</SelectItem>
                  <SelectItem value="raceway">Raceway</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Qty Letters</Label>
              <Input
                type="number"
                value={item.qty_letters}
                onFocus={(e) => e.target.select()}
                onChange={(e) => update({ qty_letters: parseFloat(e.target.value) || 0 })}
                className="h-9 mt-1"
              />
            </div>

            {!isRaceway && (
              <div>
                <Label className="text-xs">Letter Size</Label>
                <Select value={item.letter_size} onValueChange={(v) => update({ letter_size: v })}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SIZE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isRaceway && (
              <div>
                <Label className="text-xs">Raceway Length (ft)</Label>
                <Input
                  type="number"
                  value={item.raceway_length_feet}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => update({ raceway_length_feet: parseFloat(e.target.value) || 0 })}
                  className="h-9 mt-1"
                />
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Letter Height (inches)</Label>
              <Input
                type="number"
                value={item.letter_height_inches}
                onFocus={(e) => e.target.select()}
                onChange={(e) => update({ letter_height_inches: parseFloat(e.target.value) || 0 })}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Install Height (feet)</Label>
              <Input
                type="number"
                value={item.installation_height_feet}
                onFocus={(e) => e.target.select()}
                onChange={(e) => update({ installation_height_feet: parseFloat(e.target.value) || 0 })}
                className="h-9 mt-1"
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={item.thick_hollow_walls} onCheckedChange={(c) => update({ thick_hollow_walls: !!c })} />
              <span>Thick/Hollow Walls</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={item.parapet} onCheckedChange={(c) => update({ parapet: !!c })} />
              <span>Parapet</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={item.poor_electrical_access} onCheckedChange={(c) => update({ poor_electrical_access: !!c })} />
              <span>Poor Electrical Access</span>
            </label>
          </div>

          {/* Materials */}
          <div className="border-t pt-3">
            <MaterialsList item={item} inventory={inventory} onChange={(materials) => update({ materials })} />
          </div>

          {/* Per-item summary strip */}
          <div className="border-t pt-3 grid grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 rounded p-2">
              <div className="text-slate-500">Labor</div>
              <div className="font-semibold tabular-nums">{(item.labor_hours || 0).toFixed(2)} hrs · {fmt(item.labor_cost)}</div>
            </div>
            <div className="bg-slate-50 rounded p-2">
              <div className="text-slate-500">Materials</div>
              <div className="font-semibold tabular-nums">{fmt(item.materials_cost)}</div>
            </div>
            <div className="bg-purple-50 rounded p-2 border border-purple-100">
              <div className="text-purple-700">Item Total</div>
              <div className="font-bold text-purple-900 tabular-nums">{fmt(item.item_total_cost)}</div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}