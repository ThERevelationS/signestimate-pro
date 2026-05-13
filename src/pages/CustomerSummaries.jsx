import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function CustomerSummaries() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CustomerSummary.list('-updated_date');
      setList(data);
    } catch {
      setList([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this summary?')) return;
    await base44.entities.CustomerSummary.delete(id);
    load();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Summaries</h1>
          <p className="text-sm text-slate-500">Aggregated quotes spanning multiple modules.</p>
        </div>
        <Button onClick={() => navigate('/CustomerSummary')}>
          <Plus className="w-4 h-4 mr-1.5" /> New Summary
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 p-8">Loading…</div>
      ) : list.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-500">No summaries yet. Create one to get started.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {list.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <Link to={`/CustomerSummary?id=${s.id}`} className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="font-medium text-slate-900">{s.summary_name}</div>
                    <div className="text-xs text-slate-500">
                      {s.client_name || '—'} · Tier {s.tier_number || 1} · {(s.linked_projects || []).length} project{(s.linked_projects || []).length === 1 ? '' : 's'}
                    </div>
                  </div>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}