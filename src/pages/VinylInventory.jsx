// Dedicated Vinyl Inventory page — sits in the sidebar under Vinyl Estimator.
// Just wraps the shared VinylInventoryTab in master scope.

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Droplets } from "lucide-react";
import { createPageUrl } from "@/utils";
import VinylInventoryTab from "@/components/vinylInventory/VinylInventoryTab.jsx";

export default function VinylInventoryPage() {
  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Droplets className="w-7 h-7 text-blue-600" />
              Vinyl Inventory
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Master catalog of vinyl rolls and laminates used by the Vinyl Estimator and other modules.
            </p>
          </div>
          <Link to={createPageUrl("NewVinylEstimate")}>
            <Button variant="outline" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back to Vinyl Estimator
            </Button>
          </Link>
        </div>

        <VinylInventoryTab scope="master" />
      </div>
    </div>
  );
}