import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, ClipboardCopy, FileText, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fmtCurrency } from "@/lib/formatters";
import { ESTIMATOR_MODULES_BY_KEY } from "./estimatorRegistry";
import { computeQuote, adjustedSectionTotal, quoteWaterfallRows } from "./aioPricing";
import QuoteSettingsPanel from "./quoteSettings/QuoteSettingsPanel";
import { on, accent, quoteMoney, visibleWaterfall } from "./quoteSettings/quoteDisplay";

const bullets = (text) => (text || "").split("\n").map((l) => l.trim()).filter(Boolean);

const TextBlock = ({ title, body }) => !body ? null : (
  <div className="mt-5 text-sm text-slate-600">
    <p className="font-semibold text-slate-900 mb-1">{title}</p>
    <p className="whitespace-pre-wrap">{body}</p>
  </div>
);

// SINGLE POINT customer-facing quote — editable (company branding, scope
// lists, terms, per-section descriptions, price bundling) with a live preview
// and a clean print/PDF output. All math comes from the aioPricing waterfall.
export default function AllInOneCustomerViewTab({ project, grandTotal, updateField, onUpdateItem }) {
  const { toast } = useToast();
  const allItems = project.line_items || [];
  const lineItems = allItems.filter((li) => !li.missing);
  const quote = computeQuote(project);
  // Adjustments are baked into the per-line adjusted prices, so the
  // "adjustments" waterfall row is skipped on the quote. Remaining rows are
  // filtered by the Quote Settings display toggles.
  const waterfall = visibleWaterfall(quoteWaterfallRows(quote).filter((r) => r.kind !== "adjust"), project);
  const money = quoteMoney(project);
  const A = accent(project);
  const showQty = !!project.show_quantity_column;
  const showCat = on(project, "show_category_column");

  const today = new Date().toLocaleDateString();
  const validDays = Number(project.quote_valid_days) || 30;
  const validUntil = new Date(Date.now() + validDays * 86400000).toLocaleDateString();

  // Quote display lines: bundled single price, or per-section with excluded
  // sections rolled into one "Additional project scope" line.
  const displayLines = (() => {
    if (project.hide_section_prices) {
      return [{ name: "Complete project as specified", category: "Turn-key signage package", desc: "", price: quote.subtotal }];
    }
    const included = lineItems.filter((li) => li.include_in_customer !== false);
    const excluded = lineItems.filter((li) => li.include_in_customer === false);
    const lines = included.map((li) => ({
      name: li.project_name || "",
      category: ESTIMATOR_MODULES_BY_KEY[li.module_key]?.name || li.module_key,
      desc: on(project, "show_section_descriptions") ? (li.customer_description || "") : "",
      qty: li.customer_quantity ?? 1,
      price: adjustedSectionTotal(li),
    }));
    const excludedSum = excluded.reduce((s, li) => s + adjustedSectionTotal(li), 0);
    if (excludedSum > 0) {
      lines.push({ name: "Additional project scope", category: "General conditions", desc: "", price: excludedSum });
    }
    return lines;
  })();

  const scopeOn = on(project, "show_scope_lists");
  const inclusions = scopeOn ? bullets(project.scope_inclusions) : [];
  const exclusions = scopeOn ? bullets(project.scope_exclusions) : [];

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = displayLines.map((l) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${l.name}${l.desc ? `<br/><span style="color:#64748b;font-size:12px;">${l.desc}</span>` : ""}</td>
      ${showCat ? `<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">${l.category}</td>` : ""}
      ${showQty ? `<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#475569;">${l.qty ?? 1}</td>` : ""}
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;vertical-align:top;">${money(l.price)}</td>
    </tr>`).join("");
    const waterfallHtml = waterfall.map((r) => `<div style="display:flex;justify-content:space-between;padding:4px 0;${r.kind === "total" ? "border-top:2px solid #0f172a;font-weight:bold;font-size:16px;padding-top:8px;" : r.kind === "subtotal" ? "font-weight:600;" : "color:#475569;"}${r.kind === "deposit" || r.kind === "balance" ? `color:${A};font-weight:600;` : ""}"><span>${r.label}</span><span>${money(r.amount)}</span></div>`).join("");
    const listHtml = (title, items) => items.length === 0 ? "" : `<div style="flex:1;min-width:220px;"><b style="font-size:13px;">${title}</b><ul style="margin:6px 0 0;padding-left:18px;font-size:13px;color:#475569;">${items.map((i) => `<li style="margin:2px 0;">${i}</li>`).join("")}</ul></div>`;
    const textBlock = (title, body) => !body ? "" : `<div style="margin-top:16px;font-size:13px;color:#475569;"><b>${title}</b><p style="white-space:pre-wrap;margin:4px 0 0;">${body}</p></div>`;
    const metaLine = [
      on(project, "show_estimate_number") && project.estimate_number ? `Estimate #${project.estimate_number}` : "",
      on(project, "show_po_number") && project.po_number ? `PO #${project.po_number}` : "",
      on(project, "show_dates") ? `Date: ${today}` : "",
      on(project, "show_dates") ? `Valid until: ${validUntil}` : "",
    ].filter(Boolean).join(" · ");
    w.document.write(`<!DOCTYPE html><html><head><title>Estimate — ${project.project_name || ""}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:760px;margin:32px auto;padding:0 24px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${A};padding-bottom:16px;">
    <div>
      ${project.show_logo && project.company_logo_url ? `<img src="${project.company_logo_url}" style="max-height:56px;margin-bottom:8px;" />` : ""}
      ${on(project, "show_company_block") && project.company_name ? `<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:${A};">${project.company_name}</p>` : ""}
      <h1 style="margin:0;font-size:22px;">${project.quote_title || "Project Estimate"}</h1>
      ${metaLine ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${metaLine}</p>` : ""}
      ${on(project, "show_company_block") ? `<p style="margin:2px 0 0;color:#64748b;font-size:12px;">${[project.company_phone, project.company_email, project.company_address, project.company_website, project.company_license ? `Lic. ${project.company_license}` : ""].filter(Boolean).join(" · ")}</p>` : ""}
    </div>
    ${on(project, "show_contact_block") ? `<div style="text-align:right;font-size:13px;color:#475569;">
      <b style="font-size:15px;color:#0f172a;">${project.project_name || ""}</b><br/>
      ${project.client_name || ""}<br/>
      ${on(project, "show_site_address") ? `${project.site_address || ""}<br/>` : ""}
      ${[project.contact_name, project.contact_phone, project.contact_email].filter(Boolean).join(" · ")}
    </div>` : ""}
  </div>
  ${project.quote_intro_text ? `<p style="margin:16px 0 0;font-size:13px;color:#475569;white-space:pre-wrap;">${project.quote_intro_text}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px;">
    <thead><tr style="text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;">
      <th style="padding:8px 12px;border-bottom:2px solid #cbd5e1;">Scope of Work</th>
      ${showCat ? `<th style="padding:8px 12px;border-bottom:2px solid #cbd5e1;">Category</th>` : ""}
      ${showQty ? `<th style="padding:8px 12px;border-bottom:2px solid #cbd5e1;text-align:center;">Qty</th>` : ""}
      <th style="padding:8px 12px;border-bottom:2px solid #cbd5e1;text-align:right;">Price</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div style="margin-top:16px;margin-left:auto;width:300px;font-size:14px;">${waterfallHtml}</div>
  <div style="display:flex;gap:32px;margin-top:24px;flex-wrap:wrap;">
    ${listHtml("Included in this estimate", inclusions)}
    ${listHtml("Not included", exclusions)}
  </div>
  ${textBlock("Payment terms", project.payment_terms)}
  ${on(project, "show_lead_time_block") ? textBlock("Lead time", project.lead_time_text) : ""}
  ${on(project, "show_warranty_block") ? textBlock("Warranty", project.warranty_text) : ""}
  ${on(project, "show_terms_block") ? textBlock("Terms &amp; conditions", project.quote_terms_conditions) : ""}
  ${on(project, "show_notes_on_quote") ? textBlock("Notes", project.notes) : ""}
  ${on(project, "show_signature_block") ? `<div style="display:flex;gap:48px;margin-top:48px;">
    <div style="flex:1;"><div style="border-top:1px solid #0f172a;padding-top:6px;font-size:12px;color:#475569;">Customer signature / date</div></div>
    <div style="flex:1;"><div style="border-top:1px solid #0f172a;padding-top:6px;font-size:12px;color:#475569;">${project.company_name || "Company"} signature / date</div></div>
  </div>` : ""}
  ${on(project, "show_validity_footer") ? `<p style="margin-top:28px;font-size:11px;color:#94a3b8;">This estimate is valid for ${validDays} days from the date above. Pricing subject to final site verification.</p>` : ""}
  ${project.quote_footer_text ? `<p style="margin-top:12px;font-size:11px;color:#94a3b8;white-space:pre-wrap;">${project.quote_footer_text}</p>` : ""}
  <script>window.onload = () => window.print();</script>
</body></html>`);
    w.document.close();
  };

  const handleCopy = async () => {
    const lines = [
      `Estimate: ${project.project_name}${project.estimate_number ? ` (#${project.estimate_number})` : ""}`,
      `Client: ${project.client_name}`,
      ...(project.site_address ? [`Site: ${project.site_address}`] : []),
      "",
      ...displayLines.map((l) => `• ${l.name}: ${fmtCurrency(l.price)}`),
      "",
      ...waterfall.map((r) => `${r.label}: ${fmtCurrency(r.amount)}`),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copied", description: "Customer quote summary copied to clipboard." });
  };

  if (lineItems.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="py-16 text-center text-slate-500">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No sections yet — the customer-facing quote appears once you build sections.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* ---- Quote editor ---- */}
      <div className="space-y-4">
        <QuoteSettingsPanel project={project} updateField={updateField} depositPct={quote.depositPct} />

        {!project.hide_section_prices && (
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base">Section Display</CardTitle>
              <p className="text-xs text-slate-500">Customer descriptions + show/hide per section. Hidden sections are bundled into one "Additional project scope" line.</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {allItems.map((li, idx) => {
                if (li.missing) return null;
                const visible = li.include_in_customer !== false;
                return (
                  <div key={`${li.project_id}-${idx}`} className="border border-slate-200 rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <button
                        onClick={() => onUpdateItem(idx, { include_in_customer: !visible })}
                        title={visible ? "Hide from quote (bundled)" : "Show on quote"}
                        className={visible ? "text-indigo-600" : "text-slate-300"}
                      >
                        {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <span className={`text-xs font-medium truncate flex-1 ${visible ? "text-slate-800" : "text-slate-400 line-through"}`}>{li.project_name}</span>
                      <span className="text-xs tabular-nums text-slate-500">{fmtCurrency(adjustedSectionTotal(li))}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        className="h-7 text-xs flex-1"
                        value={li.customer_description || ""}
                        onChange={(e) => onUpdateItem(idx, { customer_description: e.target.value })}
                        placeholder="Customer-facing description (optional)"
                      />
                      {showQty && (
                        <Input
                          className="h-7 text-xs w-16"
                          type="number"
                          min="1"
                          value={li.customer_quantity ?? 1}
                          onChange={(e) => onUpdateItem(idx, { customer_quantity: parseFloat(e.target.value) || 1 })}
                          title="Display quantity"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ---- Live preview ---- */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCopy}><ClipboardCopy className="w-4 h-4 mr-1.5" /> Copy Summary</Button>
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Printer className="w-4 h-4 mr-1.5" /> Print / PDF</Button>
        </div>

        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-8">
            <div className="flex flex-wrap justify-between items-start gap-4 pb-5 border-b-4" style={{ borderBottomColor: A }}>
              <div>
                {project.show_logo && project.company_logo_url && (
                  <img src={project.company_logo_url} alt="" className="max-h-14 mb-2 object-contain" />
                )}
                {on(project, "show_company_block") && project.company_name && (
                  <p className="font-bold text-lg leading-tight" style={{ color: A }}>{project.company_name}</p>
                )}
                <h2 className="text-2xl font-bold text-slate-900">{project.quote_title || "Project Estimate"}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {on(project, "show_estimate_number") && project.estimate_number && <>Estimate #{project.estimate_number} · </>}
                  {on(project, "show_po_number") && project.po_number && <>PO #{project.po_number} · </>}
                  {on(project, "show_dates") && <>Date: {today} · Valid until: {validUntil}</>}
                </p>
                {on(project, "show_company_block") && (
                  <p className="text-xs text-slate-400">
                    {[project.company_phone, project.company_email, project.company_address, project.company_website,
                      project.company_license ? `Lic. ${project.company_license}` : ""].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {on(project, "show_contact_block") && (
                <div className="text-right text-sm text-slate-600">
                  <p className="font-bold text-slate-900 text-base">{project.project_name}</p>
                  <p>{project.client_name}</p>
                  {on(project, "show_site_address") && project.site_address && <p>{project.site_address}</p>}
                  {(project.order_contact || project.contact_name || project.contact_phone || project.contact_email) && (
                    <p className="text-xs text-slate-400">
                      {[project.order_contact || project.contact_name, project.contact_phone, project.contact_email].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {project.quote_intro_text && (
              <p className="mt-4 text-sm text-slate-600 whitespace-pre-wrap">{project.quote_intro_text}</p>
            )}

            <table className="w-full text-sm mt-6">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="py-2 px-3 border-b-2 border-slate-200 font-medium">Scope of Work</th>
                  {showCat && <th className="py-2 px-3 border-b-2 border-slate-200 font-medium">Category</th>}
                  {showQty && <th className="py-2 px-3 border-b-2 border-slate-200 font-medium text-center">Qty</th>}
                  <th className="py-2 px-3 border-b-2 border-slate-200 font-medium text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {displayLines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3 border-b border-slate-100 text-slate-900">
                      {l.name}
                      {l.desc && <p className="text-xs text-slate-500 mt-0.5">{l.desc}</p>}
                    </td>
                    {showCat && <td className="py-2.5 px-3 border-b border-slate-100 text-slate-500 align-top">{l.category}</td>}
                    {showQty && <td className="py-2.5 px-3 border-b border-slate-100 text-center text-slate-600 align-top tabular-nums">{l.qty ?? 1}</td>}
                    <td className="py-2.5 px-3 border-b border-slate-100 text-right font-semibold tabular-nums align-top">{money(l.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto w-80 mt-5 text-sm space-y-1">
              {waterfall.map((r, i) => (
                <div
                  key={i}
                  className={`flex justify-between ${
                    r.kind === "total" ? "font-bold text-lg border-t-2 border-slate-900 pt-2"
                    : r.kind === "subtotal" ? "font-semibold"
                    : r.kind === "deposit" || r.kind === "balance" ? "font-semibold"
                    : "text-slate-600"
                  }`}
                  style={r.kind === "deposit" || r.kind === "balance" ? { color: A } : undefined}
                >
                  <span>{r.label}</span>
                  <span className="tabular-nums">{money(r.amount)}</span>
                </div>
              ))}
            </div>

            {(inclusions.length > 0 || exclusions.length > 0) && (
              <div className="flex flex-wrap gap-8 mt-8 text-sm">
                {inclusions.length > 0 && (
                  <div className="flex-1 min-w-[220px]">
                    <p className="font-semibold text-slate-900 mb-1.5">Included in this estimate</p>
                    <ul className="list-disc pl-5 text-slate-600 space-y-0.5">{inclusions.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                )}
                {exclusions.length > 0 && (
                  <div className="flex-1 min-w-[220px]">
                    <p className="font-semibold text-slate-900 mb-1.5">Not included</p>
                    <ul className="list-disc pl-5 text-slate-600 space-y-0.5">{exclusions.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                )}
              </div>
            )}

            <TextBlock title="Payment terms" body={project.payment_terms} />
            {on(project, "show_lead_time_block") && <TextBlock title="Lead time" body={project.lead_time_text} />}
            {on(project, "show_warranty_block") && <TextBlock title="Warranty" body={project.warranty_text} />}
            {on(project, "show_terms_block") && <TextBlock title="Terms & conditions" body={project.quote_terms_conditions} />}
            {on(project, "show_notes_on_quote") && <TextBlock title="Notes" body={project.notes} />}

            {on(project, "show_signature_block") && (
              <div className="flex gap-12 mt-12">
                <div className="flex-1 border-t border-slate-900 pt-1.5 text-xs text-slate-500">Customer signature / date</div>
                <div className="flex-1 border-t border-slate-900 pt-1.5 text-xs text-slate-500">{project.company_name || "Company"} signature / date</div>
              </div>
            )}

            {on(project, "show_validity_footer") && (
              <p className="mt-8 text-xs text-slate-400">
                This estimate is valid for {validDays} days from the date above. Pricing subject to final site verification.
              </p>
            )}
            {project.quote_footer_text && (
              <p className="mt-3 text-xs text-slate-400 whitespace-pre-wrap">{project.quote_footer_text}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}