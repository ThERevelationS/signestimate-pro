import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, X } from "lucide-react";

// Type-to-filter dropdown for long admin-managed lists (industry types,
// originations, job authority…). Values come in as plain strings.
export default function SearchableSelect({ value, options, onChange, placeholder = "select", className = "" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = (options || []).filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQ(""); }}
        className="h-7 w-full flex items-center justify-between gap-1 border border-input bg-white rounded-sm px-2 text-xs text-left"
      >
        <span className={value ? "text-slate-900 truncate" : "text-slate-400"}>{value || placeholder}</span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <X className="w-3 h-3 text-slate-400 hover:text-red-500"
              onClick={(e) => { e.stopPropagation(); onChange(""); }} />
          )}
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </span>
      </button>

      {open && (
        <div className="absolute z-[210] mt-1 w-full bg-white border border-slate-300 shadow-xl rounded-sm">
          <div className="p-1.5 border-b border-slate-100">
            <Input autoFocus className="h-7 rounded-sm text-xs" placeholder="Type to search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && <p className="px-2 py-2 text-xs text-slate-400">No matches</p>}
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false); }}
                className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-1.5 hover:bg-lime-50 ${o === value ? "bg-lime-50 font-semibold" : ""}`}
              >
                {o === value ? <Check className="w-3 h-3 text-lime-600" /> : <span className="w-3" />}
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}