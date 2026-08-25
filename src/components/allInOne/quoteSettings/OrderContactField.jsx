import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, Plus, X, ChevronsUpDown } from "lucide-react";
import AddContactDialog from "./AddContactDialog";

const names = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);

// Multi-select order contacts, sourced from the linked Customer record
// (primary contact + additional contacts) so the options always match the
// customer page. New contacts are written back to the customer.
export default function OrderContactField({ project, updateField }) {
  const [contacts, setContacts] = useState([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = () => {
    if (!project.customer_id) return setContacts([]);
    base44.entities.Customer.get(project.customer_id).then((c) => {
      const primary = `${c.contact_first_name || ""} ${c.contact_last_name || ""}`.trim();
      const rows = [
        ...(primary ? [{ name: primary, detail: [c.contact_position, c.contact_email, c.contact_office_phone].filter(Boolean).join(" · "), primary: true }] : []),
        ...(c.additional_contacts || []).filter((x) => x.is_active !== false).map((x) => ({
          name: `${x.first_name || ""} ${x.last_name || ""}`.trim(),
          detail: [x.position, x.email, x.office_phone || x.cell_phone].filter(Boolean).join(" · "),
        })),
      ].filter((r) => r.name);
      setContacts(rows);
    }).catch(() => setContacts([]));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [project.customer_id]);

  const selected = names(project.order_contact);
  const setSelected = (list) => updateField("order_contact", list.join(", "));

  const toggle = (name) =>
    setSelected(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Order Contact</Label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOpen(!open)} className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            <ChevronsUpDown className="w-3 h-3" /> Select contacts
          </button>
          <button type="button" onClick={() => setAdding(true)} className="text-[11px] font-medium text-lime-600 hover:text-lime-700 flex items-center gap-1">
            <Plus className="w-3 h-3" /> New
          </button>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap gap-1.5 min-h-[28px] rounded-md border border-slate-200 p-1.5">
        {selected.length === 0 && <span className="text-[11px] text-slate-400 px-1">No contact selected.</span>}
        {selected.map((n) => (
          <span key={n} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
            {n}
            <button type="button" onClick={() => setSelected(selected.filter((x) => x !== n))} className="hover:text-red-600"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>

      {open && (
        <div className="mt-1.5 border border-slate-200 rounded-md bg-white shadow-sm max-h-44 overflow-y-auto p-1">
          {contacts.length === 0 && (
            <p className="text-[11px] text-slate-400 p-2">
              {project.customer_id ? "This customer has no contacts yet — add one with “New”." : "Link a customer on the Estimate Details step first."}
            </p>
          )}
          {contacts.map((c) => (
            <button key={c.name} type="button" onClick={() => toggle(c.name)}
              className="w-full text-left text-xs px-1.5 py-1 rounded flex items-start gap-1.5 text-slate-700 hover:bg-indigo-50">
              <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${selected.includes(c.name) ? "text-indigo-600" : "text-transparent"}`} />
              <span className="flex-1">
                {c.name}{c.primary && <span className="text-[10px] text-slate-400"> · primary</span>}
                {c.detail && <span className="block text-[10px] text-slate-400">{c.detail}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      <AddContactDialog
        open={adding}
        onOpenChange={setAdding}
        customerId={project.customer_id}
        onCreated={(name) => { setSelected([...selected, name]); load(); }}
      />
    </div>
  );
}