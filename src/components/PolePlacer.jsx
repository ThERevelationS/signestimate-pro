import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Move, Crosshair, AlignCenterHorizontal, AlignCenterVertical, AlignCenter } from 'lucide-react';

const SCALE_PX_PER_INCH = 4;

export default function PolePlacer({
  polesData = [],
  polesInventory = [],
  foundationItems = [],
  onChange
}) {
  const canvasRef = useRef(null);
  const [selectedPoleId, setSelectedPoleId] = useState('');
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [mode, setMode] = useState('place'); // 'place' or 'pan'
  const [selectedPlacedIdx, setSelectedPlacedIdx] = useState(null);

  const canvasW = 700;
  const canvasH = 450;

  const fRects = React.useMemo(() => {
    let cumulativeOffsetX = 0;
    const rects = [];
    foundationItems.forEach((item, itemIdx) => {
      const qty = item.quantity || 1;
      const gridSize = Math.ceil(Math.sqrt(qty));
      const isSpread = item.foundation_type !== 'pillar';
      const lenFt = (item.length_inches || 48) / 12;
      const widFt = (item.width_inches || 48) / 12;
      const diaFt = (item.diameter || 24) / 12;
      const footprintX = isSpread ? lenFt : diaFt;
      const footprintZ = isSpread ? widFt : diaFt;
      const spacingX = footprintX * 1.5 + 1;
      const spacingZ = footprintZ * 1.5 + 1;

      const userOffsetX = (item.offset_x_inches || 0) / 12;
      const userOffsetZ = (item.offset_z_inches || 0) / 12;

      for (let i = 0; i < qty; i++) {
        const col = i % gridSize;
        const row = Math.floor(i / gridSize);
        const ox = userOffsetX + cumulativeOffsetX + col * spacingX + footprintX / 2;
        const oz = userOffsetZ + row * spacingZ + footprintZ / 2;
        
        rects.push({
            itemIdx,
            minX: (ox - footprintX/2) * 12,
            maxX: (ox + footprintX/2) * 12,
            minY: (oz - footprintZ/2) * 12,
            maxY: (oz + footprintZ/2) * 12,
            cx: ox * 12,
            cz: oz * 12
        });
      }
      cumulativeOffsetX += gridSize * spacingX + 2;
    });
    return rects;
  }, [foundationItems]);

  const toCanvas = useCallback((x, z) => ({
    x: x * SCALE_PX_PER_INCH + offset.x,
    y: z * SCALE_PX_PER_INCH + offset.y,
  }), [offset]);

  const fromCanvas = useCallback((rawX, rawY) => {
    return {
      x: (rawX - offset.x) / SCALE_PX_PER_INCH,
      z: (rawY - offset.y) / SCALE_PX_PER_INCH,
    };
  }, [offset]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    const gridPx = 12 * SCALE_PX_PER_INCH;
    const startX = ((offset.x % gridPx) + gridPx) % gridPx;
    const startY = ((offset.y % gridPx) + gridPx) % gridPx;
    for (let x = startX; x < canvasW; x += gridPx) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke();
    }
    for (let y = startY; y < canvasH; y += gridPx) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke();
    }

    // Foundations
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.fillStyle = 'rgba(245,158,11,0.07)';
    fRects.forEach((r, i) => {
      const topLeft = toCanvas(r.minX, r.minY);
      const w = (r.maxX - r.minX) * SCALE_PX_PER_INCH;
      const h = (r.maxY - r.minY) * SCALE_PX_PER_INCH;
      ctx.strokeRect(topLeft.x, topLeft.y, w, h);
      ctx.fillRect(topLeft.x, topLeft.y, w, h);
    });
    ctx.setLineDash([]);

    // Poles
    polesData.forEach((p, idx) => {
      const cp = toCanvas(p.x_inches, p.z_inches);
      const inv = polesInventory.find(i => i.id === p.pole_id);
      const isSelected = selectedPlacedIdx === idx;
      
      let pw = (inv?.pole_width_inches || 6) * SCALE_PX_PER_INCH;
      let pd = (inv?.pole_depth_inches || 6) * SCALE_PX_PER_INCH;

      ctx.fillStyle = isSelected ? '#ef4444' : '#3b82f6';
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = isSelected ? 3 : 1.5;

      if (inv?.pole_shape === 'round') {
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, pw / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
      } else {
          ctx.fillRect(cp.x - pw/2, cp.y - pd/2, pw, pd);
          ctx.strokeRect(cp.x - pw/2, cp.y - pd/2, pw, pd);
      }

      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.fillText(`P${idx+1}`, cp.x - 6, cp.y + 4);
    });

  }, [offset, fRects, polesData, polesInventory, selectedPlacedIdx, toCanvas]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    if (mode === 'pan') {
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const { x, z } = fromCanvas(rawX, rawY);

    // Check if clicked existing pole
    let clickedIdx = -1;
    for (let i = polesData.length - 1; i >= 0; i--) {
        const p = polesData[i];
        const dist = Math.sqrt((p.x_inches - x)**2 + (p.z_inches - z)**2);
        if (dist < 10) {
            clickedIdx = i;
            break;
        }
    }

    if (clickedIdx !== -1) {
        setSelectedPlacedIdx(clickedIdx);
        return;
    }

    // Place new pole if one is selected in dropdown
    if (selectedPoleId) {
        // Find which foundation it falls in, to set default constraints
        const fRect = fRects.find(r => x >= r.minX && x <= r.maxX && z >= r.minY && z <= r.maxY);
        const fIdx = fRect ? fRect.itemIdx : 0;
        const fItem = foundationItems[fIdx] || {};

        const defHeight = (fItem.depth_inches || 36) + 48; // default some height above

        const newPole = {
            id: Date.now() + Math.random(),
            pole_id: selectedPoleId,
            x_inches: x,
            z_inches: z,
            height_inches: defHeight,
            y_offset_inches: 0,
            foundation_idx: fIdx,
            paint: false
        };
        onChange([...polesData, newPole]);
        setSelectedPlacedIdx(polesData.length); // will be the new one
    }
  };

  const handleMouseMove = (e) => {
    if (panning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setPanning(false);
    setPanStart(null);
  };

  const updateSelected = (field, value) => {
      if (selectedPlacedIdx === null) return;
      const arr = [...polesData];
      arr[selectedPlacedIdx] = { ...arr[selectedPlacedIdx], [field]: value };

      // Constraints
      const p = arr[selectedPlacedIdx];
      const fItem = foundationItems[p.foundation_idx] || {};
      const maxDepth = fItem.depth_inches || 36;
      
      // Don't allow pole bottom to go below foundation bottom (y_offset is from top of foundation downwards usually?)
      // Wait, let's define y_offset_inches: 0 = top of foundation. positive = downwards into foundation.
      // So max y_offset is maxDepth.
      if (p.y_offset_inches > maxDepth) p.y_offset_inches = maxDepth;
      if (p.y_offset_inches < 0) p.y_offset_inches = 0; // cannot float above

      onChange(arr);
  };

  const centerSelected = (axis) => {
      if (selectedPlacedIdx === null) return;
      const p = polesData[selectedPlacedIdx];
      const fRectsForIdx = fRects.filter(r => r.itemIdx === p.foundation_idx);
      
      // Find the closest fRect to current position
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

  const selectedPole = selectedPlacedIdx !== null ? polesData[selectedPlacedIdx] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <Label className="text-xs">Select Pole from Inventory to Place</Label>
          <Select value={selectedPoleId} onValueChange={setSelectedPoleId}>
            <SelectTrigger className="w-[250px] h-9 mt-1">
              <SelectValue placeholder="Choose a pole..." />
            </SelectTrigger>
            <SelectContent>
              {polesInventory.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.material_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
            <Button size="sm" variant={mode === 'place' ? 'default' : 'outline'} onClick={() => setMode('place')}>
                <Crosshair className="w-4 h-4 mr-1" /> Place/Select
            </Button>
            <Button size="sm" variant={mode === 'pan' ? 'default' : 'outline'} onClick={() => setMode('pan')}>
                <Move className="w-4 h-4 mr-1" /> Pan View
            </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white" style={{ width: canvasW, maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          style={{ cursor: mode === 'pan' ? 'grab' : (selectedPoleId ? 'crosshair' : 'default'), display: 'block', maxWidth: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {selectedPole && (
        <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-blue-900">Edit Selected Pole (P{selectedPlacedIdx + 1})</h3>
                    <Button size="sm" variant="destructive" onClick={() => {
                        onChange(polesData.filter((_, i) => i !== selectedPlacedIdx));
                        setSelectedPlacedIdx(null);
                    }}>
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                    </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <Label className="text-xs">Height (in)</Label>
                        <Input type="number" className="h-8" value={selectedPole.height_inches} onChange={e => updateSelected('height_inches', parseFloat(e.target.value) || 0)} />
                        <span className="text-[10px] text-slate-500">Total length of pole</span>
                    </div>
                    <div>
                        <Label className="text-xs">Depth in Foundation (in)</Label>
                        <Input type="number" className="h-8" value={selectedPole.y_offset_inches} onChange={e => updateSelected('y_offset_inches', parseFloat(e.target.value) || 0)} />
                        <span className="text-[10px] text-slate-500">Distance from top of foundation</span>
                    </div>
                    <div>
                        <Label className="text-xs">X Position (in)</Label>
                        <Input type="number" className="h-8" value={Math.round(selectedPole.x_inches)} onChange={e => updateSelected('x_inches', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                        <Label className="text-xs">Y Position (in)</Label>
                        <Input type="number" className="h-8" value={Math.round(selectedPole.z_inches)} onChange={e => updateSelected('z_inches', parseFloat(e.target.value) || 0)} />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => centerSelected('both')} title="Center on nearest foundation">
                        <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => centerSelected('x')} title="Center Horizontally (X)">
                        <AlignCenterHorizontal className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => centerSelected('z')} title="Center Vertically (Y)">
                        <AlignCenterVertical className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}