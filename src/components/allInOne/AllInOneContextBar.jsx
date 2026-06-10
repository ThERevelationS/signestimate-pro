import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Layers, ArrowLeft, X } from "lucide-react";
import { createPageUrl } from "@/utils";

const STORAGE_KEY = "aio_context";

// Shown across ALL estimator pages (rendered by the Layout) whenever the user
// is editing a section that belongs to an All-In-One estimate. The context is
// set via the ?aio=<id> URL param and persisted in sessionStorage so it
// survives navigation inside the module's own pages.
export default function AllInOneContextBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    // Returning to any All-In-One page clears the context automatically.
    if (location.pathname.toLowerCase().includes("allinone")) {
      sessionStorage.removeItem(STORAGE_KEY);
      setCtx(null);
      return;
    }
    const aioParam = new URLSearchParams(location.search).get("aio");
    if (aioParam) {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const prev = stored ? JSON.parse(stored) : null;
      const next = prev && prev.id === aioParam ? prev : { id: aioParam };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setCtx(next);
    } else {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      setCtx(stored ? JSON.parse(stored) : null);
    }
  }, [location]);

  // Fetch the combined estimate's name for a friendlier label.
  useEffect(() => {
    if (!ctx?.id || ctx.name) return;
    base44.entities.AllInOneEstimate.get(ctx.id)
      .then((p) => {
        if (!p) return;
        setCtx((c) => {
          if (!c || c.id !== p.id) return c;
          const next = { ...c, name: p.project_name };
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      })
      .catch(() => {});
  }, [ctx?.id, ctx?.name]);

  if (!ctx) return null;

  const goBack = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    navigate(`${createPageUrl("NewAllInOneEstimate")}?edit=${ctx.id}`);
  };

  const dismiss = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setCtx(null);
  };

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2.5 flex items-center gap-3 shadow-md">
      <Layers className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm truncate">
        You're building a section of the All-In-One estimate
        {ctx.name ? <b> "{ctx.name}"</b> : null}
        {" "}— save here and the total flows back automatically.
      </span>
      <Button
        size="sm"
        onClick={goBack}
        className="ml-auto h-7 text-xs bg-white text-indigo-700 hover:bg-indigo-50 flex-shrink-0"
      >
        <ArrowLeft className="w-3 h-3 mr-1" /> Back to Combined Estimate
      </Button>
      <button onClick={dismiss} className="text-white/70 hover:text-white flex-shrink-0" title="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}