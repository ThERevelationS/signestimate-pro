import React from "react";
import { AlertCircle } from "lucide-react";

// Returns non-blocking warnings to help catch obvious mistakes
export default function ValidationWarnings({ project }) {
  const warnings = [];
  const items = project?.items || [];

  if (items.length === 0) {
    warnings.push("No line items added yet.");
  }

  items.forEach((it, i) => {
    const num = i + 1;
    if (!it.qty_letters || it.qty_letters <= 0) {
      warnings.push(`Item #${num}: Letter quantity is 0.`);
    }
    if (it.installation_type === "raceway" && (!it.raceway_length_feet || it.raceway_length_feet <= 0)) {
      warnings.push(`Item #${num}: Raceway selected but length is 0 ft.`);
    }
    if (!it.installation_height_feet || it.installation_height_feet <= 0) {
      warnings.push(`Item #${num}: Install height is 0 ft.`);
    }
    if (!it.materials || it.materials.length === 0) {
      warnings.push(`Item #${num}: No materials attached.`);
    }
  });

  if (warnings.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
        <AlertCircle className="w-3.5 h-3.5" />
        Heads up ({warnings.length})
      </div>
      <ul className="text-xs text-amber-900 space-y-0.5 list-disc list-inside">
        {warnings.slice(0, 6).map((w, i) => (
          <li key={i}>{w}</li>
        ))}
        {warnings.length > 6 && (
          <li className="opacity-70">+{warnings.length - 6} more...</li>
        )}
      </ul>
    </div>
  );
}