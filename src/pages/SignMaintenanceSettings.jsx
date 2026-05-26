import React, { useEffect, useState, useMemo } from "react";
import { MaintenanceActionRate, Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wrench, Save, CheckCircle2, DollarSign, Ruler } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";
import { useToast } from "@/components/ui/use-toast";
import { SIGN_TYPES, ACTIONS, ACTION_GROUPS, ACTIONS_FOR_SIGN_TYPE, LETTER_SIZES, CABINET_SIZES, sizeAxisFor } from "@/components/signMaintenance/constants";

// Pricing & Labor (hourly rates) — stored in the global Settings entity, like other modules.
const GLOBAL_SETTINGS = [
  { name: "maintenance_crew_lead_rate", category: "maintenance_pricing", label: "Crew Lead Hourly Rate",     suffix: "$/hr", default: "75" },
  { name: "maintenance_tech_rate",      category: "maintenance_pricing", label: "Service Tech Hourly Rate",   suffix: "$/hr", default: "65" },
  { name: "maintenance_helper_rate",    category: "maintenance_pricing", label: "Helper Hourly Rate",         suffix: "$/hr", default: "35" },
  { name: "maintenance_travel_labor_rate", category: "maintenance_pricing", label: "Travel Labor Rate",      suffix: "$/hr", default: "45" },
];

const sizeKeyToField = {
  // Letter sizes
  extra_small: "base_minutes_xs",
  small: "base_minutes_s",
  medium: "base_minutes_m",
  large: "base_minutes_l",
  extra_large: "base_minutes_xl",
  extra_extra_large: "base_minutes_xxl",
  // Cabinet sizes
  cab_small: "base_minutes_cab_s",
  cab_medium: "base_minutes_cab_m",
  cab_large: "base_minutes_cab_l",
  cab_extra_large: "base_minutes_cab_xl",
};

export default function SignMaintenanceSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [user, setUser] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({});
  const [rates, setRates] = useState([]); // MaintenanceActionRate[]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [dbSettings, dbRates, me] = await Promise.all([
        SettingsEntity.list(),
        MaintenanceActionRate.list(),
        User.me(),
      ]);
      setUser(me);

      const settingsMap = {};
      dbSettings.forEach(s => { settingsMap[s.setting_name] = s.setting_value; });
      const next = {};
      GLOBAL_SETTINGS.forEach(def => {
        next[def.name] = settingsMap[def.name] !== undefined ? settingsMap[def.name] : def.default;
      });
      setGlobalSettings(next);
      setRates(dbRates || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Build a lookup so we can find an existing MaintenanceActionRate quickly
  const rateMap = useMemo(() => {
    const map = new Map();
    rates.forEach(r => map.set(`${r.sign_type}|${r.action}`, r));
    return map;
  }, [rates]);

  const updateRateLocal = (signType, action, patch) => {
    const key = `${signType}|${action}`;
    setRates(prev => {
      const idx = prev.findIndex(r => r.sign_type === signType && r.action === action);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch };
        return next;
      }
      return [...prev, { sign_type: signType, action, rate_basis: sizeAxisFor(signType) === "cabinet" ? "per_cabinet" : "per_letter", is_enabled: true, ...patch }];
    });
  };

  const saveAll = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1) Global settings (hourly rates)
      const dbSettings = await SettingsEntity.list();
      const existingMap = new Map(dbSettings.map(s => [s.setting_name, s]));
      const ops = [];
      for (const def of GLOBAL_SETTINGS) {
        const valueToSave = String(globalSettings[def.name] ?? def.default);
        const existing = existingMap.get(def.name);
        const data = { setting_name: def.name, setting_value: valueToSave, setting_type: "number", category: def.category, description: def.label };
        if (existing) {
          if (existing.setting_value !== valueToSave) ops.push(SettingsEntity.update(existing.id, data));
        } else ops.push(SettingsEntity.create(data));
      }
      // 2) MaintenanceActionRate rows — upsert each one we touched
      for (const r of rates) {
        if (r.id) ops.push(MaintenanceActionRate.update(r.id, r));
        else ops.push(MaintenanceActionRate.create(r));
      }
      await Promise.all(ops);
      toast({ duration: 2000, description: (
        <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /><span>Settings saved</span></div>
      )});
      load();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", description: "Save failed: " + e.message });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          <span className="text-sm">Loading settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 pb-32">
        <div className="mb-8 flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center shadow-lg">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sign Maintenance Settings</h1>
              <p className="text-sm text-slate-500 mt-1">Per (sign-type × action) minutes and global hourly rates.</p>
            </div>
          </div>
          <Button onClick={saveAll} disabled={saving || isLocked} className="bg-slate-900 hover:bg-slate-800 text-white px-5 h-11 rounded-xl">
            {saving ? "Saving…" : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
          </Button>
        </div>

        <SettingsAuthWrapper correctPassword="Cinci2467" onUnlock={() => setIsLocked(false)} user={user}>
          <Tabs defaultValue="rates" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-auto p-1 max-w-md">
              <TabsTrigger value="rates" className="py-2"><Ruler className="w-4 h-4 mr-2" />Action Rates</TabsTrigger>
              <TabsTrigger value="pricing" className="py-2"><DollarSign className="w-4 h-4 mr-2" />Pricing & Labor</TabsTrigger>
            </TabsList>

            <TabsContent value="rates" className="space-y-4">
              <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-4 border-b border-slate-100">
                  <CardTitle className="text-base font-semibold">Action Rates by Sign Type</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Pick a sign type. For each applicable action, set base minutes per size. The Service Items tab will use these to auto-fill labor when an action is added.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue={SIGN_TYPES[0].id} className="w-full" orientation="vertical">
                    <div className="grid lg:grid-cols-[220px_1fr] gap-6">
                      <TabsList className="flex lg:flex-col h-auto bg-slate-50 p-2 gap-1 rounded-xl">
                        {SIGN_TYPES.map(st => (
                          <TabsTrigger key={st.id} value={st.id} className="w-full justify-start py-2 px-3 text-xs">{st.label}</TabsTrigger>
                        ))}
                      </TabsList>
                      <div>
                        {SIGN_TYPES.map(st => (
                          <TabsContent key={st.id} value={st.id} className="m-0">
                            <SignTypeRateGrid
                              signType={st}
                              rateMap={rateMap}
                              isLocked={isLocked}
                              onChange={updateRateLocal}
                            />
                          </TabsContent>
                        ))}
                      </div>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-4 border-b border-slate-100">
                  <CardTitle className="text-base font-semibold">Pricing & Labor</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Hourly rates applied to all maintenance estimates.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {GLOBAL_SETTINGS.map(def => (
                    <div key={def.name}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <Label htmlFor={def.name} className="text-sm font-medium text-slate-800">{def.label}</Label>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{def.suffix}</span>
                      </div>
                      <Input
                        id={def.name}
                        type="number"
                        step="0.25"
                        value={globalSettings[def.name] ?? ""}
                        onChange={(e) => setGlobalSettings(prev => ({ ...prev, [def.name]: e.target.value }))}
                        disabled={isLocked}
                        className="h-10 bg-white text-sm tabular-nums font-medium"
                        min="0"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </SettingsAuthWrapper>
      </div>

      {!isLocked && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,16rem)] bg-white/80 backdrop-blur-md border-t border-slate-200 px-6 py-3 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">Changes are saved manually.</div>
            <Button onClick={saveAll} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 rounded-xl">
              {saving ? "Saving…" : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Grid: for one sign type, render all applicable actions × all relevant sizes.
function SignTypeRateGrid({ signType, rateMap, isLocked, onChange }) {
  const isCabinet = sizeAxisFor(signType.id) === "cabinet";
  const sizes = isCabinet ? CABINET_SIZES : LETTER_SIZES;
  const applicableActionIds = ACTIONS_FOR_SIGN_TYPE[signType.id] || [];
  const grouped = ACTION_GROUPS.map(group => ({
    group,
    actions: ACTIONS.filter(a => a.group === group && applicableActionIds.includes(a.id)),
  })).filter(g => g.actions.length > 0);

  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-500 italic">
        {signType.description}. Minutes are per {isCabinet ? "cabinet" : "letter"} unless an action says otherwise.
      </div>

      {grouped.map(g => (
        <div key={g.group}>
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{g.group}</div>
          <div className="space-y-2">
            {g.actions.map(a => {
              const rate = rateMap.get(`${signType.id}|${a.id}`) || {};
              return (
                <div key={a.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/40">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="text-sm font-semibold text-slate-900">{a.label}</div>
                    <div className="text-[10px] text-slate-500">min / {isCabinet ? "cabinet" : "letter"}</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {sizes.map(sz => {
                      const field = sizeKeyToField[sz.id];
                      const val = rate[field] ?? 0;
                      return (
                        <div key={sz.id}>
                          <Label className="text-[10px] text-slate-500">{sz.label}</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={val}
                            disabled={isLocked}
                            onChange={(e) => onChange(signType.id, a.id, { [field]: parseFloat(e.target.value) || 0 })}
                            className="h-9 text-sm tabular-nums"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}