import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, ServerOff, Layers, Plus } from "lucide-react";
import { MODULES } from "@/components/modulesRegistry";
import { useAuth } from "@/lib/AuthContext";

// CoreBridge-style Sales Home: dense estimator launcher organized as a table.
export default function Dashboard() {
  const { moduleStatusesLoaded, hasModulePermission } = useAuth();
  const isLoading = !moduleStatusesLoaded;

  const modules = MODULES.map((m) => ({
    name: m.key,
    title: m.name,
    description: m.description,
    icon: m.icon,
    page: m.newEstimatePage,
  }));
  const visibleModules = modules.filter((m) => hasModulePermission(m.name));

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-[1100px] mx-auto bg-white border border-slate-300 rounded-sm shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-base font-bold text-lime-700 uppercase tracking-wide">Sales Home</h1>
          <Link to={createPageUrl("NewAllInOneEstimate")}>
            <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-sm h-8">
              <Plus className="w-4 h-4 mr-1" /> New All-In-One Estimate
            </Button>
          </Link>
        </div>

        {/* Featured: All-In-One estimator */}
        <Link to={createPageUrl("NewAllInOneEstimate")}
          className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-lime-50/60 hover:bg-lime-100/60 transition-colors group">
          <div className="w-9 h-9 rounded-sm bg-lime-600 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm">All-In-One Estimator</p>
            <p className="text-xs text-slate-500">One estimate, one customer, every module — with products, pricing and a customer quote.</p>
          </div>
          <span className="text-lime-700 text-sm font-semibold flex items-center gap-1">
            Start <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        <div className="px-4 py-1.5 bg-slate-100 border-b border-slate-300 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Estimator Modules
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-100 rounded-sm animate-pulse" />)}
          </div>
        ) : visibleModules.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <ServerOff className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p>No modules are currently available for you. Contact your administrator.</p>
          </div>
        ) : (
          <div>
            {visibleModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.name} to={createPageUrl(module.page)}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0 hover:bg-lime-50/60 transition-colors group">
                  <div className="w-8 h-8 rounded-sm bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{module.title}</p>
                    <p className="text-xs text-slate-500 truncate">{module.description}</p>
                  </div>
                  <span className="text-slate-500 group-hover:text-lime-700 text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
                    New Estimate <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}