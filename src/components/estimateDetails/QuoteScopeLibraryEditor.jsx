import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { ESTIMATOR_MODULES } from "@/components/allInOne/estimatorRegistry";

const blank = { text: "", kind: "inclusion", category: "General", always_include: false, auto_modules: [] };

// Admin editor for the scope-line library used by the Quote Settings scope
// dropdowns. A line can be flagged "always" (every quote) and/or tied to
// estimator modules so it is auto-added when that product is on the estimate.
export default function QuoteScopeLibraryEditor({ canEdit }) {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(blank);

  const load = () => base44.entities.QuoteScopeLine.list("sort_order", 500).then((r) => setRows(r || []));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.text.trim()) return;
    await base44.entities.QuoteScopeLine.create({ ...draft, sort_order: rows.length });
    setDraft(blank);
    load();
  };

  const toggleModule = (row, key) => {
    const has = (row.auto_modules || []).includes(key);
    const next = has ? row.auto_modules.filter((k) => k !== key) : [...(row.auto_modules || []), key];
    base44.entities.QuoteScopeLine.update(row.id, { auto_modules: next }).then(load);
  };

  const remove = async (row) => {
    if (!confirm(`Delete scope line "${row.text}"?`)) return;
    await base44.entities.QuoteScopeLine.delete(row.id);
    load();
  };

  const draftModule = (key) => {
    const has = draft.auto_modules.includes(key);
    setDraft({ ...draft, auto_modules: has ? draft.auto_modules.filter((k) => k !== key) : [...draft.auto_modules, key] });
  };

  const group = (kind) => rows.filter((r) => r.kind === kind);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        These lines fill the <b>Included / Excluded scope dropdowns</b> on the Quote Settings panel. Tick modules to make a
        line auto-add itself whenever that product is added to an estimate.
      </p>

      {canEdit && (
        <div className="border border-slate-200 rounded-sm p-2 space-y-2 bg-slate-50">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-8 rounded-sm flex-1 min-w-[240px]" placeholder="Scope line text…" value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
            <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v })}>
              <SelectTrigger className="h-8 rounded-sm w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inclusion">Included</SelectItem>
                <SelectItem value="exclusion">Excluded</SelectItem>
              </SelectContent>
            </Select>
            <Input className="h-8 rounded-sm w-36" placeholder="Category" value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <Switch checked={draft.always_include} onCheckedChange={(v) => setDraft({ ...draft, always_include: v })} />
              Always
            </label>
            <Button size="sm" className="h-8 rounded-sm bg-zinc-700 hover:bg-zinc-800 text-white" onClick={add}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {ESTIMATOR_MODULES.map((m) => (
              <button key={m.key} type="button" onClick={() => draftModule(m.key)}
                className={`text-[10px] px-1.5 py-0.5 rounded-full border ${draft.auto_modules.includes(m.key)
                  ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-white border-slate-200 text-slate-500"}`}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {["inclusion", "exclusion"].map((kind) => (
        <div key={kind}>
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
            {kind === "inclusion" ? "Included in scope" : "Excluded from scope"} ({group(kind).length})
          </p>
          <div className="divide-y divide-slate-100">
            {group(kind).length === 0 && <p className="text-xs text-slate-500 py-1.5">Nothing yet.</p>}
            {group(kind).map((r) => (
              <div key={r.id} className="py-1.5">
                <div className="flex items-center gap-2 text-sm">
                  {(r.always_include || (r.auto_modules || []).length > 0) && <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                  <span className={`flex-1 ${r.is_active === false ? "text-slate-400 line-through" : "text-slate-800"}`}>{r.text}</span>
                  <span className="text-[10px] text-slate-400 uppercase">{r.category || "General"}</span>
                  {r.always_include && <span className="text-[10px] font-bold uppercase text-amber-600">always</span>}
                  {canEdit && (
                    <>
                      <Switch checked={r.is_active !== false} onCheckedChange={(v) => base44.entities.QuoteScopeLine.update(r.id, { is_active: v }).then(load)} />
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500 hover:bg-red-50" onClick={() => remove(r)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
                {canEdit && (
                  <div className="flex flex-wrap gap-1 mt-1 pl-1">
                    {ESTIMATOR_MODULES.map((m) => (
                      <button key={m.key} type="button" onClick={() => toggleModule(r, m.key)}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border ${(r.auto_modules || []).includes(m.key)
                          ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-white border-slate-200 text-slate-400"}`}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}