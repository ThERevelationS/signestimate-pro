import React, { useEffect, useState, useMemo, useCallback } from "react";
import { MaintenanceActionRate, Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wrench, Save, CheckCircle2, DollarSign, Ruler, Gauge, Building2, AlertTriangle } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";
import { useToast } from "@/components/ui/use-toast";
import { SIGN_TYPES, ACTIONS, ACTIONS_FOR_SIGN_TYPE, sizeAxisFor } from "@/components/signMaintenance/constants";
import { DEFAULT_RATES, DEFAULT_MIN_HOURS, SIZE_FIELD } from "@/components/signMaintenance/defaults";
import RatesBySignTypeTab from "@/components/signMaintenance/RatesBySignTypeTab";
import MinimumsTab, { minimumSettingKey } from "@/components/signMaintenance/MinimumsTab";
import TravelTab from "@/components/signMaintenance/TravelTab";
import SiteConditionsTab from "@/components/signMaintenance/SiteConditionsTab";
import { maintenanceTravelDefs, maintenanceSiteConditionDefs } from "@/components/signMaintenance/maintenanceTravelSiteDefs";
import { refreshFuelPrice } from "@/functions/refreshFuelPrice";

// Pricing & Labor (hourly rates) — global settings used across the module.
const GLOBAL_LABOR_SETTINGS = [
  { name: "maintenance_crew_lead_rate",     category: "maintenance_pricing", label: "Crew Lead Hourly Rate",   suffix: "$/hr", default: "75" },
  { name: "maintenance_tech_rate",          category: "maintenance_pricing", label: "Service Tech Hourly Rate", suffix: "$/hr", default: "65" },
  { name: "maintenance_helper_rate",        category: "maintenance_pricing", label: "Helper Hourly Rate",       suffix: "$/hr", default: "35" },
];

// Build the prefilled value for one (sign_type × action) action rate row from defaults.
const buildDefaultRateRow = (signTypeId, actionId) => {
  const tableForSign = DEFAULT_RATES[signTypeId] || {};
  const def = tableForSign[actionId];
  const isCabinet = sizeAxisFor(signTypeId) === "cabinet";
  const base = {
    sign_type: signTypeId,
    action: actionId,
    rate_basis: isCabinet ? "per_cabinet" : "per_letter",
    is_enabled: true,
  };
  if (!def) return base;
  base.rate_basis = def.basis;
  Object.assign(base, def.row);
  return base;
};

export default function SignMaintenanceSettings() {
  const [isLocked, setIsLocked] = useState(true);
  const [user, setUser] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({});
  const [rates, setRates] = useState([]); // MaintenanceActionRate[]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingFuel, setRefreshingFuel] = useState(false);
  const { toast } = useToast();

  // All definitions whose defaults we want to seed into the Settings entity
  const allGlobalDefs = useMemo(() => [
    ...GLOBAL_LABOR_SETTINGS,
    ...SIGN_TYPES.map(st => ({
      name: minimumSettingKey(st.id),
      category: "maintenance_minimums",
      label: `${st.label} — Minimum Hours`,
      suffix: "hrs",
      default: String(DEFAULT_MIN_HOURS[st.id] ?? 2),
    })),
    ...maintenanceTravelDefs,
    ...maintenanceSiteConditionDefs,
  ], []);

  const load = useCallback(async () => {
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
      allGlobalDefs.forEach(def => {
        next[def.name] = settingsMap[def.name] !== undefined ? settingsMap[def.name] : def.default;
      });
      setGlobalSettings(next);

      // Seed missing MaintenanceActionRate rows from DEFAULT_RATES so the user always
      // sees a fully prefilled grid even on a brand new app.
      const haveKey = new Set((dbRates || []).map(r => `${r.sign_type}|${r.action}`));
      const seeded = [...(dbRates || [])];
      SIGN_TYPES.forEach(st => {
        const applicable = ACTIONS_FOR_SIGN_TYPE[st.id] || [];
        applicable.forEach(actionId => {
          if (!haveKey.has(`${st.id}|${actionId}`)) {
            seeded.push(buildDefaultRateRow(st.id, actionId));
          }
        });
      });
      setRates(seeded);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [allGlobalDefs]);

  useEffect(() => { load(); }, [load]);

  const rateMap = useMemo(() => {
    const map = new Map();
    rates.forEach(r => map.set(`${r.sign_type}|${r.action}`, r));
    return map;
  }, [rates]);

  const onChangeRate = (signTypeId, actionId, patch) => {
    setRates(prev => {
      const idx = prev.findIndex(r => r.sign_type === signTypeId && r.action === actionId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch };
        return next;
      }
      return [...prev, { ...buildDefaultRateRow(signTypeId, actionId), ...patch }];
    });
  };

  const handleRefreshFuel = async () => {
    setRefreshingFuel(true);
    try {
      const res = await refreshFuelPrice({});
      const gas = res?.data?.gasoline_price_per_gallon;
      const diesel = res?.data?.diesel_price_per_gallon;
      if (gas && diesel) {
        setGlobalSettings(prev => ({
          ...prev,
          maintenance_gasoline_price_per_gallon: gas.toFixed(3),
          maintenance_diesel_price_per_gallon: diesel.toFixed(3),
        }));
        toast({ duration: 2000, description: `Fuel updated — Gas $${gas.toFixed(3)} · Diesel $${diesel.toFixed(3)}` });
      } else {
        toast({ variant: "destructive", description: "Could not refresh fuel prices" });
      }
    } catch (e) {
      toast({ variant: "destructive", description: "Refresh failed: " + e.message });
    } finally { setRefreshingFuel(false); }
  };

  const saveAll = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1) Global settings
      const dbSettings = await SettingsEntity.list();
      const existingMap = new Map(dbSettings.map(s => [s.setting_name, s]));
      const ops = [];
      for (const def of allGlobalDefs) {
        const valueToSave = String(globalSettings[def.name] ?? def.default);
        const existing = existingMap.get(def.name);
        const data = {
          setting_name: def.name,
          setting_value: valueToSave,
          setting_type: def.type || "number",
          category: def.category,
          description: def.description || def.label,
        };
        if (existing) {
          if (existing.setting_value !== valueToSave) ops.push(SettingsEntity.update(existing.id, data));
        } else ops.push(SettingsEntity.create(data));
      }
      // 2) MaintenanceActionRate rows — upsert all (seeded + edited)
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

  const TAB_META = [
    { key: "pricing",   title: "Pricing & Labor", Icon: DollarSign },
    { key: "rates",     title: "Action Rates",    Icon: Ruler },
    { key: "minimums",  title: "Minimum Rates",   Icon: Gauge },
    { key: "travel",    title: "Travel",          Icon: Building2 },
    { key: "site",      title: "Site Conditions", Icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 pb-32">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <span>Sign Maintenance</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium">Settings</span>
          </div>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center shadow-lg shadow-cyan-900/10">
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sign Maintenance Settings</h1>
                <p className="text-sm text-slate-500 mt-1">Fine-tune action rates, minimums, multipliers, and travel costs used by the maintenance estimator.</p>
              </div>
            </div>
            <Button onClick={saveAll} disabled={saving || isLocked} className="bg-slate-900 hover:bg-slate-800 text-white px-5 h-11 rounded-xl shadow-sm">
              {saving ? "Saving…" : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
            </Button>
          </div>
        </div>

        <SettingsAuthWrapper correctPassword="Cinci2467" onUnlock={() => setIsLocked(false)} user={user}>
          <Tabs defaultValue="pricing" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6 h-auto p-1">
              {TAB_META.map(({ key, title, Icon }) => (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2 py-2.5 text-xs">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="pricing" className="space-y-4">
              <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-4 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-slate-700" /></div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">Pricing & Labor</CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">Hourly rates applied to all maintenance estimates.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {GLOBAL_LABOR_SETTINGS.map(def => (
                    <div key={def.name}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <Label htmlFor={def.name} className="text-sm font-medium text-slate-800">{def.label}</Label>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{def.suffix}</span>
                      </div>
                      <Input id={def.name} type="number" step="0.25" min="0"
                        value={globalSettings[def.name] ?? ""}
                        onChange={(e) => setGlobalSettings(prev => ({ ...prev, [def.name]: e.target.value }))}
                        disabled={isLocked}
                        className="h-10 bg-white text-sm tabular-nums font-medium" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rates" className="space-y-4">
              <RatesBySignTypeTab rateMap={rateMap} isLocked={isLocked} onChangeRate={onChangeRate} />
            </TabsContent>

            <TabsContent value="minimums" className="space-y-4">
              <MinimumsTab globalSettings={globalSettings} setGlobalSettings={setGlobalSettings} isLocked={isLocked} />
            </TabsContent>

            <TabsContent value="travel" className="space-y-4">
              <TravelTab
                globalSettings={globalSettings}
                setGlobalSettings={setGlobalSettings}
                isLocked={isLocked}
                onRefreshFuel={handleRefreshFuel}
                refreshingFuel={refreshingFuel}
              />
            </TabsContent>

            <TabsContent value="site" className="space-y-4">
              <SiteConditionsTab
                globalSettings={globalSettings}
                setGlobalSettings={setGlobalSettings}
                isLocked={isLocked}
              />
            </TabsContent>
          </Tabs>
        </SettingsAuthWrapper>
      </div>

      {!isLocked && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,16rem)] bg-white/80 backdrop-blur-md border-t border-slate-200 px-6 py-3 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">Changes are saved manually — click save when you're done.</div>
            <Button onClick={saveAll} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 rounded-xl">
              {saving ? "Saving…" : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}