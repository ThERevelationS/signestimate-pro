import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MaintenanceActionRate, Settings as SettingsEntity, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wrench, Save, CheckCircle2, DollarSign, Ruler, Gauge, Building2, AlertTriangle, Paintbrush2 } from "lucide-react";
import SettingsAuthWrapper from "@/components/SettingsAuthWrapper";
import { useToast } from "@/components/ui/use-toast";
import SectionCard, { AnimatedGrid } from "@/components/signMaintenance/SectionCard";
import { SIGN_TYPES, ACTIONS, ACTIONS_FOR_SIGN_TYPE, sizeAxisFor } from "@/components/signMaintenance/constants";
import { DEFAULT_RATES, DEFAULT_MIN_HOURS, SIZE_FIELD } from "@/components/signMaintenance/defaults";
import RatesBySignTypeTab from "@/components/signMaintenance/RatesBySignTypeTab";
import MinimumsTab, { minimumSettingKey } from "@/components/signMaintenance/MinimumsTab";
import TravelTab from "@/components/signMaintenance/TravelTab";
import SiteConditionsTab from "@/components/signMaintenance/SiteConditionsTab";
import RepaintSettingsTab from "@/components/signMaintenance/RepaintSettingsTab";
import { REPAINT_DEFAULTS } from "@/components/signMaintenance/repaintDefaults";
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
    // Repaint action settings — seeded with sensible defaults so the
    // RepaintMonumentPanel calc has values to work with immediately.
    ...Object.entries(REPAINT_DEFAULTS).map(([name, def]) => ({
      name,
      category: "maintenance_pricing",
      label: name,
      default: def,
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

  // Run async ops in small batches to stay under the per-second write rate limit.
  const runChunked = async (factories, chunkSize = 6) => {
    for (let i = 0; i < factories.length; i += chunkSize) {
      const slice = factories.slice(i, i + chunkSize);
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(slice.map(fn => fn()));
    }
  };

  const saveAll = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1) Global settings — only write rows that actually changed
      const dbSettings = await SettingsEntity.list();
      const existingMap = new Map(dbSettings.map(s => [s.setting_name, s]));
      const settingOps = [];
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
          if (existing.setting_value !== valueToSave) {
            settingOps.push(() => SettingsEntity.update(existing.id, data));
          }
        } else {
          settingOps.push(() => SettingsEntity.create(data));
        }
      }

      // 2) MaintenanceActionRate rows — only write rows that are new or changed
      const existingRateMap = new Map(
        rates.filter(r => r.id).map(r => [r.id, r])
      );
      // Re-fetch latest from DB so we don't write rows that are already identical
      const dbRates = await MaintenanceActionRate.list();
      const dbRateById = new Map(dbRates.map(r => [r.id, r]));
      const rateOps = [];
      const rateFieldsToCompare = [
        "sign_type","action","rate_basis","is_enabled",
        "base_minutes_xs","base_minutes_s","base_minutes_m","base_minutes_l","base_minutes_xl","base_minutes_xxl",
        "base_minutes_cab_s","base_minutes_cab_m","base_minutes_cab_l","base_minutes_cab_xl","base_minutes_flat",
      ];
      const isRateChanged = (local, remote) => {
        if (!remote) return true;
        for (const k of rateFieldsToCompare) {
          if ((local[k] ?? 0) !== (remote[k] ?? 0)) return true;
        }
        return false;
      };
      for (const r of rates) {
        if (r.id) {
          const remote = dbRateById.get(r.id);
          if (isRateChanged(r, remote)) {
            rateOps.push(() => MaintenanceActionRate.update(r.id, r));
          }
        } else {
          rateOps.push(() => MaintenanceActionRate.create(r));
        }
      }

      await runChunked(settingOps, 6);
      await runChunked(rateOps, 6);

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

  // Each tab gets a unique color so the entire page feels lively yet structured.
  const TAB_META = [
    { key: "pricing",   title: "Pricing & Labor", Icon: DollarSign,    color: "emerald", activeBg: "data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-700" },
    { key: "rates",     title: "Action Rates",    Icon: Ruler,         color: "cyan",    activeBg: "data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-700" },
    { key: "repaint",   title: "Repaint",         Icon: Paintbrush2,   color: "orange",  activeBg: "data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-amber-600" },
    { key: "minimums",  title: "Minimum Rates",   Icon: Gauge,         color: "violet",  activeBg: "data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-purple-700" },
    { key: "travel",    title: "Travel",          Icon: Building2,     color: "blue",    activeBg: "data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-700" },
    { key: "site",      title: "Site Conditions", Icon: AlertTriangle, color: "amber",   activeBg: "data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500 data-[state=active]:to-orange-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-violet-50 relative overflow-hidden">
      {/* Decorative animated blobs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-cyan-300/20 blur-3xl"
        animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -left-32 w-96 h-96 rounded-full bg-violet-300/20 blur-3xl"
        animate={{ y: [0, -25, 0], x: [0, 15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-8 py-10 pb-32">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <span>Sign Maintenance</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium">Settings</span>
          </div>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 ring-4 ring-white"
              >
                <Wrench className="w-7 h-7 text-white drop-shadow" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-700 via-teal-700 to-violet-700 bg-clip-text text-transparent">
                  Sign Maintenance Settings
                </h1>
                <p className="text-sm text-slate-600 mt-1">Fine-tune action rates, minimums, multipliers, and travel costs used by the maintenance estimator.</p>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={saveAll}
                disabled={saving || isLocked}
                className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-700 hover:to-violet-700 text-white px-5 h-11 rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…
                  </span>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Settings</>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>

        <SettingsAuthWrapper correctPassword="Cinci2467" onUnlock={() => setIsLocked(false)} user={user}>
          <Tabs defaultValue="pricing" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 mb-6 h-auto p-1.5 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm">
              {TAB_META.map(({ key, title, Icon, activeBg }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className={`flex items-center gap-2 py-2.5 text-xs rounded-xl transition-all duration-200 data-[state=active]:text-white data-[state=active]:shadow-md ${activeBg}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="pricing" className="space-y-4">
              <SectionCard icon={DollarSign} theme="emerald" title="Pricing & Labor" description="Hourly rates applied to all maintenance estimates.">
                <AnimatedGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {GLOBAL_LABOR_SETTINGS.map(def => (
                    <div key={def.name} className="group">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <Label htmlFor={def.name} className="text-sm font-medium text-slate-800">{def.label}</Label>
                        <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">{def.suffix}</span>
                      </div>
                      <Input id={def.name} type="number" step="0.25" min="0"
                        value={globalSettings[def.name] ?? ""}
                        onChange={(e) => setGlobalSettings(prev => ({ ...prev, [def.name]: e.target.value }))}
                        disabled={isLocked}
                        className="h-10 bg-white text-sm tabular-nums font-medium border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all" />
                    </div>
                  ))}
                </AnimatedGrid>
              </SectionCard>
            </TabsContent>

            <TabsContent value="rates" className="space-y-4">
              <RatesBySignTypeTab rateMap={rateMap} isLocked={isLocked} onChangeRate={onChangeRate} />
            </TabsContent>

            <TabsContent value="repaint" className="space-y-4">
              <RepaintSettingsTab globalSettings={globalSettings} setGlobalSettings={setGlobalSettings} isLocked={isLocked} />
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

      <AnimatePresence>
        {!isLocked && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,16rem)] bg-white/80 backdrop-blur-md border-t border-slate-200 px-6 py-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="text-xs text-slate-500">Changes are saved manually — click save when you're done.</div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={saveAll}
                  disabled={saving}
                  className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-700 hover:to-violet-700 text-white h-10 px-5 rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…
                    </span>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save Settings</>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}