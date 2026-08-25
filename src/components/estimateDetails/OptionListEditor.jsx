import React, { useState } from "react";
import { EstimateOption } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

// Reusable admin editor for one EstimateOption list (salespeople, sales
// centers, terms, etc.). Read-only for non-admins.
export default function OptionListEditor({ title, optionType, description, rows, canEdit, onChanged, withEmail }) {
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!label.trim()) return;
    setBusy(true);
    await EstimateOption.create({
      option_type: optionType,
      label: label.trim(),
      email: withEmail ? email.trim() : "",
      sort_order: rows.length,
    });
    setLabel(""); setEmail(""); setBusy(false);
    onChanged();
  };

  const remove = async (row) => {
    if (!confirm(`Delete "${row.label}"?`)) return;
    await EstimateOption.delete(row.id);
    onChanged();
  };

  const toggleActive = async (row, active) => {
    await EstimateOption.update(row.id, { is_active: active });
    onChanged();
  };

  return (
    <div className="bg-white border border-slate-300 rounded-sm p-4">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {description && <p className="text-xs text-slate-500 mb-2">{description}</p>}

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <Input className="h-8 rounded-sm w-56" placeholder="New value" value={label} onChange={(e) => setLabel(e.target.value)} />
          {withEmail && <Input className="h-8 rounded-sm w-56" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />}
          <Button size="sm" className="h-8 rounded-sm bg-zinc-700 hover:bg-zinc-800 text-white" onClick={add} disabled={busy}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {rows.length === 0 && <p className="text-xs text-slate-500 py-2">No values yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-1.5 text-sm">
            <span className={`flex-1 ${r.is_active === false ? "text-slate-400 line-through" : "text-slate-800"}`}>
              {r.label}{r.email ? <span className="text-xs text-slate-400"> · {r.email}</span> : null}
            </span>
            {canEdit && (
              <>
                <Switch checked={r.is_active !== false} onCheckedChange={(v) => toggleActive(r, v)} />
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500 hover:bg-red-50" onClick={() => remove(r)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}