import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Undo2, Check, Plus, Move, RotateCcw } from 'lucide-react';

const SCALE_PX_PER_INCH = 4; // 4 pixels per inch
const SNAP_DISTANCE = 10; // px
const GRID_INCH = 6; // grid every 6 inches

function snapToGrid(val) {
  const snapTo = GRID_INCH * SCALE_PX_PER_INCH;
  return Math.round(val / snapTo) * snapTo;
}

function pxToInches(px) {
  return px / SCALE_PX_PER_INCH;
}

function inchesToPx(inches) {
  return inches * SCALE_PX_PER_INCH;
}

function dist(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function segmentLength(p1, p2) {
  return pxToInches(dist(p1, p2));
}

// Check if a point is within the foundation bounds
function isWithinBounds(pt, foundationBounds) {
  if (!foundationBounds) return true;
  const { x: bx, y: by, w: bw, h: bh } = foundationBounds;
  return pt.x >= bx && pt.x <= bx + bw && pt.y >= by && pt.y <= by + bh;
}

export default function WallShapeBuilder({ 
  foundationLengthInches, 
  foundationWidthInches, 
  onShapeChange,
  initialShape = null,
  useExistingFoundation = false
}) {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState(initialShape?.points || []);
  const [closed, setClosed] = useState(initialShape?.closed || false);
  const [hoverPt, setHoverPt] = useState(null);
  const [mode, setMode] = useState('draw'); // 'draw' | 'pan'
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);

  const canvasW = 700;
  const canvasH = 450;

  const foundBoundsInPx = useCallback(() => {
    if (useExistingFoundation) return null;
    const w = inchesToPx(foundationLengthInches || 0);
    const h = inchesToPx(foundationWidthInches || 0);
    return { x: offset.x, y: offset.y, w, h };
  }, [foundationLengthInches, foundationWidthInches, offset, useExistingFoundation]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    const gridPx = GRID_INCH * SCALE_PX_PER_INCH;
    for (let x = (offset.x % gridPx); x < canvasW; x += gridPx) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke();
    }
    for (let y = (offset.y % gridPx); y < canvasH; y += gridPx) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke();
    }

    // Foundation bounds
    if (!useExistingFoundation && foundationLengthInches && foundationWidthInches) {
      const fb = foundBoundsInPx();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(fb.x, fb.y, fb.w, fb.h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(245,158,11,0.07)';
      ctx.fillRect(fb.x, fb.y, fb.w, fb.h);

      // Label
      ctx.fillStyle = '#92400e';
      ctx.font = '11px sans-serif';
      ctx.fillText(`Foundation: ${foundationLengthInches}"L x ${foundationWidthInches}"W`, fb.x + 4, fb.y - 6);
    } else if (useExistingFoundation) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.fillText('Using Existing Foundation — draw wall outline freely', 20, 20);
    }

    // Drawn wall outline
    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (closed) ctx.closePath();
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Fill if closed
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
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const lenIn = segmentLength(p1, p2);
        const ft = Math.floor(lenIn / 12);
        const inch = Math.round(lenIn % 12);
        const label = ft > 0 ? `${ft}'-${inch}"` : `${inch}"`;
        ctx.fillText(label, mx + 4, my - 4);
      }

      // Points
      points.forEach((pt, i) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, selectedPointIndex === i ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#ef4444' : '#1e40af';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // Hover point preview
    if (hoverPt && mode === 'draw' && !closed) {
      ctx.beginPath();
      ctx.arc(hoverPt.x, hoverPt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30,64,175,0.4)';
      ctx.fill();

      // Line from last point to hover
      if (points.length > 0) {
        const last = points[points.length - 1];
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(hoverPt.x, hoverPt.y);
        ctx.strokeStyle = 'rgba(30,64,175,0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Show potential length
        const lenIn = segmentLength(last, hoverPt);
        const ft = Math.floor(lenIn / 12);
        const inch = Math.round(lenIn % 12);
        const label = ft > 0 ? `${ft}'-${inch}"` : `${inch}"`;
        ctx.fillStyle = '#475569';
        ctx.font = '11px sans-serif';
        ctx.fillText(label, (last.x + hoverPt.x) / 2 + 4, (last.y + hoverPt.y) / 2 - 4);
      }
    }
  }, [points, hoverPt, mode, offset, closed, foundBoundsInPx, foundationLengthInches, foundationWidthInches, useExistingFoundation, selectedPointIndex]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    if (onShapeChange) {
      const segments = [];
      const n = closed ? points.length : points.length - 1;
      for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        segments.push({ length: segmentLength(p1, p2) });
      }
      onShapeChange({ points, closed, segments });
    }
  }, [points, closed]);

  const getCanvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const snappedX = snapToGrid(rawX);
    const snappedY = snapToGrid(rawY);
    return { x: snappedX, y: snappedY };
  };

  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const pt = getCanvasPoint(e);

    if (panning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (draggingPoint !== null) {
      const fb = foundBoundsInPx();
      if (!useExistingFoundation && fb && !isWithinBounds(pt, fb)) return;
      setPoints(prev => {
        const arr = [...prev];
        arr[draggingPoint] = pt;
        return arr;
      });
      return;
    }

    setHoverPt(pt);
  };

  const handleMouseDown = (e) => {
    if (mode === 'pan') {
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const pt = getCanvasPoint(e);

    // Check if clicking near existing point for drag
    for (let i = 0; i < points.length; i++) {
      if (dist(pt, points[i]) < 10) {
        setDraggingPoint(i);
        setSelectedPointIndex(i);
        return;
      }
    }

    if (closed) return;

    // Check if closing the shape (clicking near first point)
    if (points.length >= 3) {
      if (dist(pt, points[0]) < SNAP_DISTANCE) {
        setClosed(true);
        return;
      }
    }

    // Validate bounds
    const fb = foundBoundsInPx();
    if (!useExistingFoundation && fb && !isWithinBounds(pt, fb)) {
      return;
    }

    setPoints(prev => [...prev, pt]);
  };

  const handleMouseUp = () => {
    setPanning(false);
    setPanStart(null);
    if (draggingPoint !== null) {
      setDraggingPoint(null);
    }
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
  };

  const handleClose = () => {
    if (points.length >= 3) setClosed(true);
  };

  const deleteSelectedPoint = () => {
    if (selectedPointIndex === null) return;
    setPoints(prev => prev.filter((_, i) => i !== selectedPointIndex));
    setSelectedPointIndex(null);
    if (closed && points.length <= 3) setClosed(false);
  };

  // Total perimeter
  const totalPerimeterInches = (() => {
    if (points.length < 2) return 0;
    const n = closed ? points.length : points.length - 1;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += segmentLength(points[i], points[(i + 1) % points.length]);
    }
    return sum;
  })();

  const totalFt = Math.floor(totalPerimeterInches / 12);
  const totalInch = Math.round(totalPerimeterInches % 12);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={mode === 'draw' ? 'default' : 'outline'}
          onClick={() => setMode('draw')}
        >
          <Plus className="w-3 h-3 mr-1" /> Draw
        </Button>
        <Button
          size="sm"
          variant={mode === 'pan' ? 'default' : 'outline'}
          onClick={() => setMode('pan')}
        >
          <Move className="w-3 h-3 mr-1" /> Pan
        </Button>
        <Button size="sm" variant="outline" onClick={handleUndo} disabled={points.length === 0}>
          <Undo2 className="w-3 h-3 mr-1" /> Undo
        </Button>
        {points.length >= 3 && !closed && (
          <Button size="sm" variant="outline" onClick={handleClose}>
            <Check className="w-3 h-3 mr-1" /> Close Shape
          </Button>
        )}
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
        {closed && <Badge className="bg-green-600">Shape Closed</Badge>}
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ width: canvasW, maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          style={{ cursor: mode === 'pan' ? 'grab' : 'crosshair', display: 'block', maxWidth: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setHoverPt(null); setPanning(false); }}
        />
      </div>

      <p className="text-xs text-slate-500">
        {!closed
          ? 'Click to place points. Snap to grid (6" intervals). Click near first point (red) to close. Drag points to adjust.'
          : 'Shape is closed. Drag points to refine. Click "Reset" to start over.'}
        {!useExistingFoundation && foundationLengthInches && ' Points must stay within the foundation outline (amber border).'}
      </p>
    </div>
  );
}