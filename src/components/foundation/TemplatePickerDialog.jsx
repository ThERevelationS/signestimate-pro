import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ProjectTemplate } from '@/entities/all';
import { Layout, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function TemplatePickerDialog({ open, onClose, onSelect }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    ProjectTemplate.list('-created_date')
      .then(setTemplates)
      .catch((e) => console.error('Failed to load templates:', e))
      .finally(() => setLoading(false));
  }, [open]);

  const handleDelete = async (id, name, e) => {
    e.stopPropagation();
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await ProjectTemplate.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">Start from Template</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-500 flex-shrink-0">
          Pick a saved template to pre-fill foundations, walls, poles, and equipment.
        </p>
        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          {loading && <p className="text-sm text-slate-500 text-center py-8">Loading templates...</p>}
          {!loading && templates.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">
              No templates yet. Save a project as a template first.
            </p>
          )}
          {!loading && templates.length > 0 && (
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="border border-slate-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{t.template_name}</p>
                      {t.description && <p className="text-xs text-slate-500 mt-1">{t.description}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">
                        Created {format(new Date(t.created_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => handleDelete(t.id, t.template_name, e)}
                      className="h-7 w-7 text-red-500 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 flex-shrink-0 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}