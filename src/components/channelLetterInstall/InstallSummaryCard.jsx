import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Copy, FileDown } from "lucide-react";

const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

export default function InstallSummaryCard({
  project, onUpdate, onSave, isSaving, isEditing, onCopySummary, onExportCSV
}) {
  return (
    <Card className="bg-white border-0 shadow-sm sticky top-8">
      <CardHeader className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-t-xl">
        <CardTitle className="text-lg">Estimate Summary</CardTitle>
        <p className="text-xs text-purple-100">
          {(project.items || []).length} item{(project.items || []).length !== 1 ? "s" : ""}
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        {/* Cost rollup */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Labor ({(project.labor_hours || 0).toFixed(2)} hrs)</span>
            <span className="font-medium tabular-nums">{fmt(project.labor_cost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Materials</span>
            <span className="font-medium tabular-nums">{fmt(project.total_materials_cost)}</span>
          </div>
          {(project.total_equipment_cost || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">
                Equipment ({(project.selected_equipment || []).length})
              </span>
              <span className="font-medium tabular-nums">{fmt(project.total_equipment_cost)}</span>
            </div>
          )}
          {(project.total_personnel_cost || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">
                Personnel ({(project.personnel || []).length})
              </span>
              <span className="font-medium tabular-nums">{fmt(project.total_personnel_cost)}</span>
            </div>
          )}
          {(project.total_letters_cost || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">
                Letters ({(project.letter_purchases || []).length})
              </span>
              <span className="font-medium tabular-nums">{fmt(project.total_letters_cost)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1.5 mt-1.5">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-semibold tabular-nums">{fmt(project.subtotal)}</span>
          </div>
        </div>

        {/* Markup */}
        <div className="border-t pt-3">
          <Label className="text-xs">Markup %</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              step="0.1"
              value={project.markup_percent ?? 0}
              onFocus={(e) => e.target.select()}
              onChange={(e) => onUpdate({ markup_percent: parseFloat(e.target.value) || 0 })}
              className="h-8 text-sm w-24"
            />
            <span className="text-xs text-slate-500">=</span>
            <span className="text-sm font-medium tabular-nums">{fmt(project.markup_amount)}</span>
          </div>
        </div>

        {/* Total */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-lg px-4 py-3 -mx-1">
          <div className="text-xs text-purple-100 uppercase tracking-wide">Grand Total</div>
          <div className="text-3xl font-bold tabular-nums">{fmt(project.total_cost)}</div>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : isEditing ? "Update Estimate" : "Save Estimate"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onCopySummary} className="h-9 text-xs">
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy
            </Button>
            <Button variant="outline" onClick={onExportCSV} className="h-9 text-xs">
              <FileDown className="w-3.5 h-3.5 mr-1" /> CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}