import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, HelpCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import CustomerSearchDialog from "./CustomerSearchDialog";
import CreateCustomerDialog from "./CreateCustomerDialog";
import { buildEstimateDefaults } from "./estimateDefaults";
import useCustomerLists from "@/components/customers/useCustomerLists";
import SearchableSelect from "@/components/common/SearchableSelect";

// ============================================================================
// Step 1: Estimate Details — CoreBridge layout.
// Top block: Customer (search / create), Estimate Description, PO Number, Terms.
// Bottom block: Order Contact / Contact Email / Office Phone + Ext on the left,
// Salesperson / Sales Center / Tax Group on the right — all driven by the
// admin-managed lists on the Estimate Settings page. Selecting a tax group
// sets the estimate's tax_percent used by the pricing waterfall.
// Extra project fields (site address, dates, pricing) live in "More Details".
// ============================================================================
export default function EstimateDetailsStep({ project, updateField }) {
  const { user } = useAuth();
  const lists = useCustomerLists();
  const { options, taxGroups } = lists;
  const [customer, setCustomer] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Apply the admin-flagged defaults (tax group, terms, sales center,
  // salesperson matched to the signed-in user) to still-empty fields.
  useEffect(() => {
    if (lists.loading) return;
    const patch = buildEstimateDefaults({ project, options, taxGroups, salespeople: lists.salespeople, user });
    Object.entries(patch).forEach(([k, v]) => updateField(k, v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists.loading, user?.email]);

  // Load the linked customer so the contact dropdown has something to offer.
  useEffect(() => {
    if (!project.customer_id) { setCustomer(null); return; }
    base44.entities.Customer.get(project.customer_id).then(setCustomer).catch(() => setCustomer(null));
  }, [project.customer_id]);

  const opts = (type) => options.filter((o) => o.option_type === type && o.is_active !== false);

  const applyCustomer = (c) => {
    updateField("customer_id", c.id);
    updateField("client_name", c.company_name);
    const contactName = [c.contact_first_name, c.contact_last_name].filter(Boolean).join(" ");
    if (contactName) { updateField("order_contact", contactName); updateField("contact_name", contactName); }
    if (c.contact_email) updateField("contact_email", c.contact_email);
    if (c.contact_office_phone) updateField("office_phone", c.contact_office_phone);
    if (c.contact_office_ext) updateField("office_phone_ext", c.contact_office_ext);
    if (c.salesperson) updateField("salesperson", c.salesperson);
    if (c.location) updateField("sales_center", c.location);
    if (c.terms) updateField("terms", c.terms);
    if (c.default_tax_group) selectTaxGroup(c.default_tax_group);
    setCustomer(c);
    setShowSearch(false);
    setShowCreate(false);
  };

  // Tax group drives the tax_percent used by the pricing waterfall.
  const selectTaxGroup = (name) => {
    updateField("tax_group", name);
    const tg = taxGroups.find((t) => t.group_name === name);
    if (tg) updateField("tax_percent", Number(tg.tax_percent) || 0);
  };

  const contactChoices = customer
    ? [
        ...(customer.additional_contacts || [])
          .filter((x) => x.is_active !== false)
          .map((x) => `${x.first_name || ""} ${x.last_name || ""}`.trim()),
        [customer.contact_first_name, customer.contact_last_name].filter(Boolean).join(" "),
        customer.billing_contact_name,
      ].filter(Boolean)
    : [project.order_contact].filter(Boolean);

  const row = (label, node, help) => (
    <div className="flex items-start gap-2 py-1">
      <Label className="text-xs w-36 text-right pt-1.5 flex-shrink-0 flex items-center justify-end gap-1">
        {label}: {help && <HelpCircle className="w-3 h-3 text-blue-500" title={help} />}
      </Label>
      <div className="flex-1 min-w-0">{node}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-right text-[11px] italic text-slate-500">
        Entered by: {user?.full_name || user?.email || "—"}
      </p>

      {/* Customer / description block */}
      <div className="bg-slate-100 border border-slate-300 rounded-sm p-4 max-w-4xl">
        {row("Customer",
          <div className="flex items-center gap-2">
            <Input
              className="h-8 rounded-sm bg-white text-sm max-w-md"
              value={project.client_name || ""}
              onChange={(e) => { updateField("client_name", e.target.value); updateField("customer_id", ""); }}
              placeholder="Customer / company name"
            />
            <button type="button" onClick={() => setShowSearch(true)} className="text-lime-600 hover:text-lime-700" title="Search customers">
              <Search className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setShowCreate(true)} className="text-lime-600 hover:text-lime-700" title="Create new customer">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
        {row("Estimate Description",
          <Input
            className="h-8 rounded-sm bg-white text-sm max-w-md"
            value={project.project_name || ""}
            onChange={(e) => updateField("project_name", e.target.value)}
            placeholder="What this estimate is for"
          />,
          "Shown as the estimate name in queues and on the customer quote"
        )}
        {row("PO Number",
          <Input
            className="h-8 rounded-sm bg-white text-sm max-w-md"
            value={project.po_number || ""}
            onChange={(e) => updateField("po_number", e.target.value)}
          />
        )}
        {row("Terms",
          <div className="max-w-xs">
            <SearchableSelect
              value={project.terms || ""}
              options={lists.listValues("terms")}
              onChange={(v) => { updateField("terms", v); if (!project.payment_terms) updateField("payment_terms", v); }}
            />
          </div>
        )}
        {customer && (
          <>
            {row("Industry Type",
              <div className="max-w-xs">
                <SearchableSelect
                  value={customer.industry_type || ""}
                  options={lists.listValues("industry_type")}
                  onChange={async (v) => {
                    await base44.entities.Customer.update(customer.id, { industry_type: v });
                    setCustomer({ ...customer, industry_type: v });
                  }}
                />
              </div>,
              "Type to search. Saved back onto the customer record."
            )}
            {row("Origination",
              <div className="max-w-xs">
                <SearchableSelect
                  value={customer.customer_origination || ""}
                  options={lists.listValues("customer_origination")}
                  onChange={async (v) => {
                    await base44.entities.Customer.update(customer.id, { customer_origination: v });
                    setCustomer({ ...customer, customer_origination: v });
                  }}
                />
              </div>
            )}
          </>
        )}
        {row("Estimate #",
          <div className="flex items-center gap-2">
            <Input
              className="h-8 rounded-sm bg-white text-sm max-w-xs"
              value={project.estimate_number || ""}
              onChange={(e) => updateField("estimate_number", e.target.value)}
            />
            <Button variant="outline" size="sm" className="h-8 rounded-sm text-xs"
              onClick={() => updateField("estimate_number", `AIO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`)}>
              <Sparkles className="w-3 h-3 mr-1" /> Generate
            </Button>
          </div>
        )}
      </div>

      {/* Contact / sales block */}
      <div className="bg-slate-100 border border-slate-300 rounded-sm p-4 max-w-4xl grid md:grid-cols-2 gap-6 md:divide-x md:divide-slate-300">
        <div>
          {row("Order Contact",
            <Select value={project.order_contact || ""} onValueChange={(v) => updateField("order_contact", v)}>
              <SelectTrigger className="h-8 rounded-sm bg-white text-sm"><SelectValue placeholder="select" /></SelectTrigger>
              <SelectContent>
                {contactChoices.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {row("Contact Email",
            <Input className="h-8 rounded-sm bg-white text-sm" value={project.contact_email || ""}
              onChange={(e) => updateField("contact_email", e.target.value)} />
          )}
          {row("Office Phone",
            <div className="flex items-center gap-2">
              <Input className="h-8 rounded-sm bg-white text-sm" value={project.office_phone || ""}
                onChange={(e) => updateField("office_phone", e.target.value)} />
              <Label className="text-xs">Ext.</Label>
              <Input className="h-8 rounded-sm bg-white text-sm w-16" value={project.office_phone_ext || ""}
                onChange={(e) => updateField("office_phone_ext", e.target.value)} />
            </div>
          )}
        </div>
        <div className="md:pl-6">
          {row("Salesperson",
            <Select value={project.salesperson || ""} onValueChange={(v) => {
              updateField("salesperson", v);
              const sp = lists.salespeople.find((u) => (u.screen_name || u.full_name || u.email) === v);
              if (sp?.email) updateField("company_email", sp.email);
            }}>
              <SelectTrigger className="h-8 rounded-sm bg-white text-sm"><SelectValue placeholder="select" /></SelectTrigger>
              <SelectContent>
                {lists.salespersonNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {row("Sales Center",
            <Select value={project.sales_center || ""} onValueChange={(v) => updateField("sales_center", v)}>
              <SelectTrigger className="h-8 rounded-sm bg-white text-sm"><SelectValue placeholder="select" /></SelectTrigger>
              <SelectContent>
                {opts("sales_center").map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {row("Tax Group",
            <Select value={project.tax_group || ""} onValueChange={selectTaxGroup}>
              <SelectTrigger className="h-8 rounded-sm bg-white text-sm"><SelectValue placeholder="select" /></SelectTrigger>
              <SelectContent>
                {taxGroups.filter((t) => t.is_active !== false).map((t) => (
                  <SelectItem key={t.id} value={t.group_name}>{t.group_name} ({t.tax_percent}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-[11px] text-slate-500 pl-2 pt-1">
            Tax applied to this estimate: {project.tax_percent || 0}%
            {project.terms ? ` · Terms "${project.terms}" print on the customer quote` : ""}
          </p>
        </div>
      </div>

      {/* Everything else, tucked away */}
      <div className="max-w-4xl">
        <button onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900">
          {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          More Details &amp; Pricing
        </button>
        {showMore && (
          <div className="bg-white border border-slate-300 rounded-sm p-4 mt-2 grid md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <Label className="text-xs">Site Address</Label>
              <Input className="h-8 rounded-sm" value={project.site_address || ""} onChange={(e) => updateField("site_address", e.target.value)} />
            </div>
            <div><Label className="text-xs">Target Install Date</Label><Input type="date" className="h-8 rounded-sm" value={project.target_install_date || ""} onChange={(e) => updateField("target_install_date", e.target.value)} /></div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={project.priority || "normal"} onValueChange={(v) => updateField("priority", v)}>
                <SelectTrigger className="h-8 rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="rush">Rush</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={project.status || "draft"} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger className="h-8 rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="calculated">Calculated</SelectItem>
                  <SelectItem value="sent">Sent to Customer</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Discount %</Label><Input type="number" step="0.5" className="h-8 rounded-sm" value={project.discount_percent ?? 0} onChange={(e) => updateField("discount_percent", parseFloat(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Contingency %</Label><Input type="number" step="0.5" className="h-8 rounded-sm" value={project.contingency_percent ?? 0} onChange={(e) => updateField("contingency_percent", parseFloat(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Shipping Fee $</Label><Input type="number" className="h-8 rounded-sm" value={project.shipping_fee ?? 0} onChange={(e) => updateField("shipping_fee", parseFloat(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Permit Fee $</Label><Input type="number" className="h-8 rounded-sm" value={project.permit_fee ?? 0} onChange={(e) => updateField("permit_fee", parseFloat(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Sales Tax %</Label><Input type="number" step="0.1" className="h-8 rounded-sm" value={project.tax_percent ?? 0} onChange={(e) => updateField("tax_percent", parseFloat(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Deposit %</Label><Input type="number" className="h-8 rounded-sm" value={project.deposit_percent ?? 50} onChange={(e) => updateField("deposit_percent", parseFloat(e.target.value) || 0)} /></div>
            <div className="md:col-span-2"><Label className="text-xs">Tags</Label><Input className="h-8 rounded-sm" value={project.tags || ""} onChange={(e) => updateField("tags", e.target.value)} placeholder="comma, separated" /></div>
            <div className="md:col-span-1"><Label className="text-xs">Hyperlink</Label><Input className="h-8 rounded-sm" value={project.hyperlink || ""} onChange={(e) => updateField("hyperlink", e.target.value)} /></div>
            <div className="md:col-span-3"><Label className="text-xs">Notes</Label><Textarea className="h-20" value={project.notes || ""} onChange={(e) => updateField("notes", e.target.value)} /></div>
          </div>
        )}
      </div>

      {showSearch && !lists.loading && (
        <CustomerSearchDialog lists={lists} onClose={() => setShowSearch(false)} onPick={applyCustomer} />
      )}
      {showCreate && !lists.loading && (
        <CreateCustomerDialog lists={lists} onClose={() => setShowCreate(false)} onCreated={applyCustomer} />
      )}
    </div>
  );
}