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
          The All-In-One Estimator builds a multi-trade estimate from <b>sections</b>. Adding a
          section creates a full sub-estimate in that module's own entity and opens the module's
          real estimator — every formula, inventory, and setting of that module applies unchanged.
          The combined total is the sum of all section totals. Any change to a module's formulas
          automatically applies to All-In-One sections, because sections ARE that module's estimates.
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
          Totals sync three ways: (1) refreshed from the source estimates whenever an All-In-One
          estimate is opened, (2) updated <b>live</b> via real-time subscriptions whenever a section
          is saved anywhere in the app, and (3) on demand via "Refresh Totals". Removing an owned
          section also deletes its underlying sub-estimate. New estimator modules added to{" "}
          <span className="font-mono">estimatorRegistry.js</span> appear in this table and in the
          Build Sections grid automatically.
        </p>
      </div>
    </div>
  );
}