import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Printer, ClipboardCopy, FileText, Settings2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fmtCurrency } from "@/lib/formatters";
import { ESTIMATOR_MODULES_BY_KEY } from "./estimatorRegistry";
import { computeQuote, adjustedSectionTotal, quoteWaterfallRows } from "./aioPricing";

const bullets = (text) => (text || "").split("\n").map((l) => l.trim()).filter(Boolean);

// SINGLE POINT customer-facing quote — editable (company branding, scope
// lists, terms, per-section descriptions, price bundling) with a live preview
// and a clean print/PDF output. All math comes from the aioPricing waterfall.
export default function AllInOneCustomerViewTab({ project, grandTotal, updateField, onUpdateItem }) {
  const { toast } = useToast();
  const allItems = project.line_items || [];
  const lineItems = allItems.filter((li) => !li.missing);
  const quote = computeQuote(project);
  // Adjustments are baked into the per-line adjusted prices, so the
  // "adjustments" waterfall row is skipped on the quote.
  const waterfall = quoteWaterfallRows(quote).filter((r) => r.kind !== "adjust");

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
      desc: li.customer_description || "",
      price: adjustedSectionTotal(li),
    }));
    const excludedSum = excluded.reduce((s, li) => s + adjustedSectionTotal(li), 0);
    if (excludedSum > 0) {
      lines.push({ name: "Additional project scope", category: "General conditions", desc: "", price: excludedSum });
    }
    return lines;
  })();

  const inclusions = bullets(project.scope_inclusions);
  const exclusions = bullets(project.scope_exclusions);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = displayLines.map((l) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${l.name}${l.desc ? `<br/><span style="color:#64748b;font-size:12px;">${l.desc}</span>` : ""}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">${l.category}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;vertical-align:top;">${fmtCurrency(l.price)}</td>
    </tr>`).join("");
    const waterfallHtml = waterfall.map((r) => `<div style="display:flex;justify-content:space-between;padding:4px 0;${r.kind === "total" ? "border-top:2px solid #0f172a;font-weight:bold;font-size:16px;padding-top:8px;" : r.kind === "subtotal" ? "font-weight:600;" : "color:#475569;"}${r.kind === "deposit" || r.kind === "balance" ? "color:#4f46e5;font-weight:600;" : ""}"><span>${r.label}</span><span>${fmtCurrency(r.amount)}</span></div>`).join("");
    const listHtml = (title, items) => items.length === 0 ? "" : `<div style="flex:1;min-width:220px;"><b style="font-size:13px;">${title}</b><ul style="margin:6px 0 0;padding-left:18px;font-size:13px;color:#475569;">${items.map((i) => `<li style="margin:2px 0;">${i}</li>`).join("")}</ul></div>`;
    w.document.write(`<!DOCTYPE html><html><head><title>Estimate — ${project.project_name || ""}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:760px;margin:32px auto;padding:0 24px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4f46e5;padding-bottom:16px;">
    <div>
      ${project.company_name ? `<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#4f46e5;">${project.company_name}</p>` : ""}
      <h1 style="margin:0;font-size:22px;">Project Estimate</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">
        ${project.estimate_number ? `Estimate #${project.estimate_number} · ` : ""}${project.po_number ? `PO #${project.po_number} · ` : ""}Date: ${today} · Valid until: ${validUntil}
      </p>
      ${project.company_phone || project.company_email ? `<p style="margin:2px 0 0;color:#64748b;font-size:12px;">${[project.company_phone, project.company_email].filter(Boolean).join(" · ")}</p>` : ""}
    </div>
    <div style="text-align:right;font-size:13px;color:#475569;">
      <b style="font-size:15px;color:#0f172a;">${project.project_name || ""}</b><br/>
      ${project.client_name || ""}<br/>
      ${project.site_address || ""}<br/>
      ${[project.contact_name, project.contact_phone, project.contact_email].filter(Boolean).join(" · ")}
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px;">
    <thead><tr style="text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;">
      <th style="padding:8px 12px;border-bottom:2px solid #cbd5e1;">Scope of Work</th>
      <th style="padding:8px 12px;border-bottom:2px solid #cbd5e1;">Category</th>
      <th style="padding:8px 12px;border-bottom:2px solid #cbd5e1;text-align:right;">Price</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div style="margin-top:16px;margin-left:auto;width:300px;font-size:14px;">${waterfallHtml}</div>
  <div style="display:flex;gap:32px;margin-top:24px;flex-wrap:wrap;">
    ${listHtml("Included in this estimate", inclusions)}
    ${listHtml("Not included", exclusions)}
  </div>
  ${project.payment_terms ? `<div style="margin-top:20px;font-size:13px;color:#475569;"><b>Payment terms</b><p style="white-space:pre-wrap;margin:4px 0 0;">${project.payment_terms}</p></div>` : ""}
  ${project.notes ? `<div style="margin-top:16px;font-size:13px;color:#475569;"><b>Notes</b><p style="white-space:pre-wrap;margin:4px 0 0;">${project.notes}</p></div>` : ""}
  <div style="display:flex;gap:48px;margin-top:48px;">
    <div style="flex:1;"><div style="border-top:1px solid #0f172a;padding-top:6px;font-size:12px;color:#475569;">Customer signature / date</div></div>
    <div style="flex:1;"><div style="border-top:1px solid #0f172a;padding-top:6px;font-size:12px;color:#475569;">${project.company_name || "Company"} signature / date</div></div>
  </div>
  <p style="margin-top:28px;font-size:11px;color:#94a3b8;">This estimate is valid for ${validDays} days from the date above. Pricing subject to final site verification.</p>
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
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4 text-indigo-600" /> Quote Settings</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="text-xs">Your Company Name</Label>
              <Input className="h-8" value={project.company_name || ""} onChange={(e) => updateField("company_name", e.target.value)} placeholder="Shown in the quote header" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Company Phone</Label>
                <Input className="h-8" value={project.company_phone || ""} onChange={(e) => updateField("company_phone", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Company Email</Label>
                <Input className="h-8" value={project.company_email || ""} onChange={(e) => updateField("company_email", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Quote Valid (days)</Label>
              <Input className="h-8 w-24" type="number" min="1" value={project.quote_valid_days ?? 30} onChange={(e) => updateField("quote_valid_days", parseInt(e.target.value) || 30)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5">
              <div className="text-xs">
                <p className="font-medium text-slate-700">Bundle into one price</p>
                <p className="text-slate-400">Hide per-section pricing</p>
              </div>
              <Switch checked={!!project.hide_section_prices} onCheckedChange={(v) => updateField("hide_section_prices", v)} />
            </div>
            <div>
              <Label className="text-xs">Payment Terms</Label>
              <Textarea className="h-16 text-sm" value={project.payment_terms || ""} onChange={(e) => updateField("payment_terms", e.target.value)} placeholder={`e.g. ${quote.depositPct || 50}% deposit to begin, balance net 30 on completion.`} />
            </div>
            <div>
              <Label className="text-xs">Included in Scope (one per line)</Label>
              <Textarea className="h-20 text-sm" value={project.scope_inclusions || ""} onChange={(e) => updateField("scope_inclusions", e.target.value)} placeholder={"Fabrication per approved drawings\nInstallation & equipment\nOne year workmanship warranty"} />
            </div>
            <div>
              <Label className="text-xs">Excluded from Scope (one per line)</Label>
              <Textarea className="h-20 text-sm" value={project.scope_exclusions || ""} onChange={(e) => updateField("scope_exclusions", e.target.value)} placeholder={"Primary electrical to sign location\nPermit fees unless listed\nLandscaping repair"} />
            </div>
          </CardContent>
        </Card>

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
                    <Input
                      className="h-7 text-xs"
                      value={li.customer_description || ""}
                      onChange={(e) => onUpdateItem(idx, { customer_description: e.target.value })}
                      placeholder="Customer-facing description (optional)"
                    />
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
            <div className="flex flex-wrap justify-between items-start gap-4 border-b-4 border-indigo-600 pb-5">
              <div>
                {project.company_name && <p className="text-indigo-600 font-bold text-lg leading-tight">{project.company_name}</p>}
                <h2 className="text-2xl font-bold text-slate-900">Project Estimate</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {project.estimate_number && <>Estimate #{project.estimate_number} · </>}
                  {project.po_number && <>PO #{project.po_number} · </>}
                  Date: {today} · Valid until: {validUntil}
                </p>
                {(project.company_phone || project.company_email) && (
                  <p className="text-xs text-slate-400">{[project.company_phone, project.company_email].filter(Boolean).join(" · ")}</p>
                )}
              </div>
              <div className="text-right text-sm text-slate-600">
                <p className="font-bold text-slate-900 text-base">{project.project_name}</p>
                <p>{project.client_name}</p>
                {project.site_address && <p>{project.site_address}</p>}
                {(project.contact_name || project.contact_phone || project.contact_email) && (
                  <p className="text-xs text-slate-400">
                    {[project.contact_name, project.contact_phone, project.contact_email].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>

            <table className="w-full text-sm mt-6">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="py-2 px-3 border-b-2 border-slate-200 font-medium">Scope of Work</th>
                  <th className="py-2 px-3 border-b-2 border-slate-200 font-medium">Category</th>
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
                    <td className="py-2.5 px-3 border-b border-slate-100 text-slate-500 align-top">{l.category}</td>
                    <td className="py-2.5 px-3 border-b border-slate-100 text-right font-semibold tabular-nums align-top">{fmtCurrency(l.price)}</td>
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
                    : r.kind === "deposit" || r.kind === "balance" ? "text-indigo-700 font-semibold"
                    : "text-slate-600"
                  }`}
                >
                  <span>{r.label}</span>
                  <span className="tabular-nums">{fmtCurrency(r.amount)}</span>
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

            {project.payment_terms && (
              <div className="mt-6 text-sm text-slate-600">
                <p className="font-semibold text-slate-900 mb-1">Payment terms</p>
                <p className="whitespace-pre-wrap">{project.payment_terms}</p>
              </div>
            )}
            {project.notes && (
              <div className="mt-5 text-sm text-slate-600">
                <p className="font-semibold text-slate-900 mb-1">Notes</p>
                <p className="whitespace-pre-wrap">{project.notes}</p>
              </div>
            )}

            <div className="flex gap-12 mt-12">
              <div className="flex-1 border-t border-slate-900 pt-1.5 text-xs text-slate-500">Customer signature / date</div>
              <div className="flex-1 border-t border-slate-900 pt-1.5 text-xs text-slate-500">{project.company_name || "Company"} signature / date</div>
            </div>

            <p className="mt-8 text-xs text-slate-400">
              This estimate is valid for {validDays} days from the date above. Pricing subject to final site verification.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}