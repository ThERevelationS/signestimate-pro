import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, AlignCenter, AlignCenterHorizontal, AlignCenterVertical, Crosshair, Plus } from 'lucide-react';
import SharedCanvas from './SharedCanvas';

export default function PolePlacer({
  polesData = [],
  polesInventory = [],
  foundationItems = [],
  onChange
}) {
  const [selectedPoleId, setSelectedPoleId] = useState('');
  const [selectedPlacedIdx, setSelectedPlacedIdx] = useState(null);

  const updateSelected = (field, value) => {
      if (selectedPlacedIdx === null) return;
      const arr = [...polesData];
      arr[selectedPlacedIdx] = { ...arr[selectedPlacedIdx], [field]: value };
      const p = arr[selectedPlacedIdx];
      const fItem = foundationItems[p.foundation_idx] || {};
      const maxDepth = fItem.depth_inches || 36;
      if (p.y_offset_inches > maxDepth) p.y_offset_inches = maxDepth;
      if (p.y_offset_inches < 0) p.y_offset_inches = 0; 
      onChange(arr);
  };

  const centerSelected = (axis) => {
      if (selectedPlacedIdx === null) return;
      const p = polesData[selectedPlacedIdx];
      
      let cumulativeOffsetX = 0;
      const fRectsForIdx = [];
      foundationItems.forEach((item, itemIdx) => {
        const qty = item.quantity || 1;
        const gridSize = Math.ceil(Math.sqrt(qty));
        const isSpread = item.foundation_type !== 'pillar';
        const footprintX = isSpread ? (item.length_inches || 48) / 12 : (item.diameter || 24) / 12;
        const footprintZ = isSpread ? (item.width_inches || 48) / 12 : (item.diameter || 24) / 12;
        const spacingX = footprintX * 1.5 + 1;
        const spacingZ = footprintZ * 1.5 + 1;
        const userOffsetX = (item.offset_x_inches || 0) / 12;
        const userOffsetZ = (item.offset_z_inches || 0) / 12;
        for (let i = 0; i < qty; i++) {
          if (itemIdx === p.foundation_idx) {
            const col = i % gridSize;
            const row = Math.floor(i / gridSize);
            const ox = cumulativeOffsetX + col * spacingX + footprintX / 2 + userOffsetX;
            const oz = row * spacingZ + footprintZ / 2 + userOffsetZ;
            fRectsForIdx.push({ cx: ox * 12, cz: oz * 12 });
          }
        }
        cumulativeOffsetX += gridSize * spacingX + 2;
      });

      let closest = fRectsForIdx[0];
      let minDist = Infinity;
      fRectsForIdx.forEach(r => {
          const d = Math.sqrt((r.cx - p.x_inches)**2 + (r.cz - p.z_inches)**2);
          if (d < minDist) { minDist = d; closest = r; }
      });

      if (!closest) return;

      const arr = [...polesData];
      if (axis === 'both' || axis === 'x') arr[selectedPlacedIdx].x_inches = closest.cx;
      if (axis === 'both' || axis === 'z') arr[selectedPlacedIdx].z_inches = closest.cz;
      onChange(arr);
  };

  const handleAddPole = () => {
    if (!selectedPoleId) return;
    const fIdx = 0;
    const fItem = foundationItems[fIdx] || {};
    const defHeight = (fItem.depth_inches || 36) + 48; 
    const newPole = {
        id: Date.now() + Math.random(),
        pole_id: selectedPoleId,
        x_inches: 0,
        z_inches: 0,
        height_inches: defHeight,
        y_offset_inches: 0,
        foundation_idx: fIdx,
        paint: false
    };
    onChange([...polesData, newPole]);
    setSelectedPlacedIdx(polesData.length);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left: Canvas */}
      <div className="flex-1 space-y-4">
        <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 flex items-end justify-between flex-wrap gap-4 shadow-sm mb-2">
          <div>
            <Label className="text-xs font-semibold text-blue-900">Select Pole from Inventory to Place</Label>
            <div className="flex gap-2 items-center mt-1">
              <Select value={selectedPoleId} onValueChange={setSelectedPoleId}>
                <SelectTrigger className="w-[250px] h-9 bg-white">
                  <SelectValue placeholder="Choose a pole..." />
                </SelectTrigger>
                <SelectContent>
                  {polesInventory.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.material_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddPole} disabled={!selectedPoleId}><Plus className="w-4 h-4 mr-1"/> Add Pole</Button>
            </div>
          </div>
        </div>

        <SharedCanvas
          toolType="pole"
          foundationItems={foundationItems}
          polesData={polesData}
          polesInventory={polesInventory}
          selectedPoleId={selectedPoleId}
          onChangePoles={onChange}
          selectedPlacedIdx={selectedPlacedIdx}
          setSelectedPlacedIdx={setSelectedPlacedIdx}
        />
      </div>

      {/* Right: List of Poles */}
      <div className="w-full lg:w-[350px] space-y-3">
        <h3 className="font-semibold text-slate-800">Poles List</h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {polesData.length === 0 && (
            <p className="text-sm text-slate-500 italic">No poles added yet. Select a pole and click "Add Pole" or place it on the canvas.</p>
          )}
          {polesData.map((pole, idx) => {
            const isSelected = selectedPlacedIdx === idx;
            return (
              <Card key={pole.id || idx} className={`border ${isSelected ? 'border-red-400 bg-red-50/20' : 'border-slate-200'} cursor-pointer`} onClick={() => setSelectedPlacedIdx(idx)}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">Pole {idx + 1}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={(e) => {
                        e.stopPropagation();
                        onChange(polesData.filter((_, i) => i !== idx));
                        if (selectedPlacedIdx === idx) setSelectedPlacedIdx(null);
                        else if (selectedPlacedIdx > idx) setSelectedPlacedIdx(selectedPlacedIdx - 1);
                    }}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {isSelected && (
                    <div className="space-y-3" onClick={e => e.stopPropagation()}>
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-semibold">Applied to Foundation</Label>
                        <Select 
                          value={String(pole.foundation_idx)} 
                          onValueChange={v => updateSelected('foundation_idx', parseInt(v))}
                        >
                          <SelectTrigger className="h-7 text-xs mt-1 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {foundationItems.map((f, fIdx) => (
                              <SelectItem key={fIdx} value={String(fIdx)}>
                                Foundation {fIdx + 1} {f.description ? `(${f.description})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                          <div>
                              <Label className="text-[10px] text-slate-500">Height (in)</Label>
                              <Input type="number" className="h-7 text-xs" value={pole.height_inches} onChange={e => updateSelected('height_inches', parseFloat(e.target.value) || 0)} />
                          </div>
                          <div>
                              <Label className="text-[10px] text-slate-500">Depth in Found (in)</Label>
                              <Input type="number" className="h-7 text-xs" value={pole.y_offset_inches} onChange={e => updateSelected('y_offset_inches', parseFloat(e.target.value) || 0)} />
                          </div>
                          <div>
                              <Label className="text-[10px] text-slate-500">X Position (in)</Label>
                              <Input type="number" className="h-7 text-xs" value={Math.round(pole.x_inches)} onChange={e => updateSelected('x_inches', parseFloat(e.target.value) || 0)} />
                          </div>
                          <div>
                              <Label className="text-[10px] text-slate-500">Z Position (in)</Label>
                              <Input type="number" className="h-7 text-xs" value={Math.round(pole.z_inches)} onChange={e => updateSelected('z_inches', parseFloat(e.target.value) || 0)} />
                          </div>
                      </div>

                      <div className="flex gap-1 pt-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => centerSelected('both')} title="Center">
                              <AlignCenter className="w-3 h-3 mr-1" /> Center
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => centerSelected('x')} title="Center X">
                              <AlignCenterHorizontal className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => centerSelected('z')} title="Center Z">
                              <AlignCenterVertical className="w-3 h-3" />
                          </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}