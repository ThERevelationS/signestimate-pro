import React from 'react';
import { fmtCurrency } from '@/lib/formatters';

// CoreBridge-style estimate step rail + persistent Order Summary.
// Steps map 1:1 to the existing All-In-One views (no logic duplicated):
//   Step 1 Estimate Details → details · Step 2 Edit Products → build ·
//   Step 3 Finalize Estimate → customer.  Cost Summary / BOM are review views.
const STEPS = [
  { key: 'details', n: 1, label: 'Estimate Details' },
  { key: 'build', n: 2, label: 'Edit Products' },
  { key: 'customer', n: 3, label: 'Finalize Estimate' },
];
const REVIEW = [
  { key: 'summary', label: 'Cost Summary' },
  { key: 'bom', label: 'Bill of Materials' },
];

const Row = ({ label, value, bold, negative }) => (
  <div className={`flex justify-between gap-2 py-0.5 ${bold ? 'font-bold text-slate-900 border-t border-slate-300 mt-1 pt-1.5' : 'text-slate-700'}`}>
    <span>{label}</span>
    <span className={`tabular-nums ${negative ? 'text-red-600' : ''}`}>{value}</span>
  </div>
);

export default function EstimateStepRail({ project, editId, active, onNavigate, quote, onSave, isSaving, dirty }) {
  const stepDone = {
    details: !!(project.project_name && project.client_name),
    build: (project.line_items || []).length > 0,
    customer: project.status === 'sent' || project.status === 'approved',
  };

  return (
    <aside className="w-full lg:w-60 flex-shrink-0 space-y-3 lg:sticky lg:top-24">
      {/* Step navigation */}
      <div className="bg-white border border-slate-300 rounded-sm overflow-hidden">
        <div className="px-3 py-2 bg-slate-800 border-b border-slate-300">
          <p className="text-xs font-bold text-lime-400 uppercase tracking-wide truncate">
            Estimate{project.estimate_number ? ` — ${project.estimate_number}` : editId ? '' : ' — New'}
          </p>
        </div>
        {STEPS.map((s) => (
          <button
            key={s.key}
            onClick={() => onNavigate(s.key)}
            className={`w-full text-left px-3 py-2 border-b border-slate-200 transition-colors ${
              active === s.key
                ? 'bg-lime-100 border-l-4 border-l-lime-600'
                : 'bg-slate-50 hover:bg-slate-100 border-l-4 border-l-transparent'
            }`}
          >
            <p className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
              Step {s.n}
              {stepDone[s.key] && <span className="text-lime-600 text-xs" title="Completed">✔</span>}
            </p>
            <p className="text-sm text-slate-700">{s.label}</p>
          </button>
        ))}
        <div className="px-3 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">Review</div>
        {REVIEW.map((s) => (
          <button
            key={s.key}
            onClick={() => onNavigate(s.key)}
            className={`w-full text-left px-3 py-1.5 text-sm border-b border-slate-100 last:border-b-0 transition-colors ${
              active === s.key ? 'bg-lime-100 border-l-4 border-l-lime-600 text-slate-900' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-l-transparent'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Persistent Order Summary — same computeQuote waterfall as everywhere */}
      <div className="bg-white border border-slate-300 rounded-sm overflow-hidden text-xs">
        <div className="px-3 py-1.5 bg-zinc-700 text-white font-semibold text-sm">Order Summary</div>
        <div className="px-3 py-2 border-b border-slate-200">
          <p className="font-bold text-slate-900 truncate">{project.client_name || 'No customer set'}</p>
          <p className="text-slate-500 truncate">Description: {project.project_name || '—'}</p>
        </div>
        <div className="px-3 py-2">
          <Row label="Subtotal:" value={fmtCurrency(quote.subtotal)} />
          <Row label="Discount:" value={quote.discount > 0 ? `-${fmtCurrency(quote.discount)}` : fmtCurrency(0)} negative={quote.discount > 0} />
          {quote.contingency > 0 && <Row label={`Contingency (${quote.contingencyPct}%):`} value={fmtCurrency(quote.contingency)} />}
          <Row label="Shipping:" value={fmtCurrency(quote.shippingFee)} />
          <Row label="Permits:" value={fmtCurrency(quote.permitFee)} />
          <Row label="New Subtotal:" value={fmtCurrency(quote.taxableBase)} />
          <Row label={`Tax (${quote.taxPct}%):`} value={fmtCurrency(quote.tax)} />
          <Row label="Total:" value={fmtCurrency(quote.total)} bold />
          {quote.deposit > 0 && <Row label={`Deposit (${quote.depositPct}%):`} value={fmtCurrency(quote.deposit)} />}
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className="w-full bg-lime-200 hover:bg-lime-300 disabled:opacity-60 border border-lime-500 text-slate-900 font-semibold py-2 rounded-sm text-sm transition-colors"
      >
        {isSaving ? 'Saving…' : `Save Estimate Progress${dirty ? ' *' : ''}`}
      </button>
    </aside>
  );
}