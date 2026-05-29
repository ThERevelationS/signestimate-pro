import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, ShieldAlert, GitMerge, Plus, RefreshCw } from "lucide-react";

/**
 * Documents the Master Inventory Excel importer — the routing rules used
 * to map an external "Part Details Export" XLSX into the correct entity.
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
              The dialog only accepts <code>.xlsx</code> / <code>.xls</code> files with these required columns:
              <span className="ml-1 font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
                Part Name, Part Group, Part Cost, Is Active
              </span>.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">2. Routing rules — "Part Group" → target entity</h4>
            <div className="border rounded-lg divide-y">
              <RouteRow group="vinyl, wrap, laminate, transfer tape, banner, perforated, reflective, window film, paper" target="Vinyl" color="bg-blue-100 text-blue-800" />
              <RouteRow group="acrylic, pvc, sintra, acm, dibond, mdf, hdu, foam, coroplast, gatorboard, polycarbonate, styrene, AND sheet metal (aluminum/steel/stainless/galvanized sheet)" target="Substrates" color="bg-pink-100 text-pink-800" />
              <RouteRow group="LED, neon, power supply, transformer, ballast, fluorescent, photocell, timer, driver" target="Sign Lighting" color="bg-yellow-100 text-yellow-800" />
              <RouteRow group="standoff, screw, bolt, nut, washer, anchor, bracket, threaded rod, rivet, clip, z-clip" target="Hardware" color="bg-slate-100 text-slate-700" />
              <RouteRow group="permitting, engineering, design/art, freight/delivery, subcontractor, crane, inspection" target="Labor & Services" color="bg-emerald-100 text-emerald-800" />
              <RouteRow group="trim cap, returns, retainer, J-bar, raceway cover, paint, ink, primer, adhesive, tape, blade, cleaner, PPE — and anything unmatched" target="Sign Parts | Supplies (fallback)" color="bg-orange-100 text-orange-800" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              If "Part Group" doesn't match a known group, the importer falls back to keyword detection on "Part Name", then defaults to Sign Parts | Supplies.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">3. Important reclassifications</h4>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs space-y-1">
              <p><strong>Sheet metal now lives in Substrates</strong> — not in Sign Parts | Supplies. Aluminum/steel/stainless/galvanized sheets get mapped to new <code>aluminum_sheet</code> / <code>steel_sheet</code> / <code>stainless_sheet</code> / <code>galvanized_sheet</code> material types.</p>
              <p>The old "Metal / Sign Materials" tab is renamed to <strong>Sign Parts | Supplies</strong> and only holds trim cap, returns, retainers, J-bar, paint/ink, adhesives, tape, blades, cleaners, and PPE.</p>
              <p>The original Metal Inventory entity remains as a read-only "Metal (Legacy)" tab so historical data isn't orphaned.</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">4. Deduping by name (no duplicates)</h4>
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
              <p>name_key = lowercase(trim(Part Name)).replace(/\s+/g, " ")</p>
              <p>If <code>name_key</code> exists in target entity → <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]"><RefreshCw className="w-3 h-3 mr-1" />UPDATE</Badge></p>
              <p>If new → <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px]"><Plus className="w-3 h-3 mr-1" />CREATE</Badge></p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">5. Auto-grouping for vinyl (same product, different sizes)</h4>
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2">
              <p>
                <GitMerge className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                product_group_key = name with size/oz/mil/dimension suffixes stripped
              </p>
              <p>Lets the Vinyl Estimator's Roll Width Recommender treat alternate widths as one product.</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">6. Throttling &amp; retry</h4>
            <p className="text-xs">
              Imports run sequentially at ~8 writes/sec with exponential-backoff retry on rate-limit errors (500ms → 8s, 5 retries). A "Retry Failed" button re-runs only the failed rows.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RouteRow({ group, target, color }) {
  return (
    <div className="flex items-start justify-between gap-3 p-2.5 text-xs">
      <span className="text-slate-700 italic flex-1">{group}</span>
      <Badge className={`${color} hover:${color} font-medium flex-shrink-0`}>
        <Upload className="w-3 h-3 mr-1" />
        {target}
      </Badge>
    </div>
  );
}