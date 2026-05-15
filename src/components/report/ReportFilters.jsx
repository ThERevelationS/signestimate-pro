import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, CATEGORY_OPTIONS, TYPE_OPTIONS } from './reportConstants';

export default function ReportFilters({ filters, setFilters, sortBy, setSortBy }) {
  const clear = () => setFilters({ search: '', type: 'all', status: 'all', priority: 'all', category: 'all', mine: false });
  const hasFilters = filters.search || filters.type !== 'all' || filters.status !== 'all' || filters.priority !== 'all' || filters.category !== 'all' || filters.mine;

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

      <Select value={filters.category} onValueChange={v => setFilters({ ...filters, category: v })}>
        <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
          <SelectItem value="priority">Priority (High → Low)</SelectItem>
          <SelectItem value="status">By Status</SelectItem>
        </SelectContent>
      </Select>

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