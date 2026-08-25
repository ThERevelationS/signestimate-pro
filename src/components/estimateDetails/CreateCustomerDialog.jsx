import React, { useState } from "react";
import { Customer } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const EMPTY = {
  company_name: "", company_phone: "", company_fax: "", additional_phone: "", additional_phone_type: "",
  contact_first_name: "", contact_last_name: "", contact_position: "", contact_email: "",
  contact_office_phone: "", contact_office_ext: "", contact_cell_phone: "",
  contact_status: "", job_authority: "", billing_contact_same: true,
  billing_address_1: "", billing_address_2: "", billing_city: "", billing_state: "",
  billing_postal_code: "", billing_postal_ext: "", billing_country: "United States",
  location_same_as_billing: true,
  salesperson: "", location: "", default_tax_group: "", customer_origination: "", industry_type: "", master_account: "",
  is_active: true,
};

const Req = ({ show }) => (show ? <span className="text-[10px] text-red-500 ml-1">required</span> : null);

// Create New Customer — mirrors the CoreBridge form: company, primary +
// billing contact, billing / location address, and sales associations.
// Every dropdown is driven by the admin-managed Estimate Settings lists.
export default function CreateCustomerDialog({ options, taxGroups, onClose, onCreated }) {
  const [c, setC] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = (k, v) => setC((p) => ({ ...p, [k]: v }));
  const opts = (type) => (options || []).filter((o) => o.option_type === type && o.is_active !== false);

  const missing = !c.company_name || !c.company_phone || !c.contact_first_name || !c.contact_last_name ||
    !c.contact_email || !c.billing_address_1 || !c.billing_city || !c.billing_postal_code;

  const create = async () => {
    setTouched(true);
    if (missing) return;
    setSaving(true);
    const created = await Customer.create(c);
    setSaving(false);
    onCreated(created);
  };

  const field = (label, key, required) => (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-32 text-right flex-shrink-0">{label}:</Label>
      <div className="flex-1">
        <Input className="h-7 rounded-sm text-xs" value={c[key]} onChange={(e) => set(key, e.target.value)} />
        <Req show={required && touched && !c[key]} />
      </div>
    </div>
  );

  const dropdown = (label, key, type) => (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-36 text-right flex-shrink-0">{label}:</Label>
      <Select value={c[key] || ""} onValueChange={(v) => set(key, v)}>
        <SelectTrigger className="h-7 rounded-sm text-xs flex-1"><SelectValue placeholder="select" /></SelectTrigger>
        <SelectContent>
          {opts(type).map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto py-8">
      <div className="absolute inset-0 bg-slate-800/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl mx-4 p-6 shadow-2xl rounded-sm">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-red-600"><X className="w-4 h-4" /></button>
        <h2 className="text-sm font-bold uppercase tracking-wider text-lime-600 mb-4">Create New Customer</h2>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Left column */}
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-lime-600">Company</p>
              {field("Company Name", "company_name", true)}
              {field("Company Phone", "company_phone", true)}
              {field("Company Fax", "company_fax")}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-32 text-right flex-shrink-0">Additional Phone:</Label>
                <Input className="h-7 rounded-sm text-xs flex-1" value={c.additional_phone} onChange={(e) => set("additional_phone", e.target.value)} />
                <Select value={c.additional_phone_type || ""} onValueChange={(v) => set("additional_phone_type", v)}>
                  <SelectTrigger className="h-7 rounded-sm text-xs w-24"><SelectValue placeholder="type" /></SelectTrigger>
                  <SelectContent>
                    {opts("phone_type").length > 0
                      ? opts("phone_type").map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)
                      : ["office", "cell", "fax", "home", "other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-lime-600">Primary Contact</p>
              {field("First Name", "contact_first_name", true)}
              {field("Last Name", "contact_last_name", true)}
              {field("Position", "contact_position")}
              {field("Email", "contact_email", true)}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-32 text-right flex-shrink-0">Office Phone:</Label>
                <Input className="h-7 rounded-sm text-xs flex-1" value={c.contact_office_phone} onChange={(e) => set("contact_office_phone", e.target.value)} />
                <Label className="text-xs">Ext.</Label>
                <Input className="h-7 rounded-sm text-xs w-16" value={c.contact_office_ext} onChange={(e) => set("contact_office_ext", e.target.value)} />
              </div>
              {field("Cell Phone", "contact_cell_phone")}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-32 text-right flex-shrink-0">Contact Status:</Label>
                <Select value={c.contact_status || ""} onValueChange={(v) => set("contact_status", v)}>
                  <SelectTrigger className="h-7 rounded-sm text-xs flex-1"><SelectValue placeholder="none" /></SelectTrigger>
                  <SelectContent>{opts("contact_status").map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs w-32 text-right flex-shrink-0">Job Authority:</Label>
                <Select value={c.job_authority || ""} onValueChange={(v) => set("job_authority", v)}>
                  <SelectTrigger className="h-7 rounded-sm text-xs flex-1"><SelectValue placeholder="none" /></SelectTrigger>
                  <SelectContent>{opts("job_authority").map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-lime-600 mb-2">Billing Contact</p>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={c.billing_contact_same} onCheckedChange={(v) => set("billing_contact_same", !!v)} />
                Same as Primary Contact
              </label>
              {!c.billing_contact_same && (
                <div className="space-y-2 mt-2">
                  {field("Billing Name", "billing_contact_name")}
                  {field("Billing Email", "billing_contact_email")}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-lime-600">Billing Address</p>
              {field("Address 1", "billing_address_1", true)}
              {field("Address 2", "billing_address_2")}
              {field("City", "billing_city", true)}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-32 text-right flex-shrink-0">State:</Label>
                <Select value={c.billing_state || ""} onValueChange={(v) => set("billing_state", v)}>
                  <SelectTrigger className="h-7 rounded-sm text-xs flex-1"><SelectValue placeholder="-- Select State --" /></SelectTrigger>
                  <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs w-32 text-right flex-shrink-0">Postal Code:</Label>
                <div className="flex-1">
                  <Input className="h-7 rounded-sm text-xs" value={c.billing_postal_code} onChange={(e) => set("billing_postal_code", e.target.value)} />
                  <Req show={touched && !c.billing_postal_code} />
                </div>
                <span className="text-xs">+</span>
                <Input className="h-7 rounded-sm text-xs w-16" value={c.billing_postal_ext} onChange={(e) => set("billing_postal_ext", e.target.value)} />
              </div>
              {field("Country", "billing_country")}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-lime-600 mb-2">Location Address</p>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={c.location_same_as_billing} onCheckedChange={(v) => set("location_same_as_billing", !!v)} />
                Same as Billing Address
              </label>
              {!c.location_same_as_billing && (
                <div className="space-y-2 mt-2">
                  {field("Address 1", "location_address_1")}
                  {field("Address 2", "location_address_2")}
                  {field("City", "location_city")}
                  {field("State", "location_state")}
                  {field("Postal Code", "location_postal_code")}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-lime-600">Customer Associations</p>
              {dropdown("Salesperson", "salesperson", "salesperson")}
              {dropdown("Location", "location", "sales_center")}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-36 text-right flex-shrink-0">Default Tax Group:</Label>
                <Select value={c.default_tax_group || ""} onValueChange={(v) => set("default_tax_group", v)}>
                  <SelectTrigger className="h-7 rounded-sm text-xs flex-1"><SelectValue placeholder="select" /></SelectTrigger>
                  <SelectContent>
                    {(taxGroups || []).filter((t) => t.is_active !== false).map((t) => (
                      <SelectItem key={t.id} value={t.group_name}>{t.group_name} ({t.tax_percent}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dropdown("Customer Origination", "customer_origination", "customer_origination")}
              {dropdown("Industry Type", "industry_type", "industry_type")}
              {dropdown("Master Account", "master_account", "master_account")}
            </div>
          </div>
        </div>

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