import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Package, HardHat, Box, Droplets } from "lucide-react";
import MaterialsInventoryTab from "../components/channelLetterInstall/MaterialsInventoryTab";
import EquipmentInventoryTab from "../components/channelLetterInstall/EquipmentInventoryTab";
import DimensionalMaterialsTab from "../components/channelLetterInstall/DimensionalMaterialsTab";
import VinylInventoryTab from "@/components/vinylInventory/VinylInventoryTab";

export default function ChannelLetterInstallInventoryPage() {
  const [tab, setTab] = useState("materials");

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-600" />
              Installation Inventory
            </h1>
            <p className="text-slate-600">Materials, equipment & substrates for channel letter installs</p>
          </div>
          <Link to={createPageUrl("NewChannelLetterInstallation")}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Estimate
            </Button>
          </Link>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-3xl mb-4">
            <TabsTrigger value="materials" className="gap-2">
              <Package className="w-4 h-4" /> Install Materials
            </TabsTrigger>
            <TabsTrigger value="equipment" className="gap-2">
              <HardHat className="w-4 h-4" /> Equipment
            </TabsTrigger>
            <TabsTrigger value="dimensional" className="gap-2">
              <Box className="w-4 h-4" /> Substrates
            </TabsTrigger>
            <TabsTrigger value="vinyl" className="gap-2">
              <Droplets className="w-4 h-4" /> Vinyl
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <MaterialsInventoryTab />
          </TabsContent>
          <TabsContent value="equipment">
            <EquipmentInventoryTab />
          </TabsContent>
          <TabsContent value="dimensional">
            <DimensionalMaterialsTab />
          </TabsContent>
          <TabsContent value="vinyl">
            <VinylInventoryTab scope="channel_letters" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}