import React from "react";

const Panel = ({ title, action, children }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-sm">
    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {action}
    </div>
    <div className="p-3 text-sm text-slate-700">{children}</div>
  </div>
);

const line = (label, value) => (
  <p className="py-0.5"><span className="text-slate-500">{label}: </span><span className="font-medium">{value || "—"}</span></p>
);

const addressBlock = (c, prefix) => {
  const a1 = c[`${prefix}_address_1`];
  if (!a1) return <p className="text-slate-400">Not set</p>;
  return (
    <div className="leading-5">
      <p>{a1}</p>
      {c[`${prefix}_address_2`] && <p>{c[`${prefix}_address_2`]}</p>}
      <p>{[c[`${prefix}_city`], c[`${prefix}_state`]].filter(Boolean).join(" , ")} {c[`${prefix}_postal_code`]}</p>
      {prefix === "billing" && <p>{c.billing_country}</p>}
    </div>
  );
};

// Information tab — phone/web info, addresses, and the location's tax + sales
// center associations that flow onto every estimate for this customer.
export default function InformationTab({ customer: c, onEdit }) {
  const editLink = (
    <button onClick={onEdit} className="text-xs font-semibold text-lime-600 hover:underline">Update</button>
  );

  return (
    <div className="space-y-3">
      <Panel title="Customer Phone & Website Info" action={editLink}>
        {line("Company Phone", c.company_phone)}
        {line("Company Fax", c.company_fax)}
        {line("Website", c.website)}
      </Panel>

      <Panel title="Addresses" action={editLink}>
        <div className="grid md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div>
            <p className="font-semibold text-slate-800 mb-1">Billing Address</p>
            {addressBlock(c, "billing")}
          </div>
          <div className="md:pl-4 pt-3 md:pt-0">
            <p className="font-semibold text-slate-800 mb-1">Customer Location</p>
            {c.location_same_as_billing === false ? addressBlock(c, "location") : (
              <>
                <p className="text-xs text-slate-500 mb-1">Same as billing</p>
                {addressBlock(c, "billing")}
              </>
            )}
          </div>
          <div className="md:pl-4 pt-3 md:pt-0">
            <p className="font-semibold text-slate-800 mb-1">Location Settings</p>
            {line("Tax Group", c.default_tax_group)}
            {line("Sales Center", c.location)}
            {line("Salesperson", c.salesperson)}
          </div>
        </div>
      </Panel>

      <Panel title="Primary & Billing Contact" action={editLink}>
        {line("Primary", [`${c.contact_first_name || ""} ${c.contact_last_name || ""}`.trim(), c.contact_office_phone, c.contact_email].filter(Boolean).join(" · "))}
        {line("Billing", c.billing_contact_same === false
          ? [c.billing_contact_name, c.billing_contact_phone, c.billing_contact_email].filter(Boolean).join(" · ")
          : "Same as primary contact")}
      </Panel>
    </div>
  );
}