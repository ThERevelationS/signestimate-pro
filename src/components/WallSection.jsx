import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import WallShapeBuilder from './WallShapeBuilder';

const MORTAR_GAP_OPTIONS = [
  { label: '1/4" (thin joint)', value: 0.25 },
  { label: '3/8" (standard)', value: 0.375 },
  { label: '1/2"', value: 0.5 },
  { label: '5/8"', value: 0.625 },
  { label: '3/4"', value: 0.75 },
];

const OFFSET_OPTIONS = [
  { label: 'No offset (stacked bond)', value: 0 },
  { label: '1/4 offset', value: 0.25 },
  { label: '1/3 offset (third bond)', value: 0.333 },
  { label: '1/2 offset (running bond)', value: 0.5 },
];

function calcWallCosts({ wallShape, wallMaterial, wallHeightInches, mortarGapInches, settings }) {
  if (!wallShape || !wallMaterial || !wallShape.segments) return null;

  const isConcrete = wallMaterial.wall_material_subtype === 'concrete';
  const unitL = wallMaterial.wall_unit_length_inches || 8;
  const unitW = wallMaterial.wall_unit_width_inches || 4;
  const unitH = wallMaterial.wall_unit_height_inches || 2.25;
  const mortar = isConcrete ? 0 : mortarGapInches;
  const courseH = unitH + mortar;
  const numCourses = Math.floor(wallHeightInches / courseH);
  const brickPitch = unitL + (isConcrete ? 0 : mortar);

  // Total linear inches of wall (perimeter)
  const totalLinearInches = wallShape.segments.reduce((s, seg) => s + seg.length, 0);

  // Count bricks: courses * bricks per course per linear foot
  const bricksPerCoursePerLinearInch = 1 / brickPitch;
  const totalBricks = Math.ceil(numCourses * totalLinearInches * bricksPerCoursePerLinearInch);

  const materialCost = totalBricks * (wallMaterial.cost_per_unit || 0);

  const surfaceAreaSqFtSingleSide = (totalLinearInches * wallHeightInches) / 144;

  // Mortar cost
  let mortarCost = 0;
  if (!isConcrete) {
    // Surface area of all faces: inner + outer side (2 sides * length * height)
    const surfaceAreaSqFtMortar = surfaceAreaSqFtSingleSide * 2;
    const mortarCostPerSqFt = parseFloat(settings?.wall_mortar_cost_per_sqft || 0.35);
    mortarCost = surfaceAreaSqFtMortar * mortarCostPerSqFt;
  }

  // Labor: Cost per sqft (Wall Masonry Labor Rate)
  const laborRatePerSqFt = parseFloat(settings?.wall_labor_rate || 45);
  const minCharge = parseFloat(settings?.wall_minimum_charge || 150);
  
  let rawLaborCost = surfaceAreaSqFtSingleSide * laborRatePerSqFt;
  let laborCost = rawLaborCost;
  if (laborCost < minCharge) {
    laborCost = minCharge;
  }
  
  // Approximate labor hours based on bricks per hour (cinderblock/filler units) for reference
  const laborHours = totalBricks / (parseFloat(settings?.wall_labor_bricks_per_hour || 50));

  return {
    totalBricks,
    materialCost,
    mortarCost,
    laborHours,
    laborCost,
    totalCost: materialCost + mortarCost + laborCost,
    totalLinearInches,
    numCourses,
  };
}

export default function WallSection({
  wall,
  index,
  walls = [],
  wallMaterials,
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
  const costs = calcWallCosts({
    wallShape: wall.shape,
    wallMaterial: wall.selectedMaterial,
    wallHeightInches: wall.heightInches || 24,
    mortarGapInches: wall.mortarGapInches || 0.375,
    settings,
  });

  const selectedMat = wallMaterials.find(m => m.id === wall.materialId);

  useEffect(() => {
    if (selectedMat && selectedMat.id !== wall.selectedMaterial?.id) {
      update('selectedMaterial', selectedMat);
    }
  }, [wall.materialId, wallMaterials]);

  useEffect(() => {
    if (costs) {
      onChange({ ...wall, calculatedCosts: costs });
    }
  }, [
    wall.shape?.segments?.length,
    wall.materialId,
    wall.heightInches,
    wall.mortarGapInches,
    wall.offsetFraction,
  ]);

  return (
    <Card className="border border-orange-200 shadow-sm overflow-hidden mb-4">
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

          {/* Mortar/offset - hide for concrete */}
          {!isConcrete && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Grout/Mortar Gap</Label>
                <Select
                  value={String(wall.mortarGapInches || 0.375)}
                  onValueChange={v => update('mortarGapInches', parseFloat(v))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MORTAR_GAP_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Brick/Stone Offset</Label>
                <Select
                  value={String(wall.offsetFraction ?? 0.5)}
                  onValueChange={v => update('offsetFraction', parseFloat(v))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFSET_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedMat && (
                <div className="flex items-end pb-1">
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
            </div>
          )}

          {/* Foundation restriction notice */}
          {!wall.useExistingFoundation && foundationItems.length === 0 && (
            <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ No foundations available. Check "Use Existing Foundation" or add a foundation item above to constrain the wall drawing.
            </div>
          )}

          {/* Shape builder */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-2 block">Wall Outline (Top-Down View)</Label>
            <WallShapeBuilder
              foundationItems={foundationItems}
              useExistingFoundation={wall.useExistingFoundation}
              otherWalls={walls.filter((_, i) => i !== index)}
              wallMaterial={selectedMat}
              onShapeChange={shape => update('shape', shape)}
              onFoundationUpdate={onFoundationUpdate}
              initialShape={wall.shape}
              onRequireMaterial={() => {
                setShakeMaterial(true);
                setTimeout(() => setShakeMaterial(false), 800);
              }}
            />
          </div>

          {/* Cost summary */}
          {costs && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
              <div>
                <p className="text-xs text-emerald-700/70">Units Needed</p>
                <p className="font-semibold text-emerald-900">{costs.totalBricks}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700/70">Material Cost</p>
                <p className="font-semibold text-emerald-900">${costs.materialCost.toFixed(2)}</p>
              </div>
              {!isConcrete && (
                <div>
                  <p className="text-xs text-emerald-700/70">Mortar Cost</p>
                  <p className="font-semibold text-emerald-900">${costs.mortarCost.toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-emerald-700/70">Labor Cost ({costs.laborHours.toFixed(1)} hrs)</p>
                <p className="font-semibold text-emerald-900">${costs.laborCost.toFixed(2)}</p>
              </div>
              <div className="col-span-2 md:col-span-4 border-t border-emerald-200/50 pt-2">
                <p className="text-xs text-emerald-700/70">Wall Total</p>
                <p className="text-base font-bold text-emerald-700">${costs.totalCost.toFixed(2)}</p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}