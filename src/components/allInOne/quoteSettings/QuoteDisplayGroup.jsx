import React from "react";
import { LayoutTemplate, Table2, DollarSign } from "lucide-react";
import { SettingsGroup, ToggleRow } from "./quoteSettingsUi";

// Everything that controls WHAT appears on the printed quote.
export default function QuoteDisplayGroup({ project, updateField }) {
  const f = (k) => (v) => updateField(k, v);
  const on = (k) => project[k] !== false; // default-on toggles

  return (
    <>
      <SettingsGroup title="Header & Blocks" icon={LayoutTemplate}>
        <ToggleRow label="Company block" checked={on("show_company_block")} onChange={f("show_company_block")} />
        <ToggleRow label="Customer / contact block" checked={on("show_contact_block")} onChange={f("show_contact_block")} />
        <ToggleRow label="Estimate number" checked={on("show_estimate_number")} onChange={f("show_estimate_number")} />
        <ToggleRow label="PO number" checked={on("show_po_number")} onChange={f("show_po_number")} />
        <ToggleRow label="Site address" checked={on("show_site_address")} onChange={f("show_site_address")} />
        <ToggleRow label="Dates & validity line" checked={on("show_dates")} onChange={f("show_dates")} />
        <ToggleRow label="Signature block" checked={on("show_signature_block")} onChange={f("show_signature_block")} />
        <ToggleRow label="Validity footer note" checked={on("show_validity_footer")} onChange={f("show_validity_footer")} />
      </SettingsGroup>

      <SettingsGroup title="Line Item Table" icon={Table2}>
        <ToggleRow label="Category column" checked={on("show_category_column")} onChange={f("show_category_column")} />
        <ToggleRow label="Quantity column" hint="Uses each section's display quantity" checked={!!project.show_quantity_column} onChange={f("show_quantity_column")} />
        <ToggleRow label="Section descriptions" checked={on("show_section_descriptions")} onChange={f("show_section_descriptions")} />
        <ToggleRow
          label="Bundle into one price"
          hint="Hide per-section pricing entirely"
          checked={!!project.hide_section_prices}
          onChange={f("hide_section_prices")}
        />
      </SettingsGroup>

      <SettingsGroup title="Pricing Display" icon={DollarSign}>
        <ToggleRow label="Subtotal line" checked={on("show_subtotal_line")} onChange={f("show_subtotal_line")} />
        <ToggleRow label="Discount line" checked={on("show_discount_line")} onChange={f("show_discount_line")} />
        <ToggleRow label="Fees line (shipping / permit)" checked={on("show_fees_line")} onChange={f("show_fees_line")} />
        <ToggleRow label="Tax line" checked={on("show_tax_line")} onChange={f("show_tax_line")} />
        <ToggleRow label="Deposit & balance lines" checked={on("show_deposit_lines")} onChange={f("show_deposit_lines")} />
        <ToggleRow
          label="Round prices to whole dollars"
          hint="Display only — stored totals keep cents"
          checked={!!project.round_prices_to_dollar}
          onChange={f("round_prices_to_dollar")}
        />
      </SettingsGroup>
    </>
  );
}