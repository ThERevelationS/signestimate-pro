import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';

function calcWallCosts({ wallShape, wallMaterial, internalMaterial, includeInternalWall, wallHeightInches, mortarGapInches, internalMortarGapInches, settings }) {
  if (!wallShape || !wallMaterial || !wallShape.segments) return null;

  const isConcrete = wallMaterial.wall_material_subtype === 'concrete';
  const unitL = wallMaterial.wall_unit_length_inches || 8;
  const unitW = wallMaterial.wall_unit_width_inches || 4;
  const unitH = wallMaterial.wall_unit_height_inches || 2.25;
  const mortar = isConcrete ? 0 : mortarGapInches;
  const courseH = unitH + mortar;
  const numCourses = Math.floor(wallHeightInches / courseH);
  const brickPitch = unitL + (isConcrete ? 0 : mortar);

  const totalLinearInches = wallShape.segments.reduce((s, seg) => s + seg.length, 0);

  const bricksPerCoursePerLinearInch = 1 / brickPitch;
  const totalBricks = Math.ceil(numCourses * totalLinearInches * bricksPerCoursePerLinearInch);

  const materialCost = totalBricks * (wallMaterial.cost_per_unit || 0);

  const surfaceAreaSqFtSingleSide = (totalLinearInches * wallHeightInches) / 144;

  let mortarCost = 0;
  if (!isConcrete) {
    const surfaceAreaSqFtMortar = surfaceAreaSqFtSingleSide * 2;
    const mortarCostPerSqFt = parseFloat(settings?.wall_mortar_cost_per_sqft || 0.35);
    mortarCost = surfaceAreaSqFtMortar * mortarCostPerSqFt;
  }

  const laborRatePerSqFt = parseFloat(settings?.wall_labor_rate || 45);
  const minCharge = parseFloat(settings?.wall_minimum_charge || 150);
  
  let laborCost = surfaceAreaSqFtSingleSide * laborRatePerSqFt;
  if (laborCost < minCharge) {
    laborCost = minCharge;
  }
  
  const laborHours = totalBricks / (parseFloat(settings?.wall_labor_bricks_per_hour || 50));

  // --- Internal Wall Calculation ---
  let internalTotalBricks = 0;
  let internalMaterialCost = 0;
  let internalMortarCost = 0;
  let internalLaborCost = 0;
  let internalLaborHours = 0;
  let internalTotalLinearInches = 0;

  if (includeInternalWall && internalMaterial) {
    const intIsConcrete = internalMaterial.wall_material_subtype === 'concrete';
    const intUnitL = internalMaterial.wall_unit_length_inches || 8;
    const intUnitW = internalMaterial.wall_unit_width_inches || 4;
    const intUnitH = internalMaterial.wall_unit_height_inches || 2.25;
    const intMortar = intIsConcrete ? 0 : (internalMortarGapInches || 0.375);
    const intCourseH = intUnitH + intMortar;
    const intNumCourses = Math.floor(wallHeightInches / intCourseH);
    const intBrickPitch = intUnitL + intMortar;

    // For each segment, inner centerline length is reduced based on both outer and inner widths.
    // The offset of the inner centerline from the drawn line is (unitW/2 + intUnitW/2).
    // For a 90-degree corner, this shifts the intersection by that offset at each end.
    const isClosed = wallShape.closed !== false;
    const lengthReduction = isClosed ? (unitW + intUnitW) : 0; 

    wallShape.segments.forEach(seg => {
      const innerSegLength = Math.max(0, seg.length - lengthReduction);
      internalTotalLinearInches += innerSegLength;

      // "When a fill material is cut count it as a full piece."
      const bricksThisCourse = Math.ceil(innerSegLength / intBrickPitch);
      internalTotalBricks += bricksThisCourse * intNumCourses;
    });

    internalMaterialCost = internalTotalBricks * (internalMaterial.cost_per_unit || 0);
    
    const intSurfaceAreaSqFtSingleSide = (internalTotalLinearInches * wallHeightInches) / 144;
    
    if (!intIsConcrete) {
      const intSurfaceAreaSqFtMortar = intSurfaceAreaSqFtSingleSide * 2;
      const mortarCostPerSqFt = parseFloat(settings?.wall_mortar_cost_per_sqft || 0.35);
      internalMortarCost = intSurfaceAreaSqFtMortar * mortarCostPerSqFt;
    }

    let rawIntLaborCost = intSurfaceAreaSqFtSingleSide * laborRatePerSqFt;
    internalLaborCost = rawIntLaborCost;
    internalLaborHours = internalTotalBricks / (parseFloat(settings?.wall_labor_bricks_per_hour || 50));
  }

  return {
    totalBricks,
    materialCost,
    mortarCost,
    laborHours,
    laborCost,
    totalCost: materialCost + mortarCost + laborCost + internalMaterialCost + internalMortarCost + internalLaborCost,
    totalLinearInches,
    numCourses,
    internalTotalBricks,
    internalMaterialCost,
    internalMortarCost,
    internalLaborCost,
    internalLaborHours
  };
}

export default function WallSection({
  wall,
  index,
  isActive = false,
  onSetActive = () => {},
  walls = [],
  wallMaterials,
  fillMaterials = [],
  foundationItems = [],
  settings,
  onChange,
  onDelete,
  onFoundationUpdate,
}) {
  const [expanded, setExpanded] = useState(true);
  const [shakeMaterial, setShakeMaterial] = useState(false);

  const update = (field, value) => onChange({ ...wall, [field]: value });

  const isConcrete = wall.selectedMaterial?.wall_material_subtype === 'concrete';
  const isInternalConcrete = wall.selectedInternalMaterial?.wall_material_subtype === 'concrete';
  const costs = calcWallCosts({
    wallShape: wall.shape,
    wallMaterial: wall.selectedMaterial,
    internalMaterial: wall.selectedInternalMaterial,
    includeInternalWall: wall.includeInternalWall,
    wallHeightInches: wall.heightInches || 24,
    mortarGapInches: wall.mortarGapInches || 0.375,
    internalMortarGapInches: wall.internalMortarGapInches || 0.375,
    settings,
  });

  const selectedMat = wallMaterials.find(m => m.id === wall.materialId);
  const selectedIntMat = fillMaterials.find(m => m.id === wall.internalMaterialId);

  useEffect(() => {
    if (selectedMat && selectedMat.id !== wall.selectedMaterial?.id) {
      update('selectedMaterial', selectedMat);
    }
  }, [wall.materialId, wallMaterials]);

  useEffect(() => {
    if (selectedIntMat && selectedIntMat.id !== wall.selectedInternalMaterial?.id) {
      update('selectedInternalMaterial', selectedIntMat);
    }
  }, [wall.internalMaterialId, fillMaterials]);

  useEffect(() => {
    if (costs) {
      onChange({ ...wall, calculatedCosts: costs });
    }
  }, [
    wall.shape?.segments?.length,
    wall.materialId,
    wall.internalMaterialId,
    wall.includeInternalWall,
    wall.heightInches,
  ]);

  return (
    <Card 
      className={`border shadow-sm overflow-hidden mb-4 transition-colors ${isActive ? 'border-orange-500 ring-1 ring-orange-500' : 'border-orange-200 cursor-pointer hover:border-orange-300'}`}
      onClick={() => { if (!isActive) onSetActive(); }}
    >
      <CardHeader className="py-3 px-4 bg-orange-50/60 border-b border-orange-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-orange-900">
              Wall #{index + 1}: {wall.name || 'Untitled Wall'}
            </CardTitle>
            {costs && (
              <Badge variant="secondary" className="text-xs">
                {costs.totalBricks} units · ${costs.totalCost.toFixed(2)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setExpanded(s => !s)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-5">
          {/* Basic settings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Wall Name</Label>
              <Input
                className="h-8 text-sm"
                value={wall.name || ''}
                onChange={e => update('name', e.target.value)}
                placeholder="e.g. Front Wall"
              />
            </div>
            <div>
              <Label className="text-xs">Wall Height (inches)</Label>
              <Input
                type="number"
                className="h-8 text-sm"
                value={wall.heightInches || 24}
                onChange={e => update('heightInches', parseFloat(e.target.value) || 24)}
                min={1}
              />
            </div>
            <div>
              <Label className="text-xs">Wall Material</Label>
              <div className={`transition-all duration-300 ${shakeMaterial ? 'ring-2 ring-red-500 ring-offset-2 rounded-md bg-red-50 -mx-1 px-1 scale-105' : ''}`}>
              <Select
                value={wall.materialId || ''}
                onValueChange={v => {
                  const mat = wallMaterials.find(m => m.id === v);
                  onChange({ ...wall, materialId: v, selectedMaterial: mat || null });
                }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {wallMaterials.length === 0 && (
                    <SelectItem value="_none" disabled>No wall materials in inventory</SelectItem>
                  )}
                  {wallMaterials.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.material_name} ({m.wall_material_subtype})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={wall.useExistingFoundation || false}
                  onCheckedChange={v => update('useExistingFoundation', v)}
                  id={`uef-${index}`}
                />
                <Label htmlFor={`uef-${index}`} className="text-xs cursor-pointer">
                  Use Existing Foundation
                </Label>
              </div>
            </div>
          </div>

          {/* Internal Wall Toggle */}
          <div className="pt-2 border-t border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <Checkbox
                checked={wall.includeInternalWall || false}
                onCheckedChange={v => update('includeInternalWall', v)}
                id={`internal-${index}`}
              />
              <Label htmlFor={`internal-${index}`} className="text-sm font-semibold text-orange-900 cursor-pointer">
                Add Internal Wall (Fill Material)
              </Label>
            </div>
            
            {wall.includeInternalWall && (
              <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100 mb-4">
                <div className="w-full">
                  <Label className="text-xs">Internal Wall Material</Label>
                  <Select
                    value={wall.internalMaterialId || ''}
                    onValueChange={v => {
                      const mat = fillMaterials.find(m => m.id === v);
                      onChange({ ...wall, internalMaterialId: v, selectedInternalMaterial: mat || null });
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm bg-white">
                      <SelectValue placeholder="Select fill material" />
                    </SelectTrigger>
                    <SelectContent>
                      {fillMaterials.length === 0 && (
                        <SelectItem value="_none" disabled>No wall fill materials in inventory</SelectItem>
                      )}
                      {fillMaterials.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.material_name} ({m.wall_material_subtype})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Dimensions preview - hide for concrete */}
          {!isConcrete && selectedMat && (
            <div className="flex items-end pb-1 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-slate-300"
                  style={{ backgroundColor: selectedMat.wall_color || '#cc9966' }}
                />
                <span className="text-xs text-slate-600">
                  {selectedMat.wall_unit_length_inches}"L × {selectedMat.wall_unit_width_inches}"W × {selectedMat.wall_unit_height_inches}"H
                </span>
              </div>
            </div>
          )}

          {/* Foundation restriction notice */}
          {!wall.useExistingFoundation && foundationItems.length === 0 && (
            <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ No foundations available. Check "Use Existing Foundation" or add a foundation item above to constrain the wall drawing.
            </div>
          )}

        </CardContent>
      )}
    </Card>
  );
}