import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Percent, Calculator, Check } from 'lucide-react';

const MODE_META = {
  tier: {
    label: 'Tier Markups (%)',
    description: 'Each customer tier has its own markup % per category. Recommended default.',
    icon: Percent,
    color: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  cost_plus: {
    label: 'Cost-Plus',
    description: 'Cost + labor burden + overhead + profit, with optional per-category markups.',
    icon: Calculator,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
};

/**
 * Mode toggle header for the Markups tab.
 *  - Shows the currently active pricing system
 *  - Switch button opens a double-confirmation dialog:
 *      Step 1: "are you sure?" explainer + Continue
 *      Step 2: type CONFIRM to commit the switch
 *
 * Props:
 *   activeMode: 'tier' | 'cost_plus'
 *   modeRecordId: id of the PricingMode entity record (or null if not yet created)
 *   onModeChanged: (newMode) => void
 */
export default function PricingModeToggle({ activeMode, modeRecordId, onModeChanged }) {
  const [step, setStep] = useState(0); // 0 = closed, 1 = first confirm, 2 = type-CONFIRM
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const target = activeMode === 'tier' ? 'cost_plus' : 'tier';
  const ActiveIcon = MODE_META[activeMode].icon;
  const TargetIcon = MODE_META[target].icon;

  const openDialog = () => { setStep(1); setTyped(''); };
  const close = () => { setStep(0); setTyped(''); };

  const commit = async () => {
    setSaving(true);
    try {
      if (modeRecordId) {
        await base44.entities.PricingMode.update(modeRecordId, { active_mode: target });
      } else {
        await base44.entities.PricingMode.create({ active_mode: target });
      }
      toast({ title: 'Pricing system switched', description: `Now using ${MODE_META[target].label}.` });
      onModeChanged?.(target);
      close();
    } catch (e) {
      toast({ title: 'Switch failed', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <>
      <div className="border border-slate-200 rounded-xl bg-white p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${MODE_META[activeMode].color}`}>
            <ActiveIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Active Pricing System</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                <Check className="w-3 h-3" /> Active
              </span>
            </div>
            <div className="text-base font-semibold text-slate-900">{MODE_META[activeMode].label}</div>
            <div className="text-xs text-slate-500 max-w-md">{MODE_META[activeMode].description}</div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={openDialog} className="border-slate-300">
          <TargetIcon className="w-4 h-4 mr-1.5" />
          Switch to {MODE_META[target].label}
        </Button>
      </div>

      {/* Step 1: warning + continue */}
      <Dialog open={step === 1} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle>Switch pricing system?</DialogTitle>
            <DialogDescription className="pt-2 space-y-2 text-sm">
              <span className="block">You are about to switch from <strong>{MODE_META[activeMode].label}</strong> to <strong>{MODE_META[target].label}</strong>.</span>
              <span className="block text-slate-600">All existing settings for both systems are preserved — only which one is <em>used</em> by quotes changes. You can switch back at any time.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={() => setStep(2)} className="bg-slate-900 hover:bg-slate-800 text-white">Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: type CONFIRM */}
      <Dialog open={step === 2} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Type CONFIRM to switch</DialogTitle>
            <DialogDescription className="pt-2 text-sm text-slate-600">
              This affects how every quote in the app is priced. Type <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-xs">CONFIRM</code> below to apply the switch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Confirmation</Label>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="CONFIRM" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={commit} disabled={typed !== 'CONFIRM' || saving} className="bg-rose-600 hover:bg-rose-700 text-white">
              {saving ? 'Switching…' : `Switch to ${MODE_META[target].label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}