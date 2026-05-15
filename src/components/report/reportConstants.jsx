import { Bug, Lightbulb, AlertCircle, Cog, Sparkles } from 'lucide-react';

export const TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
];

export const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open',         color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'in_progress', label: 'In Progress',  color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'completed',   label: 'Completed',    color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'wont_fix',    label: "Won't Fix",    color: 'bg-slate-200 text-slate-700 border-slate-300' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Low',      color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'medium',   label: 'Medium',   color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'high',     label: 'High',     color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200' },
];

export const CATEGORY_OPTIONS = [
  { value: 'ui_ux',       label: 'UI / UX' },
  { value: 'calculation', label: 'Calculations / Estimates' },
  { value: 'inventory',   label: 'Inventory' },
  { value: 'performance', label: 'Performance' },
  { value: 'data',        label: 'Data / Saving' },
  { value: 'auth',        label: 'Login / Permissions' },
  { value: 'integration', label: 'Integrations (AI, Email, ...)' },
  { value: 'other',       label: 'Other' },
];

export const lookup = (list, value) => list.find(o => o.value === value);

export const STAT_ICONS = { AlertCircle, Cog, Sparkles };