import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/common/SearchableSelect";

const Panel = ({ children }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-sm p-3 space-y-2">{children}</div>
);

const Row = ({ label, children, hint }) => (
  <div className="flex items-center gap-3">
    <Label className="text-xs w-44 text-slate-600 flex-shrink-0">{label}:</Label>
    <div className="flex-1 max-w-sm">{children}</div>
    {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
  </div>
);

// Settings tab — account-level behavior: tax exemption, PO requirement, terms
// and credit, sales associations, and the customer's pricing tier.
export default function SettingsTab({ customer: c, lists, onChange }) {
  const set = (k, v) => onChange(k, v);

  return (
    <div className="space-y-3">
      <Panel>
        <Row label="Tax Exempt">
          <Switch checked={!!c.tax_exempt} onCheckedChange={(v) => set("tax_exempt", v)} />
        </Row>
        {c.tax_exempt && (
          <>
            <Row label="Tax ID Number"><Input className="h-7 rounded-sm text-xs" value={c.tax_id_number || ""} onChange={(e) => set("tax_id_number", e.target.value)} /></Row>
            <Row label="Expiration Date"><Input type="date" className="h-7 rounded-sm text-xs" value={c.tax_exempt_expiration || ""} onChange={(e) => set("tax_exempt_expiration", e.target.value)} /></Row>
            <Row label="Tax Exempt Reason"><Input className="h-7 rounded-sm text-xs" value={c.tax_exempt_reason || ""} onChange={(e) => set("tax_exempt_reason", e.target.value)} /></Row>
          </>
        )}
      </Panel>

      <Panel>
        <Row label="Require Purchase Order">
          <Switch checked={!!c.require_purchase_order} onCheckedChange={(v) => set("require_purchase_order", v)} />
        </Row>
        <Row label="Shipping Account"><Input className="h-7 rounded-sm text-xs" value={c.shipping_account || ""} onChange={(e) => set("shipping_account", e.target.value)} placeholder="no shipping account" /></Row>
      </Panel>

      <Panel>
        <Row label="Terms">
          <SearchableSelect value={c.terms || ""} options={lists.listValues("terms")} onChange={(v) => set("terms", v)} />
        </Row>
        <Row label="Credit Limit"><Input type="number" className="h-7 rounded-sm text-xs" value={c.credit_limit ?? 0} onChange={(e) => set("credit_limit", parseFloat(e.target.value) || 0)} /></Row>
        <Row label="Pricing Tier" hint="Overall markup tier used on this customer's estimates">
          <Select value={String(c.pricing_tier || 1)} onValueChange={(v) => set("pricing_tier", parseInt(v))}>
            <SelectTrigger className="h-7 rounded-sm text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{[1, 2, 3, 4, 5].map((t) => <SelectItem key={t} value={String(t)}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Row>
      </Panel>

      <Panel>
        <Row label="Salesperson">
          <Select value={c.salesperson || ""} onValueChange={(v) => set("salesperson", v)}>
            <SelectTrigger className="h-7 rounded-sm text-xs"><SelectValue placeholder="select" /></SelectTrigger>
            <SelectContent>{lists.salespersonNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </Row>
        <Row label="Sales Center">
          <SearchableSelect value={c.location || ""} options={lists.listValues("sales_center")} onChange={(v) => set("location", v)} />
        </Row>
        <Row label="Default Tax Group">
          <SearchableSelect value={c.default_tax_group || ""} options={lists.taxGroups.map((t) => t.group_name)} onChange={(v) => set("default_tax_group", v)} />
        </Row>
      </Panel>

      <Panel>
        <Row label="Origination">
          <SearchableSelect value={c.customer_origination || ""} options={lists.listValues("customer_origination")} onChange={(v) => set("customer_origination", v)} />
        </Row>
        <Row label="Industry Type">
          <SearchableSelect value={c.industry_type || ""} options={lists.listValues("industry_type")} onChange={(v) => set("industry_type", v)} />
        </Row>
        <Row label="Master Account">
          <SearchableSelect value={c.master_account || ""} options={lists.listValues("master_account")} onChange={(v) => set("master_account", v)} />
        </Row>
      </Panel>

      <Panel>
        <Row label="Send Monthly Statements">
          <Switch checked={c.send_monthly_statements !== false} onCheckedChange={(v) => set("send_monthly_statements", v)} />
        </Row>
      </Panel>
    </div>
  );
}