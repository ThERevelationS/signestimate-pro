import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/common/SearchableSelect";

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const PHONE_TYPES = ["office", "cell", "fax", "home", "other"];

const Group = ({ title, children }) => (
  <div className="space-y-1.5">
    <p className="text-xs font-bold uppercase tracking-wider text-lime-600">{title}</p>
    {children}
  </div>
);

const Row = ({ label, children }) => (
  <div className="flex items-center gap-2">
    <Label className="text-xs w-32 text-right flex-shrink-0 text-slate-600">{label}:</Label>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
);

// Shared customer form — used both by the Create New Customer dialog and by
// the Edit Customer screen so the two always look and behave the same.
export default function CustomerForm({ value: c, onChange, lists, showRequired }) {
  const set = (k, v) => onChange(k, v);
  const req = (k) => showRequired && !c[k];

  const text = (label, key, required) => (
    <Row label={label}>
      <Input
        className={`h-7 rounded-sm text-xs ${req(key) && required ? "border-red-400" : ""}`}
        placeholder={required && !c[key] ? "required" : ""}
        value={c[key] || ""}
        onChange={(e) => set(key, e.target.value)}
      />
    </Row>
  );

  const dropdown = (label, key, values) => (
    <Row label={label}>
      <Select value={c[key] || ""} onValueChange={(v) => set(key, v)}>
        <SelectTrigger className="h-7 rounded-sm text-xs"><SelectValue placeholder="none" /></SelectTrigger>
        <SelectContent>{values.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
      </Select>
    </Row>
  );

  const searchable = (label, key, values) => (
    <Row label={label}>
      <SearchableSelect value={c[key] || ""} options={values} onChange={(v) => set(key, v)} />
    </Row>
  );

  const phonePair = (label, key, typeKey) => (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <Input className="h-7 rounded-sm text-xs flex-1" value={c[key] || ""} onChange={(e) => set(key, e.target.value)} />
        <Select value={c[typeKey] || ""} onValueChange={(v) => set(typeKey, v)}>
          <SelectTrigger className="h-7 rounded-sm text-xs w-24"><SelectValue placeholder="type" /></SelectTrigger>
          <SelectContent>
            {(lists.listValues("phone_type").length ? lists.listValues("phone_type") : PHONE_TYPES).map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Row>
  );

  return (
    <div className="grid md:grid-cols-2 gap-x-8 gap-y-5 md:divide-x md:divide-dashed md:divide-slate-300">
      {/* ---------------- Left: company + contacts ---------------- */}
      <div className="space-y-5">
        <Group title="Company">
          {text("Company Name", "company_name", true)}
          {text("Company Phone", "company_phone", true)}
          {text("Company Fax", "company_fax")}
          {text("Website", "website")}
          {phonePair("Additional Phone", "additional_phone", "additional_phone_type")}
        </Group>

        <Group title="Primary Contact">
          {text("First Name", "contact_first_name", true)}
          {text("Last Name", "contact_last_name", true)}
          {text("Position", "contact_position")}
          {text("Email", "contact_email", true)}
          <Row label="Office Phone">
            <div className="flex items-center gap-2">
              <Input className="h-7 rounded-sm text-xs flex-1" value={c.contact_office_phone || ""} onChange={(e) => set("contact_office_phone", e.target.value)} />
              <Label className="text-xs">Ext.</Label>
              <Input className="h-7 rounded-sm text-xs w-16" value={c.contact_office_ext || ""} onChange={(e) => set("contact_office_ext", e.target.value)} />
            </div>
          </Row>
          {text("Cell Phone", "contact_cell_phone")}
          {phonePair("Additional Phone", "contact_additional_phone", "contact_additional_phone_type")}
          {searchable("Contact Status", "contact_status", lists.listValues("contact_status"))}
          {searchable("Job Authority", "job_authority", lists.listValues("job_authority"))}
        </Group>

        <Group title="Billing Contact">
          <label className="flex items-center gap-2 text-xs cursor-pointer pl-2">
            <Checkbox checked={c.billing_contact_same !== false} onCheckedChange={(v) => set("billing_contact_same", !!v)} />
            Same as Primary Contact
          </label>
          {c.billing_contact_same === false && (
            <div className="space-y-1.5 pt-1">
              {text("Billing Name", "billing_contact_name")}
              {text("Billing Email", "billing_contact_email")}
              {text("Billing Phone", "billing_contact_phone")}
            </div>
          )}
        </Group>
      </div>

      {/* ---------------- Right: addresses + associations ---------------- */}
      <div className="space-y-5 md:pl-8">
        <Group title="Billing Address">
          {text("Address 1", "billing_address_1", true)}
          {text("Address 2", "billing_address_2")}
          {text("City", "billing_city", true)}
          <Row label="State">
            <Select value={c.billing_state || ""} onValueChange={(v) => set("billing_state", v)}>
              <SelectTrigger className="h-7 rounded-sm text-xs"><SelectValue placeholder="-- Select State --" /></SelectTrigger>
              <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Row>
          <Row label="Postal Code">
            <div className="flex items-center gap-2">
              <Input className={`h-7 rounded-sm text-xs flex-1 ${req("billing_postal_code") ? "border-red-400" : ""}`}
                placeholder={!c.billing_postal_code ? "required" : ""}
                value={c.billing_postal_code || ""} onChange={(e) => set("billing_postal_code", e.target.value)} />
              <span className="text-xs">+</span>
              <Input className="h-7 rounded-sm text-xs w-16" value={c.billing_postal_ext || ""} onChange={(e) => set("billing_postal_ext", e.target.value)} />
            </div>
          </Row>
          {text("Country", "billing_country")}
        </Group>

        <Group title="Location Address">
          <label className="flex items-center gap-2 text-xs cursor-pointer pl-2">
            <Checkbox checked={c.location_same_as_billing !== false} onCheckedChange={(v) => set("location_same_as_billing", !!v)} />
            Same as Billing Address
          </label>
          {c.location_same_as_billing === false && (
            <div className="space-y-1.5 pt-1">
              {text("Address 1", "location_address_1")}
              {text("Address 2", "location_address_2")}
              {text("City", "location_city")}
              <Row label="State">
                <Select value={c.location_state || ""} onValueChange={(v) => set("location_state", v)}>
                  <SelectTrigger className="h-7 rounded-sm text-xs"><SelectValue placeholder="-- Select State --" /></SelectTrigger>
                  <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Row>
              {text("Postal Code", "location_postal_code")}
            </div>
          )}
        </Group>

        <Group title="Customer Associations">
          {dropdown("Salesperson", "salesperson", lists.salespersonNames)}
          {dropdown("Location", "location", lists.listValues("sales_center"))}
          <Row label="Default Tax Group">
            <Select value={c.default_tax_group || ""} onValueChange={(v) => set("default_tax_group", v)}>
              <SelectTrigger className="h-7 rounded-sm text-xs"><SelectValue placeholder="select" /></SelectTrigger>
              <SelectContent>
                {lists.taxGroups.filter((t) => t.is_active !== false).map((t) => (
                  <SelectItem key={t.id} value={t.group_name}>{t.group_name} ({t.tax_percent}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          {searchable("Customer Origination", "customer_origination", lists.listValues("customer_origination"))}
          {searchable("Industry Type", "industry_type", lists.listValues("industry_type"))}
          {searchable("Master Account", "master_account", lists.listValues("master_account"))}
          {searchable("Terms", "terms", lists.listValues("terms"))}
        </Group>
      </div>
    </div>
  );
}