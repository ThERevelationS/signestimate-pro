import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PricingModeToggle from './PricingModeToggle';
import TierMarkupsTab from './TierMarkupsTab';
import CostPlusTab from './CostPlusTab';

/**
 * Wrapper for the renamed "Markups" tab in Admin.
 * Loads the PricingMode singleton, shows the toggle, and renders
 * the editor for whichever mode is active.
 *
 * Both editors remain fully functional regardless of which mode is active —
 * switching only changes which one quotes apply.
 */
export default function MarkupsTab() {
  const [mode, setMode] = useState('tier');
  const [modeRecordId, setModeRecordId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const records = await base44.entities.PricingMode.list();
        if (records[0]) {
          setMode(records[0].active_mode || 'tier');
          setModeRecordId(records[0].id);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="p-12 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <PricingModeToggle
        activeMode={mode}
        modeRecordId={modeRecordId}
        onModeChanged={(m) => setMode(m)}
      />

      {mode === 'tier' ? <TierMarkupsTab /> : <CostPlusTab />}
    </div>
  );
}