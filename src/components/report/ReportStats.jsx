import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bug, Lightbulb, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const Stat = ({ icon: Icon, label, value, color }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 leading-none">{value}</div>
        <div className="text-xs text-slate-500 mt-1">{label}</div>
      </div>
    </CardContent>
  </Card>
);

export default function ReportStats({ reports }) {
  const total = reports.length;
  const bugs = reports.filter(r => r.type === 'bug').length;
  const features = reports.filter(r => r.type === 'feature').length;
  const open = reports.filter(r => r.status === 'open').length;
  const inProgress = reports.filter(r => r.status === 'in_progress').length;
  const completed = reports.filter(r => r.status === 'completed').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Stat icon={AlertCircle}  label="Total"        value={total}      color="bg-slate-700" />
      <Stat icon={Bug}          label="Bugs"         value={bugs}       color="bg-red-500" />
      <Stat icon={Lightbulb}    label="Features"     value={features}   color="bg-amber-500" />
      <Stat icon={AlertCircle}  label="Open"         value={open}       color="bg-blue-500" />
      <Stat icon={Loader2}      label="In Progress"  value={inProgress} color="bg-purple-500" />
      <Stat icon={CheckCircle2} label="Completed"    value={completed}  color="bg-emerald-500" />
    </div>
  );
}