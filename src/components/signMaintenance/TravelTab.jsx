import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import SettingInput from "./SettingInput";
import { maintenanceTravelDefs } from "./maintenanceTravelSiteDefs";

export default function TravelTab({ globalSettings, setGlobalSettings, isLocked, onRefreshFuel, refreshingFuel }) {
  const setSetting = (k, v) => setGlobalSettings(prev => ({ ...prev, [k]: v }));
  return (
    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-slate-700" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">Travel</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Shop starting location and travel cost parameters. Fuel price auto-updates daily.
            </CardDescription>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded-md">
            {maintenanceTravelDefs.length} settings
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-6 pb-6">
        {maintenanceTravelDefs.map(def => {
          const isFuel = def.name === "maintenance_gasoline_price_per_gallon" || def.name === "maintenance_diesel_price_per_gallon";
          return (
            <SettingInput
              key={def.name}
              def={def}
              value={globalSettings[def.name]}
              onChange={setSetting}
              isLocked={isLocked}
              isFuel={isFuel}
              onRefreshFuel={isFuel ? onRefreshFuel : undefined}
              refreshingFuel={refreshingFuel}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}