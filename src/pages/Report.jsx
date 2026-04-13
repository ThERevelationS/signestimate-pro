import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bug, Lightbulb, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

export default function Report() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    type: 'bug',
    title: '',
    description: ''
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Report.list('-created_date');
      setReports(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return;
    
    setSubmitting(true);
    try {
      await base44.entities.Report.create(form);
      toast({ title: "Success", description: "Report submitted successfully!" });
      setForm({ type: 'bug', title: '', description: '' });
      loadReports();
    } catch (e) {
      toast({ title: "Error", description: "Failed to submit report.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Bug & Feature Reporting</h1>
            <p className="text-slate-600">Submit bugs or request new features.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Submit Report</CardTitle>
                <CardDescription>We value your feedback!</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(prev => ({...prev, type: v}))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug"><span className="flex items-center gap-2"><Bug className="w-4 h-4 text-red-500" /> Bug</span></SelectItem>
                        <SelectItem value="feature"><span className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Feature</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input className="mt-1" required value={form.title} onChange={e => setForm(prev => ({...prev, title: e.target.value}))} placeholder="Short summary" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea className="mt-1 min-h-[120px]" required value={form.description} onChange={e => setForm(prev => ({...prev, description: e.target.value}))} placeholder="Please provide details..." />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-slate-800">Recent Reports</h3>
            {loading ? (
              <div className="text-slate-500">Loading...</div>
            ) : reports.length === 0 ? (
              <div className="text-slate-500 text-center p-8 bg-white rounded-lg border border-slate-200">No reports found.</div>
            ) : (
              reports.map(r => (
                <Card key={r.id}>
                  <CardHeader className="py-3 px-4 flex flex-row items-start justify-between bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      {r.type === 'bug' ? <Bug className="w-5 h-5 text-red-500" /> : <Lightbulb className="w-5 h-5 text-amber-500" />}
                      <div>
                        <CardTitle className="text-base">{r.title}</CardTitle>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {r.created_by} • {format(new Date(r.created_date), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                    <Badge variant={r.status === 'open' ? 'secondary' : 'default'} className="uppercase text-[10px]">
                      {r.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 text-sm text-slate-700 whitespace-pre-wrap">
                    {r.description}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}