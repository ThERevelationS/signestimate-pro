import React from "react";
import { Layers, Info } from "lucide-react";
import { ESTIMATOR_MODULES } from "@/components/allInOne/estimatorRegistry";

// Formula documentation for the All-In-One Estimator.
// Renders directly from the estimator registry, so adding a future estimator
// module to estimatorRegistry.js automatically documents it here.
export default function AllInOneFormulas() {
  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="font-semibold text-indigo-900 flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5" /> All-In-One Estimator
        </h3>
        <p className="text-sm text-indigo-800">
          The All-In-One Estimator does not introduce new pricing formulas — it BUILDS a
          multifaceted estimate out of sections. Each section creates a dedicated sub-estimate
          owned by the combined estimate and loads that module's FULL estimator INLINE on the
          same page, so every section uses that module's exact calculations. Any change to a module's formulas
          automatically applies to All-In-One sections, since they ARE that module's estimates.
        </p>
      </div>

      <div className="bg-slate-800 text-white p-4 rounded-lg">
        <h4 className="font-medium mb-2">Grand Total Formula</h4>
        <p className="font-mono text-sm">
          Grand Total = Σ (section sub-estimate totals across all modules)
        </p>
      </div>

      <div className="bg-slate-800 text-white p-4 rounded-lg">
        <h4 className="font-medium mb-2">Customer Pricing Waterfall (aioPricing.js)</h4>
        <p className="text-xs text-slate-300 mb-2">
          Used by the Cost Summary tab, Customer View quote, exports and the saved quote_total —
          applied in this exact order:
        </p>
        <div className="font-mono text-sm space-y-1">
          <p>Adjusted Section = section total × (1 + adjustment% ÷ 100)</p>
          <p>Subtotal = Σ adjusted sections</p>
          <p>Discount = Subtotal × discount%</p>
          <p>Contingency = (Subtotal − Discount) × contingency%</p>
          <p>Fees = shipping fee + permit fee</p>
          <p>Taxable Base = Subtotal − Discount + Contingency + Fees</p>
          <p>tax% = selected Tax Group's rate (Step 1 · Estimate Settings)</p>
          <p>New estimate defaults: the Tax Group / Terms / Sales Center starred as "default" in Estimate Settings are pre-applied, so tax% comes from the default tax group until changed, and the chosen Terms also fill the payment terms printed on the customer quote.</p>
          <p>Tax = Taxable Base × tax%</p>
          <p>Quote Total = Taxable Base + Tax</p>
          <p>Deposit Due = Quote Total × deposit%</p>
          <p>Balance = Quote Total − Deposit Due</p>
          <p>Module Share % = module subtotal ÷ sections total × 100</p>
        </div>
        <p className="text-xs text-slate-300 mt-2">
          Per-section adjustment % is set on each section row (Build tab). On the customer quote,
          sections hidden from display are bundled into one "Additional project scope" line, and
          "Bundle into one price" shows a single line equal to the adjusted Subtotal — totals are
          identical either way.
        </p>
      </div>

      <div className="bg-slate-800 text-white p-4 rounded-lg">
        <h4 className="font-medium mb-2">Quote Settings & Auto-Scope Engine</h4>
        <p className="text-xs text-slate-300 mb-2">
          Quote Settings (Customer View tab) control PRESENTATION only — no toggle changes any
          stored total. Rounding is display-only, and hiding a waterfall line does not remove its
          amount from the Quote Total.
        </p>
        <div className="font-mono text-sm space-y-1">
          <p>Displayed Price = round_prices_to_dollar ? round(price) : price</p>
          <p>Table columns = Scope of Work + (show_category_column) + (show_quantity_column) + Price</p>
          <p>Waterfall rows shown = rows where their show_*_line toggle is on</p>
          <p>Bundled quote (hide_section_prices) = one line equal to adjusted Subtotal</p>
          <p>Hidden section (include_in_customer = false) → bundled into "Additional project scope"</p>
          <p>Tax Group selection → tax_percent = TaxGroup.tax_percent (AI "Find by address" looks up the</p>
          <p>&nbsp;&nbsp;combined state+county rate for the site address and matches the closest tax group)</p>
          <p>Estimate # / Order # = generateDocNumber(prefix) → EST-XXXXX / INV-XXXXX</p>
          <p>&nbsp;&nbsp;Shared atomic counter (DocNumberCounter) — linear, never overlaps between estimates &amp; orders</p>
          <p>Save guard (Step 3): edit_reason is required to save; unsaved changes block browser close &amp; nav</p>
        </div>
        <p className="text-xs text-slate-300 mt-2">
          <b>Auto-scope:</b> a QuoteScopeLine is auto-added to the quote's scope lists when
          <span className="font-mono"> always_include </span> is true, OR when its
          <span className="font-mono"> auto_modules </span> contains a module key that has a section on the
          estimate. Lines are merged without duplicates and never overwrite typed lines; it re-runs
          whenever the set of products changes (while <span className="font-mono">scope_auto_apply</span> is on).
          The library is managed under Estimate Settings → Quote Scope Library, and company-wide
          branding/display defaults live in the QuoteDefaults record ("Save as default" / "Load defaults").
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-slate-900 mb-3">Per-Module Total Sources</h4>
        <p className="text-sm text-slate-600 mb-3">
          How each module's saved project rolls up to a single line-item total:
        </p>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Module</th>
                <th className="text-left p-3 font-medium text-slate-700">Line-Item Total</th>
              </tr>
            </thead>
            <tbody>
              {ESTIMATOR_MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <tr key={mod.key} className="border-t">
                    <td className="p-3">
                      <span className="flex items-center gap-2 font-medium text-slate-900">
                        <Icon className={`w-4 h-4 ${mod.colors.text}`} />
                        {mod.name}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{mod.totalFormula}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          <b>Live sync:</b> section totals refresh from the source sub-estimates every time the
          combined estimate is opened, update in REAL TIME via entity subscriptions while it's
          open, and re-sync when the tab regains focus — refreshed totals are also persisted so
          the saved record never goes stale. Project info (client, estimate #, hyperlink, site
          address) is entered ONCE on the Project Details tab — it auto-fills every new section
          and is re-pushed to all sections on every save. Removing an
          owned section (or deleting the combined
          estimate) also deletes its underlying sub-estimate. New estimator modules added to{" "}
          <span className="font-mono">estimatorRegistry.js</span> appear in this table, in the
          Build tab, and in the combined Cost Summary / Bill of Materials automatically — their
          summary breakdowns and BOM lines come from the registry's breakdownPairs /
          detailArrays definitions.
        </p>
      </div>
    </div>
  );
}