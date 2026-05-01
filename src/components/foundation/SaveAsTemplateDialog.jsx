import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProjectTemplate } from '@/entities/all';
import { Layout, X } from 'lucide-react';

export default function SaveAsTemplateDialog({ open, onClose, projectData }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Strip volatile/identifying fields so the template is reusable
      const clean = { ...projectData };
      delete clean.id;
      delete clean.created_date;
      delete clean.updated_date;
      delete clean.created_by;
      delete clean.client_name;
      delete clean.project_name;
      delete clean.estimate_number;
      delete clean.hyperlink;
      delete clean.notes;
      delete clean.status;

      await ProjectTemplate.create({
        template_name: name.trim(),
        description: description.trim(),
        project_data: clean,
      });
      onClose(true);
    } catch (e) {
      console.error('Failed to save template:', e);
      alert('Failed to save template.');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onClose(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">Save as Template</h3>
          </div>
          <button onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-500">
          Save the current foundation, walls, poles, and equipment configuration as a reusable template. Client-specific
          info won't be saved.
        </p>
        <div>
          <Label className="text-xs">Template Name *</Label>
          <Input
            placeholder="e.g. Standard 8ft Pylon Sign"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            placeholder="When should this template be used?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 h-20"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}