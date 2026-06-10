import React, { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, Loader2 } from "lucide-react";
import { ESTIMATOR_MODULES_BY_KEY } from "./estimatorRegistry";

// Mounts a module's FULL estimator page INLINE inside the All-In-One
// estimator. The parent swaps the URL params (replaceState — no navigation)
// before mounting, so the embedded page loads the right sub-estimate exactly
// as if it were opened normally.
export default function EstimatorSectionPanel({ item, onClose }) {
  const mod = ESTIMATOR_MODULES_BY_KEY[item.module_key];
  if (!mod) return null;
  const Icon = mod.icon;
  const Page = mod.Page;

  return (
    <div className="bg-slate-50">
      <div className="sticky top-0 z-30 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2.5 flex items-center gap-3 shadow-md">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm truncate">
          All-In-One section: <b>{item.project_name || mod.shortName}</b> — save here and the
          total flows into the combined estimate automatically.
        </span>
        <Button
          size="sm"
          onClick={onClose}
          className="ml-auto h-7 text-xs bg-white text-indigo-700 hover:bg-indigo-50 flex-shrink-0"
        >
          <ChevronUp className="w-3 h-3 mr-1" /> Collapse Section
        </Button>
      </div>
      {/* Width unlock: embedded estimator pages center themselves with
          max-w-* containers — inside the All-In-One they get the FULL width
          of the page so nothing is condensed, at every resolution. */}
      <div id="aio-embed">
        <style>{`
          #aio-embed .max-w-7xl, #aio-embed .max-w-6xl, #aio-embed .max-w-5xl,
          #aio-embed .max-w-4xl, #aio-embed .max-w-\\[120rem\\], #aio-embed .max-w-screen-2xl {
            max-width: none !important;
          }
        `}</style>
        <Suspense
          fallback={
            <div className="p-16 flex items-center justify-center gap-3 text-slate-600">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              Loading {mod.shortName} estimator…
            </div>
          }
        >
          <Page key={item.project_id} />
        </Suspense>
      </div>
    </div>
  );
}