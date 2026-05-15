import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bug, Lightbulb, MessageCircle, Send, MapPin, Pencil, X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, CATEGORY_OPTIONS, TYPE_OPTIONS, lookup } from './reportConstants';

export default function ReportDetailDialog({ report, open, onOpenChange, currentUser, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(report || {});
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (report) {
      setDraft(report);
      setEditing(false);
      setNewComment('');
    }
  }, [report]);

  if (!report) return null;

  const isAdmin = currentUser?.role === 'admin';
  const isOwner = report.created_by === currentUser?.email;
  const canEdit = isAdmin || isOwner;
  const isBug = report.type === 'bug';
  const status = lookup(STATUS_OPTIONS, report.status) || STATUS_OPTIONS[0];
  const priority = lookup(PRIORITY_OPTIONS, report.priority) || PRIORITY_OPTIONS[1];
  const category = lookup(CATEGORY_OPTIONS, report.category);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(report.id, {
      title: draft.title,
      description: draft.description,
      type: draft.type,
      priority: draft.priority,
      category: draft.category,
      page_location: draft.page_location,
      ...(isAdmin && { admin_notes: draft.admin_notes }),
    });
    setSaving(false);
    setEditing(false);
  };

  const handleStatusChange = async (newStatus) => {
    await onUpdate(report.id, { status: newStatus });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSaving(true);
    const updatedComments = [...(report.comments || []), {
      author_email: currentUser.email,
      author_name: currentUser.full_name || currentUser.email,
      body: newComment.trim(),
      created_at: new Date().toISOString(),
    }];
    await onUpdate(report.id, { comments: updatedComments });
    setNewComment('');
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isBug ? 'bg-red-50' : 'bg-amber-50'}`}>
                {isBug ? <Bug className="w-5 h-5 text-red-500" /> : <Lightbulb className="w-5 h-5 text-amber-500" />}
              </div>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <Input
                    value={draft.title}
                    onChange={e => setDraft({ ...draft, title: e.target.value })}
                    className="text-lg font-semibold"
                  />
                ) : (
                  <DialogTitle className="text-lg leading-tight">{report.title}</DialogTitle>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  {report.created_by} • {format(new Date(report.created_date), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>
            {canEdit && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="flex-shrink-0">
                <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Status / Priority / Category row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-slate-500">Status</Label>
            {isAdmin ? (
              <Select value={report.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1"><Badge className={`${status.color} border`}>{status.label}</Badge></div>
            )}
          </div>
          <div>
            <Label className="text-xs text-slate-500">Priority</Label>
            {editing ? (
              <Select value={draft.priority} onValueChange={v => setDraft({ ...draft, priority: v })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1"><Badge className={`${priority.color} border`}>{priority.label}</Badge></div>
            )}
          </div>
          <div>
            <Label className="text-xs text-slate-500">Category</Label>
            {editing ? (
              <Select value={draft.category} onValueChange={v => setDraft({ ...draft, category: v })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1 text-sm text-slate-700">{category?.label || '—'}</div>
            )}
          </div>
          <div>
            <Label className="text-xs text-slate-500">Type</Label>
            {editing ? (
              <Select value={draft.type} onValueChange={v => setDraft({ ...draft, type: v })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1 text-sm text-slate-700 capitalize">{report.type}</div>
            )}
          </div>
        </div>

        {/* Location */}
        <div>
          <Label className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />Page / Location</Label>
          {editing ? (
            <Input
              className="mt-1"
              value={draft.page_location || ''}
              onChange={e => setDraft({ ...draft, page_location: e.target.value })}
              placeholder="Where in the app?"
            />
          ) : (
            <div className="mt-1 text-sm text-slate-700">{report.page_location || <span className="text-slate-400">—</span>}</div>
          )}
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs text-slate-500">Description</Label>
          {editing ? (
            <Textarea
              className="mt-1 min-h-[120px]"
              value={draft.description}
              onChange={e => setDraft({ ...draft, description: e.target.value })}
            />
          ) : (
            <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">
              {report.description}
            </div>
          )}
        </div>

        {/* Admin notes */}
        {(isAdmin || report.admin_notes) && (
          <div>
            <Label className="text-xs text-slate-500">Admin Notes {isAdmin && <span className="text-slate-400">(internal)</span>}</Label>
            {editing && isAdmin ? (
              <Textarea
                className="mt-1 min-h-[80px] bg-amber-50/50 border-amber-200"
                value={draft.admin_notes || ''}
                onChange={e => setDraft({ ...draft, admin_notes: e.target.value })}
                placeholder="Internal notes visible to admins"
              />
            ) : report.admin_notes ? (
              <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap bg-amber-50/60 rounded-lg p-3 border border-amber-200">
                {report.admin_notes}
              </div>
            ) : null}
          </div>
        )}

        {editing && (
          <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => { setEditing(false); setDraft(report); }}>
              <X className="w-4 h-4 mr-1" />Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}

        {/* Comments thread */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-slate-500" />
            <h4 className="font-medium text-slate-900 text-sm">
              Discussion ({report.comments?.length || 0})
            </h4>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {(report.comments || []).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">No comments yet.</p>
            )}
            {(report.comments || []).map((c, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">{c.author_name || c.author_email}</span>
                  <span className="text-[10px] text-slate-400">
                    {c.created_at ? format(new Date(c.created_at), 'MMM d, h:mm a') : ''}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[60px] flex-1"
            />
            <Button onClick={handleAddComment} disabled={saving || !newComment.trim()} className="self-end">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}