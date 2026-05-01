import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Paintbrush, ArrowRight, Zap, Router, Wrench, ServerOff, Anchor, Server } from "lucide-react";
import { ModuleStatus, User } from "@/entities/all";

export default function Dashboard() {
  const [moduleStatuses, setModuleStatuses] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const [statuses, user] = await Promise.all([
          ModuleStatus.list(),
          User.me()
        ]);
        
        const statusMap = statuses.reduce((acc, curr) => {
          acc[curr.module_name] = curr.is_enabled;
          return acc;
        }, {});
        setModuleStatuses(statusMap);
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load module statuses:", error);
        setCurrentUser(null);
      }
      setIsLoading(false);
    };
    fetchStatuses();
  }, []);

  const hasPermission = (moduleName) => {
    // User-specific override takes precedence over global status
    if (currentUser?.module_permissions && currentUser.module_permissions[moduleName] !== undefined) {
      return currentUser.module_permissions[moduleName];
    }
    return moduleStatuses[moduleName] !== undefined ? moduleStatuses[moduleName] : true;
  };

  const modules = [
    { name: "painting", title: "Painting Estimator", description: "For dimensional letters & panels", icon: Paintbrush, color: "blue", page: "NewPaintEstimate" },
    { name: "laser", title: "Laser Cutting & Engraving", description: "For cutting & engraving", icon: Zap, color: "purple", page: "NewLaserEstimate" },
    { name: "cnc", title: "CNC Router Estimator", description: "For routing & carving", icon: Router, color: "green", page: "NewCNCEstimate" },
    { name: "metal_fabrication", title: "Metal Fabrication Estimator", description: "For aluminum & steel signs", icon: Wrench, color: "orange", page: "NewMetalEstimate" },
    { name: "channel_letter_installation", title: "Channel Letter Install", description: "For raceway & mounted letters", icon: Wrench, color: "purple", page: "NewChannelLetterInstallation" },
    { name: "foundation", title: "Concrete | Masonry | Poles", description: "For sign foundations, concrete, masonry & poles", icon: Anchor, color: "amber", page: "NewFoundationEstimate" }
  ];

  const renderModuleCard = (module) => {
    const isEnabled = hasPermission(module.name);
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
        <Card className={`bg-white border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}>
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

  const visibleModules = modules.filter(m => hasPermission(m.name));

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Estimator Modules</h1>
          <p className="text-lg text-slate-600">Select a module to begin creating an estimate.</p>
        </div>
        {visibleModules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {modules.map(module => renderModuleCard(module))}
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