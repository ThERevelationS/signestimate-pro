import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, ListFilter, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, CATEGORY_OPTIONS, TYPE_OPTIONS } from './reportConstants';

const defaultFilters = {
  search: '',
  type: 'all',
  status: 'all',
  priority: 'all',
  hidden_categories: [],
  show_completed: false,
  mine: false,
};

// Small click-outside multi-select for categories
function CategoryMultiSelect({ hidden, setHidden }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = (val) => {
    setHidden(hidden.includes(val) ? hidden.filter(v => v !== val) : [...hidden, val]);
  };

  const shownCount = CATEGORY_OPTIONS.length - hidden.length;
  const label = hidden.length === 0
    ? 'All Categories'
    : `${shownCount}/${CATEGORY_OPTIONS.length} Categories`;

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => setOpen(o => !o)}
      >
        <ListFilter className="w-3.5 h-3.5" />
        {label}
      </Button>
      {open && (
        <div className="absolute right-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg w-64 py-2 text-sm">
          <div className="px-3 pb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <span>Show categories</span>
            <button
              type="button"
              onClick={() => setHidden([])}
              className="text-blue-600 hover:underline normal-case tracking-normal text-[11px]"
            >
              Show all
            </button>
          </div>
          {CATEGORY_OPTIONS.map(c => {
            const visible = !hidden.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggle(c.value)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center ${visible ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                  {visible && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="text-slate-700">{c.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReportFilters({ filters, setFilters }) {
  const clear = () => setFilters(defaultFilters);
  const hasFilters =
    filters.search ||
    filters.type !== 'all' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    (filters.hidden_categories || []).length > 0 ||
    filters.show_completed ||
    filters.mine;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9 h-9"
          placeholder="Search title, description, reporter..."
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      <Select value={filters.type} onValueChange={v => setFilters({ ...filters, type: v })}>
        <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
        <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={v => setFilters({ ...filters, priority: v })}>
        <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <CategoryMultiSelect
        hidden={filters.hidden_categories || []}
        setHidden={(next) => setFilters({ ...filters, hidden_categories: next })}
      />

      <Button
        variant={filters.show_completed ? "default" : "outline"}
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => setFilters({ ...filters, show_completed: !filters.show_completed })}
        title={filters.show_completed ? "Completed reports are visible" : "Completed reports are hidden"}
      >
        {filters.show_completed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        {filters.show_completed ? 'Hide Completed' : 'Show Completed'}
      </Button>

      <Button
        variant={filters.mine ? "default" : "outline"}
        size="sm"
        className="h-9"
        onClick={() => setFilters({ ...filters, mine: !filters.mine })}
      >
        My Reports
      </Button>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-9" onClick={clear}>
          <X className="w-4 h-4 mr-1" />Clear
        </Button>
      )}
    </div>
  );
}