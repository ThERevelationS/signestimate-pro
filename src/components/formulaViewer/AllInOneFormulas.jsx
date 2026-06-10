import React from "react";
import { Layers, Info } from "lucide-react";
import { ESTIMATOR_MODULES } from "@/components/allInOne/estimatorRegistry";

// Formula documentation for the All-In-One Estimator.
// Renders directly from the estimator registry, so adding a future estimator
// module to estimatorRegistry.js automatically documents it here.
export default function AllInOneFormulas() {
  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="font-semibold text-indigo-900 flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5" /> All-In-One Estimator
        </h3>
        <p className="text-sm text-indigo-800">
          The All-In-One Estimator does not introduce new pricing formulas — it BUILDS a
          multifaceted estimate out of sections. Each section creates a dedicated sub-estimate
          owned by the combined estimate and opens that module's FULL estimator, so every
          section uses that module's exact calculations. Any change to a module's formulas
          automatically applies to All-In-One sections, since they ARE that module's estimates.
        </p>
      </div>

      <div className="bg-slate-800 text-white p-4 rounded-lg">
        <h4 className="font-medium mb-2">Grand Total Formula</h4>
        <p className="font-mono text-sm">
          Grand Total = Σ (section sub-estimate totals across all modules)
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-slate-900 mb-3">Per-Module Total Sources</h4>
        <p className="text-sm text-slate-600 mb-3">
          How each module's saved project rolls up to a single line-item total:
        </p>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Module</th>
                <th className="text-left p-3 font-medium text-slate-700">Line-Item Total</th>
              </tr>
            </thead>
            <tbody>
              {ESTIMATOR_MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <tr key={mod.key} className="border-t">
                    <td className="p-3">
                      <span className="flex items-center gap-2 font-medium text-slate-900">
                        <Icon className={`w-4 h-4 ${mod.colors.text}`} />
                        {mod.name}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{mod.totalFormula}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          <b>Live sync:</b> section totals refresh from the source sub-estimates every time the
          combined estimate is opened, update in REAL TIME via entity subscriptions while it's
          open, and re-sync when the tab regains focus — refreshed totals are also persisted so
          the saved record never goes stale. Removing an owned section (or deleting the combined
          estimate) also deletes its underlying sub-estimate. New estimator modules added to{" "}
          <span className="font-mono">estimatorRegistry.js</span> appear in this table and in the
          Build Sections grid automatically.
        </p>
      </div>
    </div>
  );
}