import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";
import SettingInput from "./SettingInput";
import { maintenanceSiteConditionDefs, SITE_CONDITION_SUBTABS } from "./maintenanceTravelSiteDefs";

export default function SiteConditionsTab({ globalSettings, setGlobalSettings, isLocked }) {
  const setSetting = (k, v) => setGlobalSettings(prev => ({ ...prev, [k]: v }));
  return (
    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-slate-700" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">Site Conditions</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Per-condition adjustments. Multipliers scale labor time. Severity levels and Parapet / Thick / Hollow Walls are additive minutes.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-6">
        <Tabs defaultValue="multipliers" className="w-full">
          <TabsList className="flex flex-wrap w-full mb-5 h-auto p-1 gap-1">
            {SITE_CONDITION_SUBTABS.map(st => (
              <TabsTrigger key={st.key} value={st.key} className="py-2 text-xs flex-1 min-w-[140px]">
                {st.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {SITE_CONDITION_SUBTABS.map(st => {
            const defs = maintenanceSiteConditionDefs.filter(d => d.category === st.category);
            const labelDefs = st.labelsCategory
              ? maintenanceSiteConditionDefs.filter(d => d.category === st.labelsCategory)
              : [];
            return (
              <TabsContent key={st.key} value={st.key} className="space-y-4">
                <p className="text-xs text-slate-500 italic">{st.description}</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {defs.map(def => (
                    <SettingInput key={def.name} def={def} value={globalSettings[def.name]} onChange={setSetting} isLocked={isLocked} />
                  ))}
                </div>
                {labelDefs.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Severity Slider Names</div>
                    <p className="text-xs text-slate-500 italic mb-3">
                      These names appear on the estimator's severity slider (next to "{st.label}").
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {labelDefs.map(def => (
                        <SettingInput key={def.name} def={def} value={globalSettings[def.name]} onChange={setSetting} isLocked={isLocked} />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}