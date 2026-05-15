import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bug, Lightbulb, Send } from 'lucide-react';
import { TYPE_OPTIONS, PRIORITY_OPTIONS, CATEGORY_OPTIONS } from './reportConstants';

const EMPTY = {
  type: 'bug',
  title: '',
  description: '',
  priority: 'medium',
  category: 'other',
  page_location: '',
};

export default function ReportForm({ onSubmit, submitting }) {
  const [form, setForm] = useState(EMPTY);

  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    const ok = await onSubmit(form);
    if (ok) setForm(EMPTY);
  };

  const isBug = form.type === 'bug';

  return (
    <Card className="border-0 shadow-sm sticky top-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {isBug ? <Bug className="w-5 h-5 text-red-500" /> : <Lightbulb className="w-5 h-5 text-amber-500" />}
          Submit Report
        </CardTitle>
        <CardDescription>Help us improve — file a bug or suggest a feature.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = form.type === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => update({ type: opt.value })}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    active ? `${opt.bg} ${opt.border} ${opt.color}` : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div>
            <Label className="text-xs">Title <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              required
              value={form.title}
              onChange={e => update({ title: e.target.value })}
              placeholder={isBug ? "e.g. Save button doesn't respond" : "e.g. Add dark mode"}
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={v => update({ priority: v })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => update({ category: v })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Page / Location</Label>
            <Input
              className="mt-1"
              value={form.page_location}
              onChange={e => update({ page_location: e.target.value })}
              placeholder="e.g. New Channel Letter Installation › Letters tab"
            />
          </div>

          <div>
            <Label className="text-xs">
              {isBug ? 'What happened? What did you expect?' : 'Describe the feature'} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              className="mt-1 min-h-[140px]"
              required
              value={form.description}
              onChange={e => update({ description: e.target.value })}
              placeholder={isBug ? "Steps to reproduce, expected vs. actual..." : "What problem does this solve? How should it work?"}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Submitting...' : <><Send className="w-4 h-4 mr-2" />Submit Report</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}