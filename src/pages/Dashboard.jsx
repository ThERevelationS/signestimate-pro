
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Paintbrush, ArrowRight, Zap, Router, Wrench, ServerOff, Anchor, Server } from "lucide-react";
import { ModuleStatus } from "@/entities/all";

export default function Dashboard() {
  const [moduleStatuses, setModuleStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const statuses = await ModuleStatus.list();
        const statusMap = statuses.reduce((acc, curr) => {
          acc[curr.module_name] = curr.is_enabled;
          return acc;
        }, {});
        setModuleStatuses(statusMap);
      } catch (error) {
        console.error("Failed to load module statuses:", error);
      }
      setIsLoading(false);
    };
    fetchStatuses();
  }, []);

  const renderModuleCard = (moduleName, title, description, icon, color, page) => {
    const isEnabled = moduleStatuses[moduleName];
    const Icon = icon;

    if (isLoading) {
      return (
        <Card className="bg-white border-0 shadow-lg animate-pulse">
          <CardHeader><div className="h-8 bg-slate-200 rounded w-3/4"></div></CardHeader>
          <CardContent><div className="h-4 bg-slate-200 rounded w-full"></div></CardContent>
        </Card>
      );
    }
    
    if (isEnabled) {
      return (
        <Link to={createPageUrl(page)}>
          <Card className={`bg-white border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`p-4 bg-${color}-100 rounded-xl`}>
                  <Icon className={`w-8 h-8 text-${color}-600`} />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-slate-900">{title}</CardTitle>
                  <p className="text-slate-500">{description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center text-${color}-600 font-medium`}>
                <span>Start New Estimate</span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      );
    }

    return (
       <Card className="bg-slate-100 border border-slate-200 shadow-sm opacity-70">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-4 bg-slate-200 rounded-xl">
                <ServerOff className="w-8 h-8 text-slate-500" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-600">{title}</CardTitle>
                <p className="text-slate-500">{description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500 font-medium">This module is disabled for maintenance.</p>
          </CardContent>
        </Card>
    )
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Estimator Modules</h1>
          <p className="text-lg text-slate-600">Select a module to begin creating an estimate.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {renderModuleCard("painting", "Painting Estimator", "For dimensional letters & panels", Paintbrush, "blue", "NewPaintEstimate")}
          {renderModuleCard("laser", "CO2 Laser Estimator", "For cutting & engraving", Zap, "purple", "NewLaserEstimate")}
          {renderModuleCard("cnc", "CNC Router Estimator", "For routing & carving", Router, "green", "NewCNCEstimate")}
          {renderModuleCard("metal_fabrication", "Metal Fabrication Estimator", "For aluminum & steel signs", Wrench, "orange", "NewMetalEstimate")}
          {renderModuleCard("channel_letter_installation", "Channel Letter Install", "For raceway & mounted letters", Wrench, "purple", "NewChannelLetterInstallation")}
          {renderModuleCard("foundation", "Foundation Estimator", "For sign foundations & concrete work", Anchor, "amber", "NewFoundationEstimate")}
          {renderModuleCard("brick_stone", "Brick & Stone Estimator", "For sign base materials", Server, "rose", "NewBrickStoneEstimate")}
        </div>
      </div>
    </div>
  );
}
