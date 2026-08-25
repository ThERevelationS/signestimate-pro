import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Check, Pencil } from "lucide-react";

// Salespeople ARE app users. Flip the switch to make a user selectable as a
// salesperson, and edit their screen name — the name used everywhere in the
// app (estimates, customers, queues).
export default function SalespeopleEditor({ canEdit }) {
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");

  const load = async () => {
    const rows = await base44.entities.User.list("full_name", 500);
    setUsers(rows || []);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (u, on) => {
    await base44.entities.User.update(u.id, { is_salesperson: on });
    load();
  };

  const saveName = async (u) => {
    await base44.entities.User.update(u.id, { screen_name: draft.trim() });
    setEditingId(null);
    load();
  };

  return (
    <div className="bg-white border border-slate-300 rounded-sm p-4">
      <p className="text-sm font-bold text-slate-800">Salespeople</p>
      <p className="text-xs text-slate-500 mb-2">
        Salespeople come from your app users. Turn a user on to make them selectable as a Salesperson on estimates and
        customers, and edit their screen name — that name is what the whole app displays. Their login email is matched
        to the signed-in user so their name is picked automatically on a new estimate.
      </p>
      <div className="divide-y divide-slate-100">
        {users.length === 0 && <p className="text-xs text-slate-500 py-2">No users yet — invite users from the Admin page.</p>}
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 py-1.5 text-sm">
            <div className="flex-1 min-w-0">
              {editingId === u.id ? (
                <div className="flex items-center gap-2">
                  <Input className="h-7 rounded-sm text-xs w-56" value={draft} onChange={(e) => setDraft(e.target.value)}
                    placeholder={u.full_name || u.email} />
                  <Button size="sm" className="h-7 rounded-sm bg-lime-600 hover:bg-lime-700 text-white" onClick={() => saveName(u)}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <span className="text-slate-800 font-medium">
                  {u.screen_name || u.full_name || u.email}
                  {u.screen_name && u.full_name && u.screen_name !== u.full_name && (
                    <span className="text-xs text-slate-400"> (login: {u.full_name})</span>
                  )}
                </span>
              )}
              <span className="block text-[11px] text-slate-400 truncate">{u.email}</span>
            </div>
            {canEdit && (
              <>
                {editingId !== u.id && (
                  <button type="button" title="Edit screen name"
                    onClick={() => { setEditingId(u.id); setDraft(u.screen_name || u.full_name || ""); }}>
                    <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                  </button>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">salesperson</span>
                  <Switch checked={!!u.is_salesperson} onCheckedChange={(v) => toggle(u, v)} />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}