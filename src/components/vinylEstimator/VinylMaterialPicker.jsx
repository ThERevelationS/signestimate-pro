// Vinyl + Laminate picker.
// Upgrades:
//   #25 Use-case filter (auto-recommend cast for wraps, etc.)
//   #27 Lifetime / indoor-only warning (bundled with #25 since it's cheap)

import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Layers, AlertTriangle } from "lucide-react";
import { computeLifetimeWarning } from "./vinylCostHelpers";

// Map preset key → preferred vinyl categories (used to filter the base vinyl dropdown).
const PRESET_CATEGORY_HINT = {
  wrap: ["cast", "wrap_film"],
  print_only: ["calendered", "intermediate", "print_media"],
  print_and_cut: ["calendered", "intermediate", "cast", "print_media"],
  cut_only: ["calendered", "intermediate", "cast", "reflective", "translucent", "fluorescent", "metallic"],
  laminated_decal: ["cast", "calendered", "intermediate"],
};

export default function VinylMaterialPicker({
  vinyls, vinylId, laminateId, applyLaminate, onChange,
  presetKey,          // current workflow preset, used for #25 recommendations
  installEnvironment, // "interior" | "exterior" → drives lifetime warning
  recommendOnly = false,
}) {
  const recommendedCategories = presetKey ? PRESET_CATEGORY_HINT[presetKey] : null;

  const baseOptions = useMemo(() => {
    const base = vinyls.filter(v => v.is_active !== false && !v.is_laminate && v.show_in_vinyl_estimator !== false);
    if (!recommendOnly || !recommendedCategories) return base;
    return base.filter(v => recommendedCategories.includes(v.vinyl_category));
  }, [vinyls, recommendOnly, recommendedCategories]);

  const lamOptions = useMemo(
    () => vinyls.filter(v => v.is_active !== false && v.is_laminate && v.show_in_vinyl_estimator !== false),
    [vinyls]
  );
  const selectedVinyl = vinyls.find(v => v.id === vinylId) || null;
  const lifetimeWarning = computeLifetimeWarning(selectedVinyl, installEnvironment);

  const handleVinylChange = (newId) => {
    const v = vinyls.find(x => x.id === newId);
    const nextLam = v?.default_laminate_id || laminateId || "";
    const nextApply = !!(v?.requires_lamination || (applyLaminate && nextLam));
    onChange({ vinylId: newId, laminateId: nextLam, applyLaminate: nextApply });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" /> Vinyl & Laminate
          </CardTitle>
          {recommendedCategories && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-500">Recommend only</span>
              <Switch checked={recommendOnly} onCheckedChange={(v) => onChange({ vinylId, laminateId, applyLaminate, recommendOnly: !!v })} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Base Vinyl</Label>
          <Select value={vinylId || ""} onValueChange={handleVinylChange}>
            <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Choose vinyl…" /></SelectTrigger>
            <SelectContent>
              {baseOptions.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.vinyl_name}{v.roll_width_inches ? ` · ${v.roll_width_inches}″` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVinyl && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedVinyl.vinyl_category && <Badge variant="outline" className="text-[10px]">{selectedVinyl.vinyl_category}</Badge>}
              {selectedVinyl.finish && <Badge variant="outline" className="text-[10px]">{selectedVinyl.finish}</Badge>}
              {selectedVinyl.expected_life_years_outdoor && (
                <Badge variant="outline" className="text-[10px]">{selectedVinyl.expected_life_years_outdoor}y outdoor</Badge>
              )}
              {selectedVinyl.requires_lamination && <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">recommends laminate</Badge>}
            </div>
          )}
          {/* Lifetime warning — Feature #27 */}
          {lifetimeWarning && (
            <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{lifetimeWarning.message}</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Laminate</Label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Apply</span>
              <Switch checked={!!applyLaminate} onCheckedChange={(v) => onChange({ vinylId, laminateId, applyLaminate: !!v })} />
            </div>
          </div>
          <Select
            value={laminateId || "__none__"}
            onValueChange={(id) => onChange({ vinylId, laminateId: id === "__none__" ? "" : id, applyLaminate: !!applyLaminate })}
            disabled={!applyLaminate}
          >
            <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Choose laminate…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {lamOptions.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.vinyl_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {applyLaminate && lamOptions.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">No laminate rolls tagged yet. Tag one in Master Inventory → Vinyl.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}