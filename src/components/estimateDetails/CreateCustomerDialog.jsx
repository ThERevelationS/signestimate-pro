import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import CustomerForm from "@/components/customers/CustomerForm";

const EMPTY = {
  billing_contact_same: true,
  location_same_as_billing: true,
  billing_country: "United States",
  customer_status: "prospect",
  is_active: true,
  pricing_tier: 1,
};

// Create New Customer — same form component the Edit Customer screen uses.
export default function CreateCustomerDialog({ lists, onClose, onCreated }) {
  const [c, setC] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const missing = !c.company_name || !c.company_phone || !c.contact_first_name || !c.contact_last_name ||
    !c.contact_email || !c.billing_address_1 || !c.billing_city || !c.billing_postal_code;

  const create = async () => {
    setTouched(true);
    if (missing) return;
    setSaving(true);
    const created = await base44.entities.Customer.create(c);
    setSaving(false);
    onCreated(created);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto py-8">
      <div className="absolute inset-0 bg-slate-800/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-5xl mx-4 p-6 shadow-2xl rounded-sm">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-red-600"><X className="w-4 h-4" /></button>
        <h2 className="text-sm font-bold uppercase tracking-wider text-lime-600 mb-4">Create New Customer</h2>

        <CustomerForm
          value={c}
          onChange={(k, v) => setC((p) => ({ ...p, [k]: v }))}
          lists={lists}
          showRequired={touched}
        />

        <div className="flex justify-between items-center border-t border-slate-200 mt-6 pt-4">
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => { setC(EMPTY); setTouched(false); }}>Clear Form</Button>
          <Button size="sm" className="h-8 rounded-sm bg-lime-200 hover:bg-lime-300 border border-lime-500 text-slate-900"
            onClick={create} disabled={saving}>
            {saving ? "Creating…" : "Create Customer"}
          </Button>
        </div>
      </div>
    </div>
  );
}