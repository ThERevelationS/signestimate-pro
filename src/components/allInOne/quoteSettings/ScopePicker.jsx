import React, { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, ChevronsUpDown, Sparkles } from "lucide-react";
import { scopeLines, scopeText, mergeScope, autoScopeMatches } from "./autoScopes";

// Dropdown-driven scope editor: pick lines from the QuoteScopeLine library
// (grouped by category), see the current lines as removable chips, and add
// free-text lines. Auto-scope lines matched by the estimate's products are
// highlighted so it's obvious where they came from.
export default function ScopePicker({ label, kind, project, library, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState("");

  const lines = scopeLines(value);
  const used = new Set(lines.map((l) => l.toLowerCase()));
  const autoTexts = useMemo(
    () => new Set(autoScopeMatches(project, library, kind).map((l) => (l.text || "").toLowerCase())),
    [project, library, kind]
  );

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (library || []).filter(
      (l) => l.kind === kind && l.is_active !== false && (!q || (l.text || "").toLowerCase().includes(q))
    );
    const map = new Map();
    rows.forEach((r) => {
      const cat = r.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    });
    return [...map.entries()];
  }, [library, kind, search]);

  const addText = (text) => {
    const { text: next } = mergeScope(value, [text]);
    onChange(next);
  };

  const removeAt = (idx) => onChange(scopeText(lines.filter((_, i) => i !== idx)));

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <ChevronsUpDown className="w-3 h-3" /> Choose from library
        </button>
      </div>

      {/* Current lines as chips */}
      <div className="mt-1 flex flex-wrap gap-1.5 min-h-[28px] rounded-md border border-slate-200 p-1.5">
        {lines.length === 0 && <span className="text-[11px] text-slate-400 px-1">No lines yet — pick from the library below.</span>}
        {lines.map((l, i) => {
          const isAuto = autoTexts.has(l.toLowerCase());
          return (
            <span
              key={`${l}-${i}`}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                isAuto ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-700"
              }`}
            >
              {isAuto && <Sparkles className="w-2.5 h-2.5" />}
              {l}
              <button type="button" onClick={() => removeAt(i)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
            </span>
          );
        })}
      </div>

      {/* Library dropdown */}
      {open && (
        <div className="mt-1.5 border border-slate-200 rounded-md bg-white shadow-sm">
          <div className="p-1.5 border-b border-slate-100">
            <Input className="h-7 text-xs" placeholder="Search library…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {grouped.length === 0 && <p className="text-[11px] text-slate-400 p-2">Nothing in the library — add lines on the Estimate Settings page.</p>}
            {grouped.map(([cat, rows]) => (
              <div key={cat} className="mb-1">
                <p className="text-[10px] font-bold uppercase text-slate-400 px-1.5 py-1">{cat}</p>
                {rows.map((r) => {
                  const already = used.has((r.text || "").toLowerCase());
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={already}
                      onClick={() => addText(r.text)}
                      className={`w-full text-left text-xs px-1.5 py-1 rounded flex items-start gap-1.5 ${
                        already ? "text-slate-300" : "text-slate-700 hover:bg-indigo-50"
                      }`}
                    >
                      <Plus className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="flex-1">{r.text}</span>
                      {(r.always_include || (r.auto_modules || []).length > 0) && (
                        <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" title="Auto-scope line" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free-text add */}
      <div className="flex gap-1.5 mt-1.5">
        <Input
          className="h-7 text-xs"
          placeholder="Add a custom line…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim()) { e.preventDefault(); addText(custom); setCustom(""); }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2"
          onClick={() => { if (custom.trim()) { addText(custom); setCustom(""); } }}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}