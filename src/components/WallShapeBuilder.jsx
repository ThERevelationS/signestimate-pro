import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Undo2, Plus, Move, RotateCcw } from 'lucide-react';

const SCALE_PX_PER_INCH = 4; // 4 pixels per inch
const SNAP_DISTANCE = 14;    // px - for closing shape
const GRID_INCH = 6;         // grid every 6 inches

function snapToGrid(val, gridPx) {
  return Math.round(val / gridPx) * gridPx;
}

function pointInRects(pt, rects) {
  if (rects.length === 0) return true; // No constraints if no rects
  return rects.some(r => pt.x >= r.minX && pt.x <= r.maxX && pt.y >= r.minY && pt.y <= r.maxY);
}

// Convert canvas pixel to world inches (accounting for pan offset and scale)
function canvasToInches(px, offset) {
  return (px - offset) / SCALE_PX_PER_INCH;
}

// Convert world inches to canvas pixel
function inchesToCanvas(inches, offset) {
  return inches * SCALE_PX_PER_INCH + offset;
}

function dist(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

// Points stored in WORLD INCHES; this computes px distance between two world-inch points on canvas
function segmentLengthInches(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

export default function WallShapeBuilder({
  foundationItems = [],
  onShapeChange,
  initialShape = null,
  useExistingFoundation = false,
  wallMaterial = null,
  onRequireMaterial = () => {}
}) {
  const canvasRef = useRef(null);

  // All points stored in WORLD INCHES (not canvas pixels)
  const initPoints = initialShape?.points || [];
  const [points, setPoints] = useState(initPoints);
  const [closed, setClosed] = useState(initialShape?.closed || false);
  const [hoverInches, setHoverInches] = useState(null);  // world inches
  const [nearFirstPoint, setNearFirstPoint] = useState(false);
  const [mode, setMode] = useState('draw');
  const [offset, setOffset] = useState({ x: 40, y: 40 }); // pan offset in px
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [draggingWall, setDraggingWall] = useState(false);
  const [dragWallStart, setDragWallStart] = useState(null);

  const canvasW = 700;
  const canvasH = 450;

  const fRects = React.useMemo(() => {
    if (useExistingFoundation || !foundationItems) return [];
    let cumulativeOffsetX = 0;
    const rects = [];
    foundationItems.forEach(item => {
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

      for (let i = 0; i < qty; i++) {
        const col = i % gridSize;
        const row = Math.floor(i / gridSize);
        const ox = cumulativeOffsetX + col * spacingX + footprintX / 2;
        const oz = row * spacingZ + footprintZ / 2;
        
        rects.push({
            minX: (ox - footprintX/2) * 12,
            maxX: (ox + footprintX/2) * 12,
            minY: (oz - footprintZ/2) * 12,
            maxY: (oz + footprintZ/2) * 12
        });
      }
      cumulativeOffsetX += gridSize * spacingX + 2;
    });
    return rects;
  }, [foundationItems, useExistingFoundation]);

  const snapInch = wallMaterial?.wall_unit_length_inches || GRID_INCH;
  const gridPx = snapInch * SCALE_PX_PER_INCH;

  // Convert world-inch point to canvas pixel
  const toCanvas = useCallback((pt) => ({
    x: inchesToCanvas(pt.x, offset.x),
    y: inchesToCanvas(pt.y, offset.y),
  }), [offset]);

  // Convert raw canvas pixel to snapped world inches
  const fromCanvas = useCallback((rawX, rawY, customGridPx) => {
    const activeGridPx = customGridPx || gridPx;
    const snappedX = snapToGrid(rawX, activeGridPx);
    const snappedY = snapToGrid(rawY, activeGridPx);
    return {
      x: canvasToInches(snappedX, offset.x),
      y: canvasToInches(snappedY, offset.y),
    };
  }, [offset, gridPx]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Grid — follows offset so it pans correctly
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    const gridPx = GRID_INCH * SCALE_PX_PER_INCH;
    const startX = ((offset.x % gridPx) + gridPx) % gridPx;
    const startY = ((offset.y % gridPx) + gridPx) % gridPx;
    for (let x = startX; x < canvasW; x += gridPx) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke();
    }
    for (let y = startY; y < canvasH; y += gridPx) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke();
    }

    // Foundation bounds (world space, pans with offset)
    if (!useExistingFoundation && fRects.length > 0) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.fillStyle = 'rgba(245,158,11,0.07)';
      
      fRects.forEach((r, i) => {
        const topLeft = toCanvas({ x: r.minX, y: r.minY });
        const w = (r.maxX - r.minX) * SCALE_PX_PER_INCH;
        const h = (r.maxY - r.minY) * SCALE_PX_PER_INCH;
        ctx.strokeRect(topLeft.x, topLeft.y, w, h);
        ctx.fillRect(topLeft.x, topLeft.y, w, h);
        if (i === 0) {
          ctx.fillStyle = '#92400e';
          ctx.font = '11px sans-serif';
          ctx.fillText(`Foundations`, topLeft.x + 4, topLeft.y - 6);
          ctx.fillStyle = 'rgba(245,158,11,0.07)'; // restore
        }
      });
      ctx.setLineDash([]);
    } else if (useExistingFoundation) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.fillText('Using Existing Foundation — draw wall outline freely', 20, 20);
    }

    // Drawn wall outline
    if (points.length > 0) {
      const cpFirst = toCanvas(points[0]);
      ctx.beginPath();
      ctx.moveTo(cpFirst.x, cpFirst.y);
      for (let i = 1; i < points.length; i++) {
        const cp = toCanvas(points[i]);
        ctx.lineTo(cp.x, cp.y);
      }
      if (closed) ctx.closePath();
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (closed) {
        ctx.fillStyle = 'rgba(30,64,175,0.12)';
        ctx.fill();
      }

      // Segment length labels
      ctx.fillStyle = '#1e40af';
      ctx.font = 'bold 11px sans-serif';
      const segs = closed ? points.length : points.length - 1;
      for (let i = 0; i < segs; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const cp1 = toCanvas(p1);
        const cp2 = toCanvas(p2);
        const mx = (cp1.x + cp2.x) / 2;
        const my = (cp1.y + cp2.y) / 2;
        const lenIn = segmentLengthInches(p1, p2);
        const ft = Math.floor(lenIn / 12);
        const inch = Math.round(lenIn % 12);
        const label = ft > 0 ? `${ft}'-${inch}"` : `${inch}"`;
        ctx.fillText(label, mx + 4, my - 4);
      }

      // Points
      points.forEach((pt, i) => {
        const cp = toCanvas(pt);
        const isFirst = i === 0;
        const isSnappable = isFirst && nearFirstPoint && !closed && points.length >= 3;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, isSnappable ? 10 : (selectedPointIndex === i ? 7 : 5), 0, Math.PI * 2);
        ctx.fillStyle = isFirst ? (isSnappable ? '#22c55e' : '#ef4444') : '#1e40af';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = isSnappable ? 2.5 : 1.5;
        ctx.stroke();
      });
    }

    // Hover preview line
    if (hoverInches && mode === 'draw' && !closed) {
      const hcp = toCanvas(hoverInches);

      if (nearFirstPoint && points.length >= 3) {
        // Show snap-to-close indicator
        const cp0 = toCanvas(points[0]);
        ctx.beginPath();
        ctx.arc(cp0.x, cp0.y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(34,197,94,0.15)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(hcp.x, hcp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = nearFirstPoint && points.length >= 3 ? 'rgba(34,197,94,0.6)' : 'rgba(30,64,175,0.4)';
      ctx.fill();

      if (points.length > 0) {
        const last = toCanvas(points[points.length - 1]);
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(hcp.x, hcp.y);
        ctx.strokeStyle = nearFirstPoint && points.length >= 3 ? 'rgba(34,197,94,0.6)' : 'rgba(30,64,175,0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        const lenIn = segmentLengthInches(points[points.length - 1], hoverInches);
        const ft = Math.floor(lenIn / 12);
        const inch = Math.round(lenIn % 12);
        const label = nearFirstPoint && points.length >= 3 ? 'Close shape' : (ft > 0 ? `${ft}'-${inch}"` : `${inch}"`);
        ctx.fillStyle = nearFirstPoint ? '#16a34a' : '#475569';
        ctx.font = nearFirstPoint ? 'bold 11px sans-serif' : '11px sans-serif';
        ctx.fillText(label, (last.x + hcp.x) / 2 + 4, (last.y + hcp.y) / 2 - 4);
      }
    }
  }, [points, hoverInches, nearFirstPoint, mode, offset, closed, fRects, useExistingFoundation, selectedPointIndex, toCanvas]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    if (onShapeChange) {
      const segments = [];
      const n = closed ? points.length : points.length - 1;
      for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        segments.push({ p1, p2, length: Math.sqrt(dx * dx + dy * dy) });
      }
      onShapeChange({ points: [...points], closed, segments });
    }
  }, [points, closed]);

  const getRawCanvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      rawX: e.clientX - rect.left,
      rawY: e.clientY - rect.top,
    };
  };

  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const { rawX, rawY } = getRawCanvasPoint(e);

    if (panning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const currentGridPx = mode === 'move_wall' ? SCALE_PX_PER_INCH : gridPx;
    const worldPt = fromCanvas(rawX, rawY, currentGridPx);

    if (draggingWall && dragWallStart) {
        const dx = worldPt.x - dragWallStart.x;
        const dy = worldPt.y - dragWallStart.y;
        
        // Check if new positions are valid
        const newPoints = points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        const allValid = fRects.length === 0 || newPoints.every(p => pointInRects(p, fRects));
        
        if (allValid && (dx !== 0 || dy !== 0)) {
            setPoints(newPoints);
            setDragWallStart(worldPt);
        }
        return;
    }

    if (draggingPoint !== null) {
      if (fRects.length === 0 || pointInRects(worldPt, fRects)) {
        setPoints(prev => {
          const arr = [...prev];
          arr[draggingPoint] = worldPt;
          return arr;
        });
      }
      return;
    }

    setHoverInches(worldPt);

    // Check proximity to first point (in canvas pixels)
    if (points.length >= 3 && !closed) {
      const cp0 = { x: inchesToCanvas(points[0].x, offset.x), y: inchesToCanvas(points[0].y, offset.y) };
      const dPx = dist({ x: rawX, y: rawY }, cp0);
      setNearFirstPoint(dPx < SNAP_DISTANCE);
    } else {
      setNearFirstPoint(false);
    }
  };

  const handleMouseDown = (e) => {
    if (!wallMaterial) {
        onRequireMaterial();
        return;
    }

    if (mode === 'pan') {
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const { rawX, rawY } = getRawCanvasPoint(e);
    const currentGridPx = mode === 'move_wall' ? SCALE_PX_PER_INCH : gridPx;
    const worldPt = fromCanvas(rawX, rawY, currentGridPx);

    if (mode === 'move_wall') {
        if (points.length > 0) {
            setDraggingWall(true);
            setDragWallStart(worldPt);
        }
        return;
    }

    // Check if clicking near existing point (canvas px distance)
    for (let i = 0; i < points.length; i++) {
      const cp = { x: inchesToCanvas(points[i].x, offset.x), y: inchesToCanvas(points[i].y, offset.y) };
      if (dist({ x: rawX, y: rawY }, cp) < 10) {
        setDraggingPoint(i);
        setSelectedPointIndex(i);
        return;
      }
    }

    if (closed) return;

    // Close shape if near first point
    if (points.length >= 3 && nearFirstPoint) {
      setClosed(true);
      setNearFirstPoint(false);
      return;
    }

    if (fRects.length > 0 && !pointInRects(worldPt, fRects)) {
        return; // Don't allow placing outside bounds
    }

    setPoints(prev => [...prev, worldPt]);
  };

  const handleMouseUp = () => {
    setPanning(false);
    setPanStart(null);
    setDraggingWall(false);
    setDragWallStart(null);
    if (draggingPoint !== null) setDraggingPoint(null);
  };

  const handleUndo = () => {
    if (closed) {
      setClosed(false);
    } else {
      setPoints(prev => prev.slice(0, -1));
    }
  };

  const handleReset = () => {
    setPoints([]);
    setClosed(false);
    setSelectedPointIndex(null);
    setNearFirstPoint(false);
  };

  const deleteSelectedPoint = () => {
    if (selectedPointIndex === null) return;
    setPoints(prev => prev.filter((_, i) => i !== selectedPointIndex));
    setSelectedPointIndex(null);
    if (closed && points.length <= 3) setClosed(false);
  };

  const totalPerimeterInches = (() => {
    if (points.length < 2) return 0;
    const n = closed ? points.length : points.length - 1;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += segmentLengthInches(points[i], points[(i + 1) % points.length]);
    }
    return sum;
  })();

  const totalFt = Math.floor(totalPerimeterInches / 12);
  const totalInch = Math.round(totalPerimeterInches % 12);

  const handleSegmentChange = (idx, newLengthInches) => {
    // Determine vector of the segment
    const p1 = points[idx];
    const p2 = points[(idx + 1) % points.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const currentLen = Math.sqrt(dx * dx + dy * dy);
    if (currentLen === 0) return;
    
    // Calculate new p2
    const scale = newLengthInches / currentLen;
    const newP2 = {
        x: p1.x + dx * scale,
        y: p1.y + dy * scale
    };

    // If we only move p2, what happens to subsequent points?
    // Move all subsequent points by the same delta
    const deltaX = newP2.x - p2.x;
    const deltaY = newP2.y - p2.y;

    setPoints(prev => {
        const arr = [...prev];
        if (closed) {
            arr[(idx + 1) % arr.length] = newP2;
        } else {
            for (let i = idx + 1; i < arr.length; i++) {
                arr[i] = { x: arr[i].x + deltaX, y: arr[i].y + deltaY };
            }
        }
        // Force bounds constraint correction if possible
        if (fRects.length > 0 && !arr.every(p => pointInRects(p, fRects))) {
            return prev; // Undo if edit pushes it outside foundation bounds
        }
        return arr;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={mode === 'draw' ? 'default' : 'outline'} onClick={() => setMode('draw')}>
          <Plus className="w-3 h-3 mr-1" /> Draw
        </Button>
        <Button size="sm" variant={mode === 'pan' ? 'default' : 'outline'} onClick={() => setMode('pan')}>
          <Move className="w-3 h-3 mr-1" /> Pan
        </Button>
        <Button size="sm" variant={mode === 'move_wall' ? 'default' : 'outline'} onClick={() => setMode('move_wall')}>
          <Move className="w-3 h-3 mr-1" /> Move Wall
        </Button>
        <Button size="sm" variant="outline" onClick={handleUndo} disabled={points.length === 0}>
          <Undo2 className="w-3 h-3 mr-1" /> Undo
        </Button>
        {selectedPointIndex !== null && (
          <Button size="sm" variant="outline" onClick={deleteSelectedPoint}>
            <Trash2 className="w-3 h-3 mr-1" /> Del Point
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={handleReset}>
          <RotateCcw className="w-3 h-3 mr-1" /> Reset
        </Button>
        {totalPerimeterInches > 0 && (
          <Badge variant="secondary" className="ml-auto">
            Perimeter: {totalFt > 0 ? `${totalFt}' ` : ''}{totalInch}"
          </Badge>
        )}
        {closed && <Badge className="bg-green-600">Shape Closed ✓</Badge>}
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ width: canvasW, maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          style={{ cursor: mode === 'pan' ? 'grab' : (mode === 'move_wall' ? 'move' : (nearFirstPoint && points.length >= 3 && !closed ? 'pointer' : 'crosshair')), display: 'block', maxWidth: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setHoverInches(null); setPanning(false); setNearFirstPoint(false); setDraggingWall(false); setDragWallStart(null); }}
        />
      </div>

      <p className="text-xs text-slate-500">
        {!closed
          ? `Click to place points (Snaps to ${snapInch}"). Move cursor near first point to auto-close. Pan to view. Move Wall to reposition.`
          : 'Shape closed. Drag points to refine, or use Move Wall to reposition. Click "Reset" to start over.'}
      </p>

      {points.length > 1 && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Segment Measurements</h4>
            <div className="flex flex-wrap gap-4">
                {Array.from({ length: closed ? points.length : points.length - 1 }).map((_, i) => {
                    const p1 = points[i];
                    const p2 = points[(i + 1) % points.length];
                    const lenIn = segmentLengthInches(p1, p2);
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Seg {i+1}:</span>
                            <Input 
                                type="number" 
                                className="h-7 w-20 text-xs" 
                                value={Math.round(lenIn)} 
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val > 0) handleSegmentChange(i, val);
                                }}
                            />
                            <span className="text-xs text-slate-400">in</span>
                        </div>
                    );
                })}
            </div>
        </div>
      )}
    </div>
  );
}