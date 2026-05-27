// Cutting-extras panel — only shown when "apply_cut" is on for the workflow.
//
// Contains:
//   - Transfer tape picker + apply toggle  (uses VinylInventory rolls
//     where vinyl_category is "transfer_tape" or "application_tape")
//   - Weeding Difficulty selector for THIS workflow (not stored on the vinyl
//     anymore — it's a job-level property because the same vinyl can be
//     trivial to weed for big letters and brutal for small detail)

import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Scissors } from "lucide-react";
import { WEEDING_DIFFICULTY, WEEDING_DIFFICULTY_LABELS } from "@/components/vinylInventory/vinylConstants";

export default function VinylCuttingExtrasCard({
  vinyls,
  transferTapeId,
  applyTransferTape,
  weedingDifficulty,
  onChange,
}) {
  const ttOptions = useMemo(
    () => vinyls.filter(
      (v) => v.is_active !== false
        && v.show_in_vinyl_estimator !== false
        && (v.vinyl_category === "transfer_tape" || v.vinyl_category === "application_tape")
    ),
    [vinyls]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Scissors className="w-4 h-4 text-rose-600" /> Cutting Extras
        </CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        {/* Transfer tape */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Transfer Tape</Label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Apply</span>
              <Switch
                checked={!!applyTransferTape}
                onCheckedChange={(v) => onChange({ applyTransferTape: !!v })}
              />
            </div>
          </div>
          <Select
            value={transferTapeId || "__none__"}
            onValueChange={(id) => onChange({ transferTapeId: id === "__none__" ? "" : id })}
            disabled={!applyTransferTape}
          >
            <SelectTrigger className="h-9 mt-1">
              <SelectValue placeholder="Choose transfer tape…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {ttOptions.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.vinyl_name}{v.roll_width_inches ? ` · ${v.roll_width_inches}″` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {applyTransferTape && ttOptions.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              No transfer tape rolls yet. Add one in Vinyl Inventory with category "Transfer / Application Tape".
            </p>
          )}
        </div>

        {/* Weeding difficulty */}
        <div>
          <Label className="text-xs">Weeding Difficulty</Label>
          <Select
            value={weedingDifficulty || "moderate"}
            onValueChange={(v) => onChange({ weedingDifficulty: v })}
          >
            <SelectTrigger className="h-9 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEDING_DIFFICULTY.map(w => (
                <SelectItem key={w} value={w}>{WEEDING_DIFFICULTY_LABELS[w] || w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-500 mt-1">
            Job-level — depends on artwork detail, not the vinyl itself.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}