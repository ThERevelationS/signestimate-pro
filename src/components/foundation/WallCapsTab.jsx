import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, RotateCw, MousePointer2, Square } from 'lucide-react';

/**
 * Top-down canvas for placing wall caps on the outer walls.
 * - Only attaches to walls in `walls` array (NOT internal fill walls).
 * - Each cap is positioned by (wall_index, segment_index, position_along_segment_inches).
 * - Drag a cap along a wall to reposition; snap to wall direction.
 * - Full stock price is charged per cap piece (cuts do not reduce price).
 */

// Bounding box of all wall points (in canvas units = inches)
function computeBounds(walls) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  walls.forEach(w => {
    const segs = w.shape?.segments || [];
    segs.forEach(s => {
      [s.p1, s.p2].forEach(p => {
        if (!p) return;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    });
  });
  if (!isFinite(minX)) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  const pad = 24;
  return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad };
}

// World point → SVG screen point
function worldToScreen(p, bounds, viewW, viewH) {
  const sx = (p.x - bounds.minX) / (bounds.maxX - bounds.minX) * viewW;
  const sy = (p.y - bounds.minY) / (bounds.maxY - bounds.minY) * viewH;
  return { x: sx, y: sy };
}

// Screen point → World point
function screenToWorld(s, bounds, viewW, viewH) {
  return {
    x: bounds.minX + (s.x / viewW) * (bounds.maxX - bounds.minX),
    y: bounds.minY + (s.y / viewH) * (bounds.maxY - bounds.minY),
  };
}

// Project a world point onto the closest wall segment.
// Returns { wallIndex, segmentIndex, t (0..1 along segment), distance, angle }
function projectOntoWalls(pt, walls) {
  let best = null;
  walls.forEach((w, wi) => {
    const segs = w.shape?.segments || [];
    segs.forEach((seg, si) => {
      const { p1, p2 } = seg;
      if (!p1 || !p2) return;
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len2 = dx * dx + dy * dy;
      if (len2 < 0.01) return;
      const t = Math.max(0, Math.min(1, ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / len2));
      const proj = { x: p1.x + t * dx, y: p1.y + t * dy };
      const d = Math.hypot(pt.x - proj.x, pt.y - proj.y);
      if (!best || d < best.distance) {
        const segLen = Math.sqrt(len2);
        best = {
          wallIndex: wi, segmentIndex: si, t, distance: d,
          angle: Math.atan2(dy, dx),
          segLen,
          proj
        };
      }
    });
  });
  return best;
}

export default function WallCapsTab({ walls, wallCaps, setWallCaps, capInventory, markDirty }) {
  const svgRef = useRef(null);
  const [viewSize] = useState({ w: 800, h: 520 });
  const [selectedCapInvId, setSelectedCapInvId] = useState(capInventory[0]?.id || '');
  const [tool, setTool] = useState('place'); // 'place' | 'select'
  const [selectedCapIdx, setSelectedCapIdx] = useState(null);
  const [dragging, setDragging] = useState(null); // { idx, dxScreen }

  const hasWalls = walls.some(w => (w.shape?.segments || []).length > 0);
  const bounds = useMemo(() => computeBounds(walls), [walls]);
  const selectedCapInv = capInventory.find(c => c.id === selectedCapInvId);

  const getSvgPoint = (e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleCanvasClick = (e) => {
    if (tool !== 'place') return;
    if (!selectedCapInv) return;
    const sp = getSvgPoint(e);
    if (!sp) return;
    const wp = screenToWorld(sp, bounds, viewSize.w, viewSize.h);
    const projected = projectOntoWalls(wp, walls);
    if (!projected || projected.distance > 60) return; // must click near a wall

    const wallSeg = walls[projected.wallIndex]?.shape?.segments?.[projected.segmentIndex];
    if (!wallSeg) return;

    const posAlong = projected.t * projected.segLen;
    const length = Math.min(selectedCapInv.cap_stock_length_inches || 48, projected.segLen - posAlong);

    const newCap = {
      id: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      cap_inventory_id: selectedCapInv.id,
      wall_index: projected.wallIndex,
      segment_index: projected.segmentIndex,
      position_along_segment_inches: posAlong,
      length_inches: length,
      rotation_offset_degrees: 0,
      lateral_offset_inches: 0,
    };
    setWallCaps([...(wallCaps || []), newCap]);
    setSelectedCapIdx((wallCaps || []).length);
    markDirty();
  };

  const handleCapMouseDown = (e, idx) => {
    e.stopPropagation();
    setSelectedCapIdx(idx);
    if (tool === 'select') {
      const sp = getSvgPoint(e);
      setDragging({ idx, startScreen: sp });
    }
  };

  const handleSvgMouseMove = (e) => {
    if (!dragging) return;
    const sp = getSvgPoint(e);
    if (!sp) return;
    const wp = screenToWorld(sp, bounds, viewSize.w, viewSize.h);
    const projected = projectOntoWalls(wp, walls);
    if (!projected) return;

    const arr = [...wallCaps];
    const cap = { ...arr[dragging.idx] };
    cap.wall_index = projected.wallIndex;
    cap.segment_index = projected.segmentIndex;
    const segLen = projected.segLen;
    const capLen = cap.length_inches || 48;
    // Center the cap on the projected point along the segment
    let pos = projected.t * segLen - capLen / 2;
    pos = Math.max(0, Math.min(segLen - Math.min(capLen, segLen), pos));
    cap.position_along_segment_inches = pos;
    arr[dragging.idx] = cap;
    setWallCaps(arr);
    markDirty();
  };

  const handleSvgMouseUp = () => {
    if (dragging) setDragging(null);
  };

  const deleteCap = (idx) => {
    setWallCaps(wallCaps.filter((_, i) => i !== idx));
    if (selectedCapIdx === idx) setSelectedCapIdx(null);
    markDirty();
  };

  const rotateCap = (idx) => {
    const arr = [...wallCaps];
    arr[idx] = { ...arr[idx], rotation_offset_degrees: ((arr[idx].rotation_offset_degrees || 0) + 90) % 360 };
    setWallCaps(arr);
    markDirty();
  };

  const updateCapLength = (idx, len) => {
    const arr = [...wallCaps];
    arr[idx] = { ...arr[idx], length_inches: Math.max(1, len) };
    setWallCaps(arr);
    markDirty();
  };

  // Render helpers
  const renderWallLines = () => {
    const out = [];
    walls.forEach((w, wi) => {
      const segs = w.shape?.segments || [];
      segs.forEach((seg, si) => {
        if (!seg.p1 || !seg.p2) return;
        const p1 = worldToScreen(seg.p1, bounds, viewSize.w, viewSize.h);
        const p2 = worldToScreen(seg.p2, bounds, viewSize.w, viewSize.h);
        const thicknessIn = (w.selectedMaterial?.wall_unit_width_inches || 8);
        const thicknessPx = (thicknessIn / (bounds.maxX - bounds.minX)) * viewSize.w;
        out.push(
          <line
            key={`wall-${wi}-${si}`}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={w.selectedMaterial?.wall_color || '#94a3b8'}
            strokeWidth={Math.max(8, thicknessPx)}
            strokeLinecap="butt"
            opacity={0.6}
          />
        );
      });
    });
    return out;
  };

  const renderCaps = () => {
    return (wallCaps || []).map((cap, idx) => {
      const wall = walls[cap.wall_index];
      const seg = wall?.shape?.segments?.[cap.segment_index];
      if (!seg || !seg.p1 || !seg.p2) return null;
      const dx = seg.p2.x - seg.p1.x;
      const dy = seg.p2.y - seg.p1.y;
      const segLen = Math.hypot(dx, dy);
      if (segLen < 0.01) return null;
      const ux = dx / segLen, uy = dy / segLen;
      const inv = capInventory.find(c => c.id === cap.cap_inventory_id);
      if (!inv) return null;
      const capW = inv.cap_width_inches || 8;
      const startPos = cap.position_along_segment_inches || 0;
      const lenIn = cap.length_inches || 48;
      const lat = cap.lateral_offset_inches || 0;
      // Perpendicular unit
      const nx = -uy, ny = ux;
      const startWorld = {
        x: seg.p1.x + ux * startPos + nx * lat,
        y: seg.p1.y + uy * startPos + ny * lat,
      };
      const endWorld = {
        x: startWorld.x + ux * lenIn,
        y: startWorld.y + uy * lenIn,
      };
      const startS = worldToScreen(startWorld, bounds, viewSize.w, viewSize.h);
      const endS = worldToScreen(endWorld, bounds, viewSize.w, viewSize.h);
      const dxs = endS.x - startS.x, dys = endS.y - startS.y;
      const lenS = Math.hypot(dxs, dys);
      const angleDeg = Math.atan2(dys, dxs) * 180 / Math.PI;
      const widthPx = Math.max(6, (capW / (bounds.maxX - bounds.minX)) * viewSize.w);
      const isSel = selectedCapIdx === idx;
      const rot = cap.rotation_offset_degrees || 0;
      return (
        <g
          key={cap.id}
          transform={`translate(${startS.x},${startS.y}) rotate(${angleDeg}) rotate(${rot})`}
          onMouseDown={(e) => handleCapMouseDown(e, idx)}
          style={{ cursor: tool === 'select' ? 'grab' : 'pointer' }}
        >
          <rect
            x={0} y={-widthPx / 2}
            width={lenS} height={widthPx}
            fill={inv.cap_color || '#9ca3af'}
            stroke={isSel ? '#2563eb' : '#475569'}
            strokeWidth={isSel ? 3 : 1.2}
            opacity={0.95}
          />
          <text x={lenS / 2} y={4} textAnchor="middle" fontSize="10" fill="#1e293b" pointerEvents="none">
            {idx + 1}
          </text>
        </g>
      );
    });
  };

  const totals = useMemo(() => {
    let cost = 0;
    const byInv = {};
    (wallCaps || []).forEach(c => {
      const inv = capInventory.find(i => i.id === c.cap_inventory_id);
      if (!inv) return;
      cost += parseFloat(inv.cap_stock_price || 0); // full stock per cut piece
      byInv[inv.id] = byInv[inv.id] || { inv, qty: 0 };
      byInv[inv.id].qty += 1;
    });
    return { cost, byInv: Object.values(byInv) };
  }, [wallCaps, capInventory]);

  if (capInventory.length === 0) {
    return (
      <div className="space-y-4 pt-4">
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-slate-400">
            <Square className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No wall caps in inventory.</p>
            <p className="text-xs mt-1">Add wall caps in <span className="font-medium">Foundation Inventory → Wall Caps</span> first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasWalls) {
    return (
      <div className="space-y-4 pt-4">
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-slate-400">
            <p className="font-medium">No outer walls drawn yet.</p>
            <p className="text-xs mt-1">Draw walls in <span className="font-medium">Walls & Poles → Layout Canvas</span> first. Internal fill walls cannot be capped.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800">Wall Caps (Top-Down View)</h3>
          <p className="text-xs text-slate-500">Click a wall to drop a cap. Switch to Select to drag caps along their wall. Full stock charged per cut.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase font-semibold text-slate-500">Total Caps Cost</div>
          <div className="text-lg font-bold text-stone-700">${totals.cost.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Canvas */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-2 border-b border-slate-100 bg-slate-50">
            <Button
              size="sm"
              variant={tool === 'place' ? 'default' : 'outline'}
              onClick={() => setTool('place')}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" /> Place
            </Button>
            <Button
              size="sm"
              variant={tool === 'select' ? 'default' : 'outline'}
              onClick={() => setTool('select')}
              className="h-7 text-xs"
            >
              <MousePointer2 className="w-3 h-3 mr-1" /> Select / Move
            </Button>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            <Select value={selectedCapInvId} onValueChange={setSelectedCapInvId}>
              <SelectTrigger className="h-7 text-xs w-[200px] bg-white"><SelectValue placeholder="Choose cap..." /></SelectTrigger>
              <SelectContent>
                {capInventory.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.material_name} — ${parseFloat(c.cap_stock_price || 0).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <svg
            ref={svgRef}
            width="100%"
            viewBox={`0 0 ${viewSize.w} ${viewSize.h}`}
            style={{ background: '#f8fafc', cursor: tool === 'place' ? 'crosshair' : 'default', display: 'block' }}
            onClick={handleCanvasClick}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
          >
            {/* Grid */}
            <defs>
              <pattern id="capGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#capGrid)" />
            {renderWallLines()}
            {renderCaps()}
          </svg>
        </div>

        {/* Sidebar: placed caps list */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center justify-between">
            <span>Placed Caps ({(wallCaps || []).length})</span>
          </div>
          {(wallCaps || []).length === 0 && (
            <p className="text-xs text-slate-500 italic bg-white border border-slate-200 p-3 rounded-lg">No caps placed yet.</p>
          )}
          {(wallCaps || []).map((cap, idx) => {
            const inv = capInventory.find(c => c.id === cap.cap_inventory_id);
            const isSel = selectedCapIdx === idx;
            return (
              <div
                key={cap.id}
                className={`border rounded-lg p-2 cursor-pointer ${isSel ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                onClick={() => setSelectedCapIdx(idx)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">Cap {idx + 1}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-amber-100" title="Rotate 90°"
                      onClick={(e) => { e.stopPropagation(); rotateCap(idx); }}>
                      <RotateCw className="w-3 h-3 text-amber-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-100"
                      onClick={(e) => { e.stopPropagation(); deleteCap(idx); }}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{inv?.material_name || 'Unknown'}</div>
                {isSel && (
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                    <div>
                      <Label className="text-[10px] uppercase font-semibold text-slate-500">Length (in)</Label>
                      <Input
                        type="number"
                        className="h-6 text-[10px] px-1 bg-white"
                        value={cap.length_inches}
                        step="0.25"
                        min="1"
                        onChange={e => updateCapLength(idx, parseFloat(e.target.value) || 0)}
                      />
                      {inv && cap.length_inches < inv.cap_stock_length_inches && (
                        <p className="text-[10px] text-amber-700 mt-0.5">Cut from {inv.cap_stock_length_inches}" stock — full price billed.</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-semibold text-slate-500">Rotation Offset (°)</Label>
                      <Input
                        type="number"
                        className="h-6 text-[10px] px-1 bg-white"
                        value={cap.rotation_offset_degrees || 0}
                        step="1"
                        onChange={e => {
                          const arr = [...wallCaps];
                          arr[idx] = { ...arr[idx], rotation_offset_degrees: parseFloat(e.target.value) || 0 };
                          setWallCaps(arr); markDirty();
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-semibold text-slate-500">Lateral Offset (in)</Label>
                      <Input
                        type="number"
                        className="h-6 text-[10px] px-1 bg-white"
                        value={cap.lateral_offset_inches || 0}
                        step="0.25"
                        onChange={e => {
                          const arr = [...wallCaps];
                          arr[idx] = { ...arr[idx], lateral_offset_inches: parseFloat(e.target.value) || 0 };
                          setWallCaps(arr); markDirty();
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {totals.byInv.length > 0 && (
            <div className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-lg">
              <div className="text-[10px] uppercase font-semibold text-stone-600 mb-1.5">Bill of Materials</div>
              {totals.byInv.map(({ inv, qty }) => (
                <div key={inv.id} className="flex justify-between text-xs py-0.5">
                  <span className="truncate text-slate-700">{qty}× {inv.material_name}</span>
                  <span className="font-semibold text-slate-900">${(qty * parseFloat(inv.cap_stock_price || 0)).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}