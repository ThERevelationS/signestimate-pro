import React from 'react';

// Small presentational helpers used across formula viewer module pages.
// Keeps the math sections visually consistent and scannable.

export function FormulaSection({ title, color = 'slate', children }) {
  const colorMap = {
    slate: 'bg-white border-slate-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
    purple: 'bg-purple-50 border-purple-200',
    rose: 'bg-rose-50 border-rose-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    teal: 'bg-teal-50 border-teal-200',
  };
  const textMap = {
    slate: 'text-slate-800',
    blue: 'text-blue-800',
    green: 'text-green-800',
    amber: 'text-amber-800',
    purple: 'text-purple-800',
    rose: 'text-rose-800',
    indigo: 'text-indigo-800',
    teal: 'text-teal-800',
  };
  return (
    <div className={`${colorMap[color]} border rounded-lg p-3`}>
      <h4 className={`font-semibold ${textMap[color]} mb-2 text-sm`}>{title}</h4>
      <div className="space-y-1 text-xs text-slate-700">{children}</div>
    </div>
  );
}

export function FormulaLine({ label, formula, result, highlight = false }) {
  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${highlight ? 'font-semibold text-slate-900' : ''}`}>
      <span className="text-slate-600">{label}:</span>
      {formula && <span className="font-mono text-slate-700">{formula}</span>}
      {formula && result !== undefined && <span className="text-slate-400">=</span>}
      {result !== undefined && <span className={`font-mono ${highlight ? 'text-slate-900 font-bold' : 'text-slate-900'}`}>{result}</span>}
    </div>
  );
}

export function TotalBar({ label, value }) {
  return (
    <div className="flex justify-between font-bold text-lg border-t border-slate-600 pt-2 text-white">
      <span>{label}:</span>
      <span>${(Number(value) || 0).toFixed(2)}</span>
    </div>
  );
}