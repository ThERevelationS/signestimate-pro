import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY = { first_name: "", last_name: "", position: "", email: "", office_phone: "", office_ext: "", cell_phone: "", job_authority: "", is_active: true };

const Field = ({ label, children }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

// Creates a new contact ON the customer record (Customer.additional_contacts),
// so it shows up identically on the customer page's Contacts tab.
export default function AddContactDialog({ open, onOpenChange, customerId, onCreated }) {
  const [draft, setDraft] = useState(EMPTY);
  const [authorities, setAuthorities] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.EstimateOption.filter({ option_type: "job_authority" }, "sort_order", 100)
      .then((r) => setAuthorities((r || []).filter((o) => o.is_active !== false)));
  }, []);

  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  const save = async () => {
    if (!draft.first_name.trim() && !draft.last_name.trim()) return;
    setSaving(true);
    try {
      if (customerId) {
        const customer = await base44.entities.Customer.get(customerId);
        await base44.entities.Customer.update(customerId, {
          additional_contacts: [...(customer.additional_contacts || []), draft],
        });
      }
      onCreated(`${draft.first_name} ${draft.last_name}`.trim(), draft);
      setDraft(EMPTY);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="text-base">Create New Contact</DialogTitle></DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Field label="First Name"><Input className="h-8" value={draft.first_name} onChange={set("first_name")} /></Field>
          <Field label="Last Name"><Input className="h-8" value={draft.last_name} onChange={set("last_name")} /></Field>
          <Field label="Position"><Input className="h-8" value={draft.position} onChange={set("position")} /></Field>
          <Field label="Email"><Input className="h-8" value={draft.email} onChange={set("email")} /></Field>
          <Field label="Office Phone"><Input className="h-8" value={draft.office_phone} onChange={set("office_phone")} /></Field>
          <Field label="Ext."><Input className="h-8" value={draft.office_ext} onChange={set("office_ext")} /></Field>
          <Field label="Cell Phone"><Input className="h-8" value={draft.cell_phone} onChange={set("cell_phone")} /></Field>
          <Field label="Job Authority">
            <Select value={draft.job_authority} onValueChange={(v) => setDraft({ ...draft, job_authority: v })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="-- select --" /></SelectTrigger>
              <SelectContent>
                {authorities.map((a) => <SelectItem key={a.id} value={a.label}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {!customerId && <p className="text-[11px] text-amber-600">No customer linked yet — this contact will only be added to the quote.</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white" onClick={save}>
            {saving ? "Saving…" : "Create New Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}