// Lightweight skeleton shown while a lazy-loaded route's chunk is being fetched.
// Sized to match the page content area so there's no layout shift when the
// real page mounts (the Layout sidebar + header stay visible around it).
import React from "react";

export default function RouteSkeleton() {
  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" aria-busy="true" aria-live="polite">
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-9 w-64 bg-slate-200 rounded" />
        <div className="h-4 w-96 bg-slate-200 rounded" />
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="h-40 bg-white border border-slate-200 rounded-xl shadow-sm" />
          <div className="h-40 bg-white border border-slate-200 rounded-xl shadow-sm" />
          <div className="h-40 bg-white border border-slate-200 rounded-xl shadow-sm" />
          <div className="h-40 bg-white border border-slate-200 rounded-xl shadow-sm" />
        </div>
      </div>
    </div>
  );
}