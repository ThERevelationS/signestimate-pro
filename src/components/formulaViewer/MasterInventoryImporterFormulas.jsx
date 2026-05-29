import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, ShieldAlert, GitMerge, Plus, RefreshCw } from "lucide-react";

/**
 * Documents the Master Inventory Excel importer — the routing rules used
 * to map an external "Part Details Export" XLSX into the correct entity.
 *
 * This isn't an estimate formula, but per project policy every new module
 * is added to the Formula Viewer so users can verify mapping logic.
 */
export default function MasterInventoryImporterFormulas() {
  return (
    <div className="space-y-4">
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Master Inventory Excel Importer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900">
              The importer and the Master Inventory page are restricted to admin users only.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">1. File validation</h4>
            <p className="text-xs">
              The dialog only accepts <code>.xlsx</code> / <code>.xls</code> files. The first sheet must contain these required columns:
              <span className="ml-1 font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
                Part Name, Part Group, Part Cost, Is Active
              </span>.
              Any other file is rejected with a clear error.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">2. Routing rules — "Part Group" → target entity</h4>
            <div className="border rounded-lg divide-y">
              <RouteRow group="vinyl, cut vinyl, print vinyl, wrap, laminate, transfer tape, banner, perforated, reflective, window film" target="Vinyl Inventory" color="bg-blue-100 text-blue-800" />
              <RouteRow group="acrylic, pvc, sintra, acm, dibond, alumalite, mdf, hdu, foam, wood, coroplast, gatorboard, polycarbonate, lexan, styrene" target="Substrates (Dimensional Letter Material)" color="bg-pink-100 text-pink-800" />
              <RouteRow group="aluminum, steel, stainless, angle, tube, channel, flat bar, sheet metal" target="Metal / Sign Materials (Inventory)" color="bg-orange-100 text-orange-800" />
              <RouteRow group="anything else" target="Metal / Sign Materials (fallback)" color="bg-slate-100 text-slate-700" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              If "Part Group" doesn't match a known group, the importer falls back to keyword detection on the "Part Name" before defaulting to the Metal bucket.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">3. Deduping by name (no duplicates)</h4>
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
              <p>name_key = lowercase(trim(Part Name)).replace(/\s+/g, " ")</p>
              <p>If <code>name_key</code> exists in target entity → <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]"><RefreshCw className="w-3 h-3 mr-1" />UPDATE</Badge></p>
              <p>If new → <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px]"><Plus className="w-3 h-3 mr-1" />CREATE</Badge></p>
              <p>Rows duplicated within the same import batch are collapsed (last wins).</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">4. Auto-grouping for vinyl (same product, different sizes)</h4>
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2">
              <p>
                <GitMerge className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                product_group_key = name with size/oz/mil/dimension suffixes stripped
              </p>
              <p className="font-mono text-[11px]">
                "Banner - 13oz 54in" → "banner 13oz" → group_key = "banner"<br />
                "Banner - 13oz 63in" → "banner 13oz" → group_key = "banner"
              </p>
              <p>Both rows land in Vinyl Inventory with the same <code>product_group_key</code>, so the Vinyl Estimator's Roll Width Recommender automatically considers them as alternate sizes of the same product.</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">5. Field mapping per target</h4>
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <FieldMap title="→ Vinyl" rows={[
                "Part Name → vinyl_name",
                "Color → color_name",
                "Finish → finish",
                "Parent Width (in) → roll_width_inches",
                "Parent Height (ft) ÷ 3 → roll_length_yards",
                "Part Cost → cost_per_sqft",
                "Part Group → supplier",
                "Is Active → is_active",
                "show_in_vinyl_estimator = true",
              ]} />
              <FieldMap title="→ Substrate" rows={[
                "Part Name → material_name",
                "Auto-detect material_type from name",
                "Auto-parse thickness from name (1/4, 0.5)",
                "Parent Height → sheet_length_inches",
                "Parent Width → sheet_width_inches",
                "Part Cost → cost_per_sheet",
                "Color → color",
                "show_in_dimensional_letters = true",
                "show_in_lobby_sign_backer = true",
              ]} />
              <FieldMap title="→ Metal" rows={[
                "Part Group → material_type",
                "Part Name → product_type",
                "Color or Thickness → size",
                "Thickness → thickness_gauge",
                "Part Cost → cost_per_unit",
                "Pricing Units → unit_type (foot/sqft/pound/piece)",
                "Part Group → supplier",
              ]} />
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">6. Idempotency</h4>
            <p className="text-xs">
              Running the same export twice is safe — the second run produces 0 creates and N updates with identical values (only price/dimension changes from the source file overwrite the database).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RouteRow({ group, target, color }) {
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 text-xs">
      <span className="text-slate-700 italic">{group}</span>
      <Badge className={`${color} hover:${color} font-medium`}>
        <Upload className="w-3 h-3 mr-1" />
        {target}
      </Badge>
    </div>
  );
}

function FieldMap({ title, rows }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="font-semibold text-slate-800 mb-1.5">{title}</p>
      <ul className="space-y-0.5 text-[11px] text-slate-600 font-mono">
        {rows.map((r, i) => (
          <li key={i}>• {r}</li>
        ))}
      </ul>
    </div>
  );
}