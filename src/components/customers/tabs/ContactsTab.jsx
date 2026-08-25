import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, UserRound } from "lucide-react";
import SearchableSelect from "@/components/common/SearchableSelect";

const EMPTY = { first_name: "", last_name: "", position: "", email: "", office_phone: "", office_ext: "", cell_phone: "", contact_status: "", job_authority: "", is_active: true };

// Contacts tab — primary / billing contact summary plus additional contacts.
export default function ContactsTab({ customer: c, lists, onChange }) {
  const contacts = c.additional_contacts || [];
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY);

  const save = () => {
    if (!draft.first_name && !draft.last_name) return;
    onChange("additional_contacts", [...contacts, draft]);
    setDraft(EMPTY);
    setAdding(false);
  };

  const remove = (idx) => onChange("additional_contacts", contacts.filter((_, i) => i !== idx));

  const primary = [`${c.contact_first_name || ""} ${c.contact_last_name || ""}`.trim(), c.contact_office_phone || c.contact_cell_phone, c.contact_email].filter(Boolean).join(" · ");
  const billing = c.billing_contact_same === false
    ? [c.billing_contact_name, c.billing_contact_phone, c.billing_contact_email].filter(Boolean).join(" · ")
    : primary;

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-lime-600 mb-2">Active Contacts</p>
        <ul className="text-sm space-y-1">
          {[`${c.contact_first_name || ""} ${c.contact_last_name || ""}`.trim(), ...contacts.filter((x) => x.is_active !== false).map((x) => `${x.first_name} ${x.last_name}`.trim())]
            .filter(Boolean)
            .map((n, i) => <li key={i} className="text-blue-600">{n}</li>)}
        </ul>
      </div>

      <div className="md:col-span-3 space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-lime-600 mb-2">Customer Contacts</p>
          <p className="text-sm"><b>Primary:</b> <span className="text-blue-600">{primary || "—"}</span></p>
          <p className="text-sm"><b>Billing:</b> <span className="text-blue-600">{billing || "—"}</span></p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-sm p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Additional Contacts</p>
            <Button size="sm" className="h-7 rounded-sm bg-zinc-700 hover:bg-zinc-800 text-white text-xs" onClick={() => setAdding(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add New Contact
            </Button>
          </div>

          {contacts.length === 0 && !adding && <p className="text-xs text-slate-500 pt-2">No additional contacts.</p>}

          <div className="divide-y divide-slate-200 mt-2">
            {contacts.map((x, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                <UserRound className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-800">{`${x.first_name} ${x.last_name}`.trim()}</span>
                <span className="text-xs text-slate-500 flex-1 truncate">
                  {[x.position, x.email, x.office_phone, x.cell_phone, x.job_authority].filter(Boolean).join(" · ")}
                </span>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500 hover:bg-red-50" onClick={() => remove(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {adding && (
            <div className="grid md:grid-cols-3 gap-2 pt-3">
              <Input className="h-7 rounded-sm text-xs" placeholder="First name" value={draft.first_name} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} />
              <Input className="h-7 rounded-sm text-xs" placeholder="Last name" value={draft.last_name} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} />
              <Input className="h-7 rounded-sm text-xs" placeholder="Position" value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} />
              <Input className="h-7 rounded-sm text-xs" placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              <Input className="h-7 rounded-sm text-xs" placeholder="Office phone" value={draft.office_phone} onChange={(e) => setDraft({ ...draft, office_phone: e.target.value })} />
              <Input className="h-7 rounded-sm text-xs" placeholder="Cell phone" value={draft.cell_phone} onChange={(e) => setDraft({ ...draft, cell_phone: e.target.value })} />
              <SearchableSelect value={draft.contact_status} options={lists.listValues("contact_status")} onChange={(v) => setDraft({ ...draft, contact_status: v })} placeholder="Contact status" />
              <SearchableSelect value={draft.job_authority} options={lists.listValues("job_authority")} onChange={(v) => setDraft({ ...draft, job_authority: v })} placeholder="Job authority" />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 rounded-sm bg-lime-600 hover:bg-lime-700 text-white text-xs" onClick={save}>Save Contact</Button>
                <Button size="sm" variant="outline" className="h-7 rounded-sm text-xs" onClick={() => { setAdding(false); setDraft(EMPTY); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}