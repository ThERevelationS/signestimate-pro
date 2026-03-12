import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import Foundation3DViewer from "@/components/Foundation3DViewer";

export default function FoundationItemCard({
  item,
  index,
  expandedAdvanced,
  toggleAdvanced,
  updateItem,
  removeItem,
  formingMaterials,
  poleInventory,
  project
}) {
  const selectedPole = poleInventory.find(p => p.id === item.selected_pole_id);
  const poleLinFt = (item.pole_total_height_inches || 0) / 12;
  const poleCostPreview = poleLinFt * (selectedPole?.cost_per_unit || 0) * item.quantity;
  const paintCostPreview = item.include_pole_painting
    ? poleLinFt * (selectedPole?.paint_rate_per_linear_ft || 0) * item.quantity
    : 0;

  const poleData = selectedPole && item.pole_total_height_inches > 0 ? {
    shape: selectedPole.pole_shape || 'round',
    widthInches: selectedPole.pole_width_inches || 4,
    totalHeightInches: item.pole_total_height_inches,
    offsetFromBottomInches: item.pole_offset_from_bottom_inches || 0
  } : null;

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
      <div className="flex justify-between items-start">
        <h4 className="font-semibold text-sm">Foundation #{index + 1}</h4>
        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 h-6 w-6">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={item.foundation_type} onValueChange={(value) => updateItem(index, 'foundation_type', value)}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="spread_foot">Spread Foot</SelectItem>
              <SelectItem value="pillar">Pillar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Quantity</Label>
          <Input type="number" min="1" value={item.quantity}
            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
            className="mt-1 h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Input value={item.description}
            onChange={(e) => updateItem(index, 'description', e.target.value)}
            placeholder="Brief desc" className="mt-1 h-8 text-xs" />
        </div>

        {item.foundation_type === 'spread_foot' ? (
          <>
            <div>
              <Label className="text-xs">Length (in)</Label>
              <Input type="number" step="1" value={item.length_inches}
                onChange={(e) => updateItem(index, 'length_inches', parseFloat(e.target.value) || 0)}
                className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Width (in)</Label>
              <Input type="number" step="1" value={item.width_inches}
                onChange={(e) => updateItem(index, 'width_inches', parseFloat(e.target.value) || 0)}
                className="mt-1 h-8 text-xs" />
            </div>
          </>
        ) : (
          <div>
            <Label className="text-xs">Diameter (in)</Label>
            <Input type="number" step="1" value={item.diameter}
              onChange={(e) => updateItem(index, 'diameter', parseFloat(e.target.value) || 0)}
              className="mt-1 h-8 text-xs" />
          </div>
        )}

        <div>
          <Label className="text-xs">Depth (in)</Label>
          <Input type="number" step="1" value={item.depth_inches}
            onChange={(e) => updateItem(index, 'depth_inches', parseFloat(e.target.value) || 0)}
            className="mt-1 h-8 text-xs" />
        </div>

        <div>
          <Label className="text-xs flex items-center gap-1">Grade Offset (in)<span className="text-slate-400 text-[10px]">(±)</span></Label>
          <Input type="number" step="1" value={item.grade_offset_inches || 0}
            onChange={(e) => updateItem(index, 'grade_offset_inches', parseFloat(e.target.value) || 0)}
            className="mt-1 h-8 text-xs" placeholder="0 = at grade" />
          <p className="text-[10px] text-slate-500 mt-0.5">+ above, - below</p>
        </div>
      </div>

      {/* 3D Viewer */}
      <div className="border-t pt-3">
        <div style={{ height: '500px' }} className="rounded-lg overflow-hidden">
          <Foundation3DViewer
            foundationType={item.foundation_type}
            lengthInches={item.length_inches || 12}
            widthInches={item.width_inches || 12}
            depthInches={item.depth_inches || 24}
            diameter={item.diameter || 24}
            rebarSize={item.rebar_size || "#4"}
            rebarSpacingLength={item.rebar_spacing_length || 18}
            rebarSpacingWidth={item.rebar_spacing_width || 18}
            includeRebar={item.include_rebar || false}
            includeForming={item.include_forming || false}
            formingMaterial={item.forming_material_details}
            quantity={item.quantity || 1}
            gradeOffsetInches={item.grade_offset_inches || 0}
            poleData={poleData}
          />
        </div>
        <p className="text-xs text-blue-700 mt-1 text-center">
          {item.foundation_type === 'spread_foot'
            ? `${item.length_inches}" L × ${item.width_inches}" W × ${item.depth_inches}" D`
            : `Ø${item.diameter}" × ${item.depth_inches}" D`}
          {item.quantity > 1 && ` × ${item.quantity} units`}
          {item.grade_offset_inches !== 0 && (
            <span className="ml-2 text-amber-600 font-medium">
              {item.grade_offset_inches > 0 ? '↑' : '↓'} {Math.abs(item.grade_offset_inches)}" grade
            </span>
          )}
          {selectedPole && item.pole_total_height_inches > 0 && (
            <span className="ml-2 text-teal-600 font-medium">
              | Pole: {item.pole_total_height_inches}" ({selectedPole.pole_shape})
            </span>
          )}
        </p>
      </div>

      {/* Forming & Finishing */}
      <div className="border-t pt-3">
        <Label className="text-xs font-semibold mb-2 block">Labor Options</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded border border-blue-200">
            <Label htmlFor={`forming-${index}`} className="text-xs font-medium">Include Forming</Label>
            <Checkbox id={`forming-${index}`} checked={item.include_forming || false}
              onCheckedChange={(checked) => updateItem(index, 'include_forming', checked)}
              className="w-4 h-4 text-blue-600" />
          </div>
          {item.include_forming && (
            <div className="col-span-2">
              <Label className="text-xs">Forming Material</Label>
              <Select value={item.selected_forming_material_id || ""}
                onValueChange={(value) => updateItem(index, 'selected_forming_material_id', value === "default" ? null : value)}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select forming material" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use Default Rate</SelectItem>
                  {formingMaterials
                    .filter(fm => fm.foundation_usage === 'general' || fm.foundation_usage === item.foundation_type)
                    .map(fm => (
                      <SelectItem key={fm.id} value={fm.id}>
                        {fm.material_name} {fm.lumber_size && fm.lumber_size !== 'custom' ? `(${fm.lumber_size})` : ''} - ${fm.cost_per_unit.toFixed(2)}/sqft
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded border border-green-200">
            <Label htmlFor={`finishing-${index}`} className="text-xs font-medium">Include Finishing</Label>
            <Checkbox id={`finishing-${index}`} checked={item.include_finishing || false}
              onCheckedChange={(checked) => updateItem(index, 'include_finishing', checked)}
              className="w-4 h-4 text-green-600" />
          </div>
        </div>
      </div>

      {/* Pole Section */}
      <div className="border-t pt-3">
        <Label className="text-xs font-semibold mb-2 block text-teal-700">Pole (Optional)</Label>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Pole from Inventory</Label>
            <Select value={item.selected_pole_id || ""}
              onValueChange={(v) => updateItem(index, 'selected_pole_id', v === "none" ? null : v)}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="No pole" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Pole</SelectItem>
                {poleInventory.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.material_name} ({p.pole_shape}, {p.pole_width_inches}" {p.pole_shape === 'round' ? 'dia' : 'sq'}) - ${(p.cost_per_unit || 0).toFixed(2)}/ft {p.supplier ? `| ${p.supplier}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {item.selected_pole_id && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Overall Pole Height (in)</Label>
                  <Input type="number" step="1" min="0" value={item.pole_total_height_inches || 0}
                    onChange={(e) => updateItem(index, 'pole_total_height_inches', parseFloat(e.target.value) || 0)}
                    className="mt-1 h-8 text-xs" placeholder="Total height" />
                </div>
                <div>
                  <Label className="text-xs">Offset from Bottom of Hole (in)</Label>
                  <Input type="number" step="1" min="0" value={item.pole_offset_from_bottom_inches || 0}
                    onChange={(e) => updateItem(index, 'pole_offset_from_bottom_inches', parseFloat(e.target.value) || 0)}
                    className="mt-1 h-8 text-xs" placeholder="0 = at bottom" />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-teal-50 rounded border border-teal-200">
                <Label htmlFor={`pole-paint-${index}`} className="text-xs font-medium">
                  Include Painting {selectedPole?.paint_rate_per_linear_ft > 0
                    ? `($${selectedPole.paint_rate_per_linear_ft}/ft)`
                    : '(no rate set in inventory)'}
                </Label>
                <Checkbox id={`pole-paint-${index}`} checked={item.include_pole_painting || false}
                  onCheckedChange={(checked) => updateItem(index, 'include_pole_painting', checked)}
                  disabled={!selectedPole?.paint_rate_per_linear_ft}
                  className="w-4 h-4 text-teal-600" />
              </div>

              <div className="p-2 bg-teal-50 rounded text-xs border border-teal-200">
                <div className="flex justify-between"><span>Pole ({poleLinFt.toFixed(2)} ft × {item.quantity}):</span><span className="font-medium">${poleCostPreview.toFixed(2)}</span></div>
                {item.include_pole_painting && <div className="flex justify-between"><span>Painting:</span><span className="font-medium">${paintCostPreview.toFixed(2)}</span></div>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rebar */}
      {item.foundation_type === 'spread_foot' && (
        <>
          <div className="flex items-center justify-between py-2">
            <Label htmlFor={`rebar-${index}`} className="text-xs font-medium">Include Rebar</Label>
            <Checkbox id={`rebar-${index}`} checked={item.include_rebar || false}
              onCheckedChange={(checked) => updateItem(index, 'include_rebar', checked)}
              className="w-4 h-4 text-blue-600" />
          </div>
          {item.include_rebar && (
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Size</Label>
                  <select value={item.rebar_size || "#4"}
                    onChange={(e) => updateItem(index, 'rebar_size', e.target.value)}
                    className="mt-1 w-full px-2 py-1 border border-blue-200 rounded text-xs">
                    <option value="#3">#3</option>
                    <option value="#4">#4</option>
                    <option value="#5">#5</option>
                    <option value="#6">#6</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Length Sp.</Label>
                  <Input type="number" min="6" value={item.rebar_spacing_length || 18}
                    onChange={(e) => updateItem(index, 'rebar_spacing_length', parseFloat(e.target.value) || 18)}
                    className="mt-1 h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Width Sp.</Label>
                  <Input type="number" min="6" value={item.rebar_spacing_width || 18}
                    onChange={(e) => updateItem(index, 'rebar_spacing_width', parseFloat(e.target.value) || 18)}
                    className="mt-1 h-8 text-xs" />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Advanced Override */}
      <div className="border-t pt-3">
        <Button type="button" variant="outline" size="sm" onClick={() => toggleAdvanced(index)} className="w-full text-xs h-7">
          <span>Cost Override</span>
          {expandedAdvanced[index] ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
        {expandedAdvanced[index] && (
          <div className="mt-2 p-3 bg-amber-50 rounded border border-amber-200">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Concrete ($/cy)</Label>
                <Input type="number" step="1"
                  value={item.custom_concrete_cost_per_cy !== undefined ? item.custom_concrete_cost_per_cy : ''}
                  onChange={(e) => updateItem(index, 'custom_concrete_cost_per_cy', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  className="mt-1 h-8 text-xs" placeholder={`$${project.concrete_cost_per_cy}`} />
              </div>
              <div>
                <Label className="text-xs">Rebar ($/ft)</Label>
                <Input type="number" step="0.05"
                  value={item.custom_rebar_cost_per_ft !== undefined ? item.custom_rebar_cost_per_ft : ''}
                  onChange={(e) => updateItem(index, 'custom_rebar_cost_per_ft', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  className="mt-1 h-8 text-xs" placeholder={`$${project.rebar_cost_per_ft}`} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="p-2 bg-blue-50 rounded text-xs">
        <div className="grid grid-cols-3 gap-1">
          <p><strong>Concrete:</strong> {item.concrete_volume_cy.toFixed(2)} cy</p>
          <p><strong>Excavation:</strong> {item.excavation_volume_cy.toFixed(2)} cy</p>
          {item.include_forming && <p><strong>Form:</strong> {item.forming_hours.toFixed(1)} hrs</p>}
          <p><strong>Pour:</strong> {item.pouring_hours.toFixed(1)} hrs</p>
          {item.include_finishing && <p><strong>Finish:</strong> {item.finishing_hours.toFixed(1)} hrs</p>}
        </div>
      </div>
    </div>
  );
}