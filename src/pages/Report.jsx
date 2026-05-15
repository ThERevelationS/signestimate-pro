import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Bug, Mail } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import ReportForm from '@/components/report/ReportForm';
import ReportStats from '@/components/report/ReportStats';
import ReportFilters from '@/components/report/ReportFilters';
import ReportCard from '@/components/report/ReportCard';
import ReportDetailDialog from '@/components/report/ReportDetailDialog';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/components/report/reportConstants';

const PRIORITY_RANK = Object.fromEntries(PRIORITY_OPTIONS.map((p, i) => [p.value, PRIORITY_OPTIONS.length - i]));
const STATUS_RANK = Object.fromEntries(STATUS_OPTIONS.map((s, i) => [s.value, i]));

export default function Report() {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [bugReportEmail, setBugReportEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [filters, setFilters] = useState({
    search: '', type: 'all', status: 'all', priority: 'all', category: 'all', mine: false,
  });
  const [sortBy, setSortBy] = useState('newest');

  const [activeReport, setActiveReport] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const data = await base44.entities.Report.list('-created_date');
      setReports(data);
      if (user?.role === 'admin') {
        const settings = await base44.entities.Settings.filter({ setting_name: 'bug_report_email' });
        if (settings.length > 0) setBugReportEmail(settings[0].setting_value || '');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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
          category: 'general',
        });
      }
      toast({ title: 'Saved', description: 'Destination email updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save email.', variant: 'destructive' });
    }
    setSavingEmail(false);
  };

  const handleSubmit = async (form) => {
    setSubmitting(true);
    try {
      await base44.entities.Report.create(form);
      toast({ title: 'Submitted', description: 'Your report was submitted. Thanks for the feedback!' });
      await loadData();
      setSubmitting(false);
      return true;
    } catch {
      toast({ title: 'Error', description: 'Failed to submit report.', variant: 'destructive' });
      setSubmitting(false);
      return false;
    }
  };

  const handleUpdate = async (id, patch) => {
    try {
      await base44.entities.Report.update(id, patch);
      // refresh and sync the open report so the dialog reflects new state
      const data = await base44.entities.Report.list('-created_date');
      setReports(data);
      if (activeReport?.id === id) {
        const updated = data.find(r => r.id === id);
        if (updated) setActiveReport(updated);
      }
      toast({ title: 'Updated', description: 'Report updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update report.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await base44.entities.Report.delete(confirmDelete.id);
      toast({ title: 'Deleted', description: 'Report removed.' });
      setConfirmDelete(null);
      if (activeReport?.id === confirmDelete.id) setActiveReport(null);
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete report.', variant: 'destructive' });
    }
  };

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let list = reports.filter(r => {
      if (filters.type !== 'all' && r.type !== filters.type) return false;
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      if (filters.priority !== 'all' && (r.priority || 'medium') !== filters.priority) return false;
      if (filters.category !== 'all' && (r.category || 'other') !== filters.category) return false;
      if (filters.mine && r.created_by !== currentUser?.email) return false;
      if (q) {
        const hay = [r.title, r.description, r.created_by, r.page_location, r.admin_notes]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list];
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sortBy === 'oldest') list.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    else if (sortBy === 'priority') {
      list.sort((a, b) => (PRIORITY_RANK[b.priority || 'medium'] || 0) - (PRIORITY_RANK[a.priority || 'medium'] || 0));
    } else if (sortBy === 'status') {
      list.sort((a, b) => (STATUS_RANK[a.status || 'open'] || 0) - (STATUS_RANK[b.status || 'open'] || 0));
    }
    return list;
  }, [reports, filters, sortBy, currentUser]);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-md flex-shrink-0">
            <Bug className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bug & Feature Reports</h1>
            <p className="text-sm text-slate-500">Track bugs, request features, and collaborate on improvements.</p>
          </div>
        </div>

        {/* Stats */}
        <ReportStats reports={reports} />

        {/* Admin email setting */}
        {currentUser?.role === 'admin' && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="py-4">
              <CardTitle className="text-base text-blue-900 flex items-center gap-2">
                <Mail className="w-4 h-4" />Admin: Notification Email
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 max-w-md w-full">
                <Label className="text-xs">Destination Email</Label>
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

        {/* Body: form + list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ReportForm onSubmit={handleSubmit} submitting={submitting} />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <ReportFilters filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} />

            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-700">
                {filtered.length} {filtered.length === 1 ? 'Report' : 'Reports'}
              </h3>
            </div>

            {loading ? (
              <div className="text-slate-500 text-center py-12">Loading...</div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="text-center py-12 text-slate-500">
                  No reports match your filters.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map(r => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    currentUser={currentUser}
                    onOpen={() => setActiveReport(r)}
                    onDelete={(rep) => setConfirmDelete(rep)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportDetailDialog
        report={activeReport}
        open={!!activeReport}
        onOpenChange={(o) => { if (!o) setActiveReport(null); }}
        currentUser={currentUser}
        onUpdate={handleUpdate}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{confirmDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}