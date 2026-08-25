import React from "react";
import { FileSignature, MessageSquare } from "lucide-react";
import { SettingsGroup, AreaField, ToggleRow } from "./quoteSettingsUi";

// Free-text blocks printed on the quote.
export default function QuoteTextGroup({ project, updateField, depositPct }) {
  const f = (k) => (v) => updateField(k, v);
  const on = (k) => project[k] !== false;

  return (
    <>
      <SettingsGroup title="Terms & Payment" icon={FileSignature}>
        <AreaField
          label="Payment Terms"
          value={project.payment_terms}
          onChange={f("payment_terms")}
          rows={3}
          placeholder={`e.g. ${depositPct || 50}% deposit to begin, balance net 30 on completion.`}
        />
        <ToggleRow label="Show terms & conditions block" checked={on("show_terms_block")} onChange={f("show_terms_block")} />
        <AreaField label="Terms & Conditions" value={project.quote_terms_conditions} onChange={f("quote_terms_conditions")} rows={4} placeholder="Full T&C text printed at the end of the quote." />
      </SettingsGroup>

      <SettingsGroup title="Warranty, Lead Time & Copy" icon={MessageSquare}>
        <ToggleRow label="Show warranty block" checked={on("show_warranty_block")} onChange={f("show_warranty_block")} />
        <AreaField label="Warranty Statement" value={project.warranty_text} onChange={f("warranty_text")} rows={2} placeholder="One year warranty on workmanship, manufacturer warranty on components." />
        <ToggleRow label="Show lead time block" checked={on("show_lead_time_block")} onChange={f("show_lead_time_block")} />
        <AreaField label="Lead Time" value={project.lead_time_text} onChange={f("lead_time_text")} rows={2} placeholder="4–6 weeks from approved drawings and permit issuance." />
        <AreaField label="Intro Paragraph" value={project.quote_intro_text} onChange={f("quote_intro_text")} rows={3} placeholder="Printed above the pricing table." />
        <AreaField label="Footer Paragraph" value={project.quote_footer_text} onChange={f("quote_footer_text")} rows={2} placeholder="Printed at the very bottom of the quote." />
        <ToggleRow label="Show internal notes on quote" checked={on("show_notes_on_quote")} onChange={f("show_notes_on_quote")} />
      </SettingsGroup>
    </>
  );
}