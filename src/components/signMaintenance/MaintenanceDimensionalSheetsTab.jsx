// Sign Maintenance — Dimensional Sheets tab.
// Reuses the same DimensionalLetterMaterial entity used by the Channel Letter
// estimator. Visibility in each estimator is controlled by the show_in_* flags
// on the entity (toggled from Master Inventory).
//
// This tab simply re-renders the same UX the Channel Letter Install Inventory
// page uses for "Dimensional Sheets", so the two experiences stay 1:1.

import React from "react";
import DimensionalMaterialsTab from "@/components/channelLetterInstall/DimensionalMaterialsTab";

export default function MaintenanceDimensionalSheetsTab() {
  return <DimensionalMaterialsTab />;
}