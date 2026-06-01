import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, ServerOff } from "lucide-react";
import { MODULES } from "@/components/modulesRegistry";
import { useAuth } from "@/lib/AuthContext";

export default function Dashboard() {
  // Auth + module statuses are loaded once by AuthProvider during app bootstrap;
  // this page no longer issues its own User.me() / ModuleStatus.list() calls.
  const { moduleStatusesLoaded, hasModulePermission } = useAuth();
  const isLoading = !moduleStatusesLoaded;

  // Use the same module list as the sidebar (single source of truth).
  const modules = MODULES.map((m) => ({
    name: m.key,
    title: m.name,
    description: m.description,
    icon: m.icon,
    color: m.color,
    page: m.newEstimatePage,
  }));

  const renderModuleCard = (module) => {
    const isEnabled = hasModulePermission(module.name);
    const Icon = module.icon;

    if (isLoading) {
      return (
        <Card key={module.name} className="bg-white border-0 shadow-lg animate-pulse">
          <CardHeader><div className="h-8 bg-slate-200 rounded w-3/4"></div></CardHeader>
          <CardContent><div className="h-4 bg-slate-200 rounded w-full"></div></CardContent>
        </Card>
      );
    }

    if (!isEnabled) {
      return null; // Don't render disabled modules
    }

    return (
      <Link key={module.name} to={createPageUrl(module.page)}>
        <Card className="bg-white border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className={`p-4 bg-${module.color}-100 rounded-xl`}>
                <Icon className={`w-8 h-8 text-${module.color}-600`} />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">{module.title}</CardTitle>
                <p className="text-slate-500">{module.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center text-${module.color}-600 font-medium`}>
              <span>Start New Estimate</span>
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const visibleModules = modules.filter((m) => hasModulePermission(m.name));

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Estimator Modules</h1>
          <p className="text-lg text-slate-600">Select a module to begin creating an estimate.</p>
        </div>
        {visibleModules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {modules.map((module) => renderModuleCard(module))}
          </div>
        ) : (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="py-12 text-center text-slate-500">
              <ServerOff className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No modules are currently available for you. Contact your administrator.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}