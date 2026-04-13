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
  const [currentUser, setCurrentUser] = useState(null);
  const [bugReportEmail, setBugReportEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    type: 'bug',
    title: '',
    description: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const data = await base44.entities.Report.list('-created_date');
      setReports(data);
      if (user?.role === 'admin') {
        const settings = await base44.entities.Settings.filter({ setting_name: 'bug_report_email' });
        if (settings.length > 0) {
          setBugReportEmail(settings[0].setting_value);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveBugReportEmail = async () => {
    setSavingEmail(true);
    try {
      const settings = await base44.entities.Settings.filter({ setting_name: 'bug_report_email' });
      if (settings.length > 0) {
        await base44.entities.Settings.update(settings[0].id, { setting_value: bugReportEmail });
      } else {
        await base44.entities.Settings.create({
          setting_name: 'bug_report_email',
          setting_value: bugReportEmail,
          setting_type: 'text',
          description: 'Email to receive bug reports',
          category: 'general'
        });
      }
      toast({ title: "Success", description: "Bug report email saved." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save email.", variant: "destructive" });
    }
    setSavingEmail(false);
  };

  const handleMarkComplete = async (id) => {
    try {
      await base44.entities.Report.update(id, { status: 'closed' });
      toast({ title: "Success", description: "Report marked as complete." });
      loadData();
    } catch (e) {
      toast({ title: "Error", description: "Failed to update report.", variant: "destructive" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return;
    
    setSubmitting(true);
    try {
      await base44.entities.Report.create(form);
      toast({ title: "Success", description: "Report submitted successfully!" });
      setForm({ type: 'bug', title: '', description: '' });
      loadData();
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

        {currentUser?.role === 'admin' && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="py-4">
              <CardTitle className="text-lg text-blue-900">Admin Settings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 max-w-sm w-full">
                <Label>Destination Email for Reports</Label>
                <Input 
                  className="mt-1 bg-white" 
                  placeholder="admin@example.com" 
                  value={bugReportEmail} 
                  onChange={e => setBugReportEmail(e.target.value)} 
                />
              </div>
              <Button onClick={saveBugReportEmail} disabled={savingEmail}>
                {savingEmail ? 'Saving...' : 'Save Email'}
              </Button>
            </CardContent>
          </Card>
        )}

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
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={r.status === 'open' ? 'secondary' : 'default'} className="uppercase text-[10px]">
                        {r.status}
                      </Badge>
                      {currentUser?.role === 'admin' && r.status === 'open' && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleMarkComplete(r.id)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Complete
                        </Button>
                      )}
                    </div>
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