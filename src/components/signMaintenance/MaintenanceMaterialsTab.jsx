// Sign Maintenance — Maintenance Materials tab.
// Reuses the same ChannelLetterInstallInventory entity used by the Channel
// Letter estimator's "Install Materials". The show_in_maintenance_materials
// flag on each item (toggled from Master Inventory) controls whether it
// appears in maintenance estimates. The editing UI itself is identical.

import React from "react";
import MaterialsInventoryTab from "@/components/channelLetterInstall/MaterialsInventoryTab";

export default function MaintenanceMaterialsTab() {
  return <MaterialsInventoryTab />;
}