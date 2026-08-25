import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, Download, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import QuoteBrandingGroup from "./QuoteBrandingGroup";
import QuoteDisplayGroup from "./QuoteDisplayGroup";
import QuoteScopeGroup from "./QuoteScopeGroup";
import QuoteTextGroup from "./QuoteTextGroup";
import { applyAutoScopes } from "./autoScopes";

// Fields copied between an estimate and the company-wide QuoteDefaults record.
const DEFAULTABLE = [
  "company_name", "company_phone", "company_email", "company_address", "company_website",
  "company_license", "company_logo_url", "quote_title", "quote_accent_color", "quote_valid_days",
  "payment_terms", "quote_intro_text", "quote_footer_text", "quote_terms_conditions",
  "warranty_text", "lead_time_text", "scope_auto_apply", "hide_section_prices",
  "show_company_block", "show_logo", "show_contact_block", "show_estimate_number", "show_po_number",
  "show_site_address", "show_dates", "show_category_column", "show_section_descriptions",
  "show_quantity_column", "show_scope_lists", "show_subtotal_line", "show_discount_line",
  "show_fees_line", "show_tax_line", "show_deposit_lines", "show_notes_on_quote",
  "show_terms_block", "show_warranty_block", "show_lead_time_block", "show_signature_block",
  "show_validity_footer", "round_prices_to_dollar",
];

// The full Quote Settings control panel. Loads the scope library + company
// defaults, runs the auto-scope engine when enabled, and lets an admin push
// the current settings back as the company default.
export default function QuoteSettingsPanel({ project, updateField, depositPct }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [library, setLibrary] = useState([]);
  const [defaults, setDefaults] = useState(null);

  useEffect(() => {
    base44.entities.QuoteScopeLine.list("sort_order", 500).then((r) => setLibrary(r || [])).catch(() => setLibrary([]));
    base44.entities.QuoteDefaults.list("-created_date", 1).then((r) => setDefaults((r || [])[0] || null)).catch(() => setDefaults(null));
  }, []);

  // Auto-scope: re-run whenever the set of products on the estimate changes.
  const moduleSignature = (project.line_items || []).map((li) => li.module_key).sort().join("|");
  useEffect(() => {
    if (project.scope_auto_apply === false || library.length === 0) return;
    const { patch } = applyAutoScopes(project, library);
    Object.entries(patch).forEach(([k, v]) => updateField(k, v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleSignature, library]);

  const loadDefaults = () => {
    if (!defaults) return toast({ title: "No company defaults saved yet" });
    DEFAULTABLE.forEach((k) => {
      if (defaults[k] !== undefined && defaults[k] !== null && defaults[k] !== "") updateField(k, defaults[k]);
    });
    toast({ title: "Company defaults loaded onto this quote" });
  };

  const saveDefaults = async () => {
    const payload = { config_name: "default" };
    DEFAULTABLE.forEach((k) => { if (project[k] !== undefined) payload[k] = project[k]; });
    const saved = defaults
      ? await base44.entities.QuoteDefaults.update(defaults.id, payload)
      : await base44.entities.QuoteDefaults.create(payload);
    setDefaults(saved);
    toast({ title: "Saved as company defaults", description: "New quotes can load these settings." });
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-indigo-600" /> Quote Settings
        </CardTitle>
        <div className="flex gap-1.5 pt-1">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={loadDefaults}>
            <Download className="w-3 h-3 mr-1" /> Load defaults
          </Button>
          {user?.role === "admin" && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={saveDefaults}>
              <Upload className="w-3 h-3 mr-1" /> Save as default
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-3 space-y-2">
        <QuoteBrandingGroup project={project} updateField={updateField} />
        <QuoteScopeGroup project={project} updateField={updateField} library={library} />
        <QuoteDisplayGroup project={project} updateField={updateField} />
        <QuoteTextGroup project={project} updateField={updateField} depositPct={depositPct} />
      </CardContent>
    </Card>
  );
}