import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, ClipboardCopy, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fmtCurrency } from "@/lib/formatters";
import { ESTIMATOR_MODULES_BY_KEY } from "./estimatorRegistry";

// SINGLE POINT customer-facing cost view — a clean printable quote built from
// the combined sections. tax = subtotal × tax%, total = subtotal + tax,
// deposit due = total × deposit%.
export default function AllInOneCustomerViewTab({ project, grandTotal }) {
  const { toast } = useToast();
  const lineItems = (project.line_items || []).filter((li) => !li.missing);

  const taxPct = Number(project.tax_percent) || 0;
  const tax = grandTotal * (taxPct / 100);
  const total = grandTotal + tax;
  const depositPct = Number(project.deposit_percent) || 0;
  const deposit = total * (depositPct / 100);
  const today = new Date().toLocaleDateString();
  const validUntil = new Date(Date.now() + 30 * 86400000).toLocaleDateString();

  const rowsHtml = lineItems.map((li) => {
    const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${li.project_name || ""}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">${mod?.name || li.module_key}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${fmtCurrency(li.total_snapshot)}</td>
    </tr>`;
  }).join("");

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Estimate — ${project.project_name || ""}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:760px;margin:32px auto;padding:0 24px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4f46e5;padding-bottom:16px;">
    <div>
      <h1 style="margin:0;font-size:22px;">Project Estimate</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${project.estimate_number ? `Estimate #${project.estimate_number} · ` : ""}Date: ${today} · Valid until: ${validUntil}</p>
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
  <div style="margin-top:16px;margin-left:auto;width:280px;font-size:14px;">
    <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Subtotal</span><span>${fmtCurrency(grandTotal)}</span></div>
    ${taxPct > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#475569;"><span>Tax (${taxPct}%)</span><span>${fmtCurrency(tax)}</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #0f172a;font-weight:bold;font-size:16px;"><span>Total</span><span>${fmtCurrency(total)}</span></div>
    ${depositPct > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#4f46e5;font-weight:600;"><span>Deposit due (${depositPct}%)</span><span>${fmtCurrency(deposit)}</span></div>` : ""}
  </div>
  ${project.notes ? `<div style="margin-top:24px;font-size:13px;color:#475569;"><b>Notes</b><p style="white-space:pre-wrap;">${project.notes}</p></div>` : ""}
  <p style="margin-top:32px;font-size:11px;color:#94a3b8;">This estimate is valid for 30 days from the date above. Pricing subject to final site verification.</p>
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
      ...lineItems.map((li) => `• ${li.project_name}: ${fmtCurrency(li.total_snapshot)}`),
      "",
      `Subtotal: ${fmtCurrency(grandTotal)}`,
      ...(taxPct > 0 ? [`Tax (${taxPct}%): ${fmtCurrency(tax)}`] : []),
      `Total: ${fmtCurrency(total)}`,
      ...(depositPct > 0 ? [`Deposit due (${depositPct}%): ${fmtCurrency(deposit)}`] : []),
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
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCopy}><ClipboardCopy className="w-4 h-4 mr-1.5" /> Copy Summary</Button>
        <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Printer className="w-4 h-4 mr-1.5" /> Print / PDF</Button>
      </div>

      {/* On-screen quote preview */}
      <Card className="bg-white border-0 shadow-md">
        <CardContent className="p-8">
          <div className="flex flex-wrap justify-between items-start gap-4 border-b-4 border-indigo-600 pb-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Project Estimate</h2>
              <p className="text-sm text-slate-500 mt-1">
                {project.estimate_number && <>Estimate #{project.estimate_number} · </>}
                Date: {today} · Valid until: {validUntil}
              </p>
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
              {lineItems.map((li, i) => {
                const mod = ESTIMATOR_MODULES_BY_KEY[li.module_key];
                return (
                  <tr key={i}>
                    <td className="py-2.5 px-3 border-b border-slate-100 text-slate-900">{li.project_name}</td>
                    <td className="py-2.5 px-3 border-b border-slate-100 text-slate-500">{mod?.name || li.module_key}</td>
                    <td className="py-2.5 px-3 border-b border-slate-100 text-right font-semibold tabular-nums">{fmtCurrency(li.total_snapshot)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="ml-auto w-72 mt-5 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{fmtCurrency(grandTotal)}</span></div>
            {taxPct > 0 && <div className="flex justify-between text-slate-600"><span>Tax ({taxPct}%)</span><span className="tabular-nums">{fmtCurrency(tax)}</span></div>}
            <div className="flex justify-between font-bold text-lg border-t-2 border-slate-900 pt-2"><span>Total</span><span className="tabular-nums">{fmtCurrency(total)}</span></div>
            {depositPct > 0 && <div className="flex justify-between text-indigo-700 font-semibold"><span>Deposit due ({depositPct}%)</span><span className="tabular-nums">{fmtCurrency(deposit)}</span></div>}
          </div>

          {project.notes && (
            <div className="mt-8 text-sm text-slate-600">
              <p className="font-semibold text-slate-900 mb-1">Notes</p>
              <p className="whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}
          <p className="mt-8 text-xs text-slate-400">
            This estimate is valid for 30 days from the date above. Pricing subject to final site verification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}