import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Undo2, Plus, Move, RotateCcw, Crosshair, ZoomIn, ZoomOut } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BASE_SCALE = 4;
const SNAP_DISTANCE = 14;
const GRID_INCH = 6;

function snapToGrid(val, gridPx) {
  return Math.round(val / gridPx) * gridPx;
}
function dist(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}
function segmentLengthInches(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}
function pointInPolygon(point, vs) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        let intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export default function SharedCanvas({
  foundationItems = [],
  onFoundationUpdate = () => {},
  
  // Walls
  walls = [],
  activeWallIndex = null,
  onWallShapeChange = () => {},
  
  // Poles
  polesData = [],
  polesInventory = [],
  selectedPoleId = '',
  setSelectedPoleId = () => {},
  onChangePoles = () => {},
  selectedPlacedIdx = null,
  setSelectedPlacedIdx = () => {},
  
  showPoles = false
}) {
  const canvasRef = useRef(null);
  
  const [zoom, setZoom] = useState(1);
  const scale = BASE_SCALE * zoom;
  
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  
  const [mode, setMode] = useState('draw');

  // Wall state
  const activeWall = activeWallIndex !== null ? walls[activeWallIndex] : null;
  const points = activeWall?.shape?.points || [];
  const closed = activeWall?.shape?.closed || false;
  const useExistingFoundation = activeWall?.useExistingFoundation || false;
  const wallMaterial = activeWall?.selectedMaterial || null;
  const otherWalls = activeWallIndex !== null ? walls.filter((_, i) => i !== activeWallIndex) : [];

  const updateShape = useCallback((newPoints, newClosed) => {
    if (activeWallIndex === null) return;
    const segments = [];
    const n = newClosed ? newPoints.length : newPoints.length - 1;
    for (let i = 0; i < n; i++) {
      const p1 = newPoints[i];
      const p2 = newPoints[(i + 1) % newPoints.length];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      segments.push({ p1, p2, length: Math.sqrt(dx * dx + dy * dy) });
    }
    onWallShapeChange(activeWallIndex, { points: newPoints, closed: newClosed, segments });
  }, [activeWallIndex, onWallShapeChange]);

  const [hoverInches, setHoverInches] = useState(null);
  const [nearFirstPoint, setNearFirstPoint] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [draggingWall, setDraggingWall] = useState(false);
  const [dragWallStart, setDragWallStart] = useState(null);
  const [editingSegment, setEditingSegment] = useState(null);
  const [draggingPointIndex, setDraggingPointIndex] = useState(null);
  const [draggingPoleIdx, setDraggingPoleIdx] = useState(null);
  const [dragPoleStart, setDragPoleStart] = useState(null);
  
  // Foundation state
  const [draggingFoundationIndex, setDraggingFoundationIndex] = useState(null);
  const [dragFoundStart, setDragFoundStart] = useState(null);

  const canvasW = 700;
  const canvasH = 450;

  const fRects = useMemo(() => {
    if (activeWallIndex !== null && useExistingFoundation) return [];
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
        const ox = cumulativeOffsetX + col * spacingX + footprintX / 2 + userOffsetX;
        const oz = row * spacingZ + footprintZ / 2 + userOffsetZ;
        
        rects.push({
            itemIdx,
            minX: (ox - footprintX/2) * 12,
            maxX: (ox + footprintX/2) * 12,
            minY: (oz - footprintZ/2) * 12,
            maxY: (oz + footprintZ/2) * 12,
            isPillar: !isSpread,
            centerX: ox * 12,
            centerY: oz * 12,
            radius: (diaFt * 12) / 2
        });
      }
      cumulativeOffsetX += gridSize * spacingX + 2;
    });
    return rects;
  }, [foundationItems, useExistingFoundation]);

  function pointInRects(pt, rects) {
    if (rects.length === 0) return true;
    return rects.some(r => {
      if (r.isPillar) {
        const dx = pt.x - r.centerX;
        const dy = (pt.y !== undefined ? pt.y : pt.z) - r.centerY;
        return (dx * dx + dy * dy) <= r.radius * r.radius;
      }
      const py = pt.y !== undefined ? pt.y : pt.z;
      return pt.x >= r.minX && pt.x <= r.maxX && py >= r.minY && py <= r.maxY;
    });
  }

  const snapInch = activeWallIndex !== null && wallMaterial ? (wallMaterial.wall_unit_length_inches || GRID_INCH) : GRID_INCH;
  const gridPx = snapInch * scale;

  const toCanvas = useCallback((pt) => ({
    x: pt.x * scale + offset.x,
    y: (pt.y !== undefined ? pt.y : pt.z) * scale + offset.y,
  }), [offset, scale]);

  const fromCanvas = useCallback((rawX, rawY, customGridPx) => {
    const activeGridPx = customGridPx || gridPx;
    const snappedX = snapToGrid(rawX, activeGridPx);
    const snappedY = snapToGrid(rawY, activeGridPx);
    return {
      x: (snappedX - offset.x) / scale,
      y: (snappedY - offset.y) / scale,
      z: (snappedY - offset.y) / scale,
    };
  }, [offset, gridPx, scale]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    const gPx = GRID_INCH * scale;
    const startX = ((offset.x % gPx) + gPx) % gPx;
    const startY = ((offset.y % gPx) + gPx) % gPx;
    for (let x = startX; x < canvasW; x += gPx) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke();
    }
    for (let y = startY; y < canvasH; y += gPx) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke();
    }

    if (fRects.length > 0) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.fillStyle = 'rgba(245,158,11,0.07)';
      
      fRects.forEach((r, i) => {
        const topLeft = toCanvas({ x: r.minX, y: r.minY });
        const w = (r.maxX - r.minX) * scale;
        const h = (r.maxY - r.minY) * scale;
        
        if (r.isPillar) {
            const center = toCanvas({ x: r.centerX, y: r.centerY });
            const radiusPx = r.radius * scale;
            ctx.beginPath();
            ctx.arc(center.x, center.y, radiusPx, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fill();
        } else {
            ctx.strokeRect(topLeft.x, topLeft.y, w, h);
            ctx.fillRect(topLeft.x, topLeft.y, w, h);
        }
        
        ctx.fillStyle = '#92400e';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Foundation ${r.itemIdx + 1}`, topLeft.x + 4, topLeft.y + 14);
        ctx.fillStyle = 'rgba(245,158,11,0.07)'; 
      });
      ctx.setLineDash([]);
    } else if (activeWallIndex !== null && useExistingFoundation) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.fillText('Using Existing Foundation — draw wall outline freely', 20, 20);
    }

    if (activeWallIndex !== null) {
        otherWalls.forEach(ow => {
            if (!ow.shape || !ow.shape.points || ow.shape.points.length < 2) return;
            ctx.beginPath();
            const pt0 = toCanvas(ow.shape.points[0]);
            ctx.moveTo(pt0.x, pt0.y);
            for (let i = 1; i < ow.shape.points.length; i++) {
                const pt = toCanvas(ow.shape.points[i]);
                ctx.lineTo(pt.x, pt.y);
            }
            if (ow.shape.closed) ctx.closePath();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
            if (ow.shape.closed) {
                ctx.fillStyle = 'rgba(148, 163, 184, 0.1)';
                ctx.fill();
            }
        });

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

        if (hoverInches && mode === 'draw' && !closed) {
          const hcp = toCanvas(hoverInches);

          if (nearFirstPoint && points.length >= 3) {
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
    }

    if (showPoles) {
      polesData.forEach((p, idx) => {
        const cp = toCanvas({ x: p.x_inches, y: p.z_inches });
        const inv = polesInventory.find(i => i.id === p.pole_id);
        const isSelected = selectedPlacedIdx === idx;
        
        let pw = (inv?.pole_width_inches || 6) * scale;
        let pd = (inv?.pole_depth_inches || 6) * scale;

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
    }

  }, [offset, fRects, points, polesData, polesInventory, selectedPlacedIdx, hoverInches, nearFirstPoint, mode, closed, useExistingFoundation, selectedPointIndex, toCanvas, scale, activeWallIndex, otherWalls, showPoles]);

  useEffect(() => { draw(); }, [draw]);

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

    const currentGridPx = mode === 'move_wall' || draggingFoundationIndex !== null ? scale : gridPx;
    let worldPt = fromCanvas(rawX, rawY, currentGridPx);

    if (draggingPoleIdx !== null && dragPoleStart) {
        const dx = worldPt.x - dragPoleStart.x;
        const dz = worldPt.y - dragPoleStart.y;
        if (dx !== 0 || dz !== 0) {
            const arr = [...polesData];
            arr[draggingPoleIdx] = {
                ...arr[draggingPoleIdx],
                x_inches: arr[draggingPoleIdx].x_inches + dx,
                z_inches: arr[draggingPoleIdx].z_inches + dz
            };
            onChangePoles(arr);
            setDragPoleStart(worldPt);
        }
        return;
    }

    if (draggingFoundationIndex !== null && dragFoundStart) {
        const dx = worldPt.x - dragFoundStart.x;
        const dz = worldPt.y - dragFoundStart.y;
        
        if (dx !== 0 || dz !== 0) {
            const item = foundationItems[draggingFoundationIndex];
            const newOx = (item.offset_x_inches || 0) + dx;
            const newOz = (item.offset_z_inches || 0) + dz;
            onFoundationUpdate(draggingFoundationIndex, 'offset_x_inches', newOx);
            onFoundationUpdate(draggingFoundationIndex, 'offset_z_inches', newOz);
            setDragFoundStart(worldPt);
        }
        return;
    }

    if (activeWallIndex !== null && mode !== 'place') {
      if (mode === 'edit_points' && draggingPointIndex !== null) {
          const newPoints = [...points];
          newPoints[draggingPointIndex] = worldPt;
          updateShape(newPoints, closed);
          return;
      }

      if (draggingWall && dragWallStart) {
          const dx = worldPt.x - dragWallStart.x;
          const dy = worldPt.y - dragWallStart.y;
          const newPoints = points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          const allValid = fRects.length === 0 || newPoints.every(p => pointInRects(p, fRects));
          if (allValid && (dx !== 0 || dy !== 0)) {
              updateShape(newPoints, closed);
              setDragWallStart(worldPt);
          }
          return;
      }

      let isNearFirst = false;
      if (points.length >= 3 && !closed) {
        const cp0 = toCanvas(points[0]);
        const dPx = dist({ x: rawX, y: rawY }, cp0);
        isNearFirst = dPx < SNAP_DISTANCE;
        setNearFirstPoint(isNearFirst);
      } else {
        setNearFirstPoint(false);
      }

      if (mode === 'draw' && points.length > 0 && !isNearFirst) {
          const lastPt = points[points.length - 1];
          const dx = Math.abs(worldPt.x - lastPt.x);
          const dy = Math.abs(worldPt.y - lastPt.y);
          if (dx > dy) worldPt.y = lastPt.y;
          else worldPt.x = lastPt.x;
      }

      setHoverInches(worldPt);
    }
  };

  const handleMouseDown = (e) => {
    if (activeWallIndex !== null && !wallMaterial && mode !== 'place') {
        alert("Please select a Wall Material first.");
        return;
    }

    if (mode === 'pan') {
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const { rawX, rawY } = getRawCanvasPoint(e);
    const currentGridPx = mode === 'move_wall' || mode === 'move_foundation' ? scale : gridPx;
    const worldPt = fromCanvas(rawX, rawY, currentGridPx);

    if (mode === 'move_foundation') {
        const clickedRect = fRects.find(r => {
            if (r.isPillar) {
                const dx = worldPt.x - r.centerX;
                const dy = worldPt.y - r.centerY;
                return (dx * dx + dy * dy) <= r.radius * r.radius;
            }
            return worldPt.x >= r.minX && worldPt.x <= r.maxX && worldPt.y >= r.minY && worldPt.y <= r.maxY;
        });
        if (clickedRect) {
            setDraggingFoundationIndex(clickedRect.itemIdx);
            setDragFoundStart(worldPt);
        }
        return;
    }

    if (activeWallIndex !== null && mode !== 'place') {
      if (mode === 'move_wall') {
          if (points.length > 0) {
              setDraggingWall(true);
              setDragWallStart(worldPt);
          }
          return;
      }

      if (mode === 'edit_points') {
        for (let i = 0; i < points.length; i++) {
          const cp = toCanvas(points[i]);
          if (dist({ x: rawX, y: rawY }, cp) < 15) {
            setDraggingPointIndex(i);
            setSelectedPointIndex(i);
            return;
          }
        }
        return;
      }

      if (closed) return;

      if (points.length >= 3 && nearFirstPoint) {
        const lastPt = points[points.length - 1];
        const firstPt = points[0];
        let newPoints = [...points];
        if (Math.abs(lastPt.x - firstPt.x) > 0.1 && Math.abs(lastPt.y - firstPt.y) > 0.1) {
            newPoints.push({ x: firstPt.x, y: lastPt.y });
        }
        updateShape(newPoints, true);
        setNearFirstPoint(false);
        return;
      }

      for (let i = 0; i < points.length; i++) {
        const cp = toCanvas(points[i]);
        if (dist({ x: rawX, y: rawY }, cp) < 10) {
          setSelectedPointIndex(i);
          return;
        }
      }

      if (mode === 'draw' && points.length > 0) {
          const lastPt = points[points.length - 1];
          const dx = Math.abs(worldPt.x - lastPt.x);
          const dy = Math.abs(worldPt.y - lastPt.y);
          if (dx > dy) worldPt.y = lastPt.y;
          else worldPt.x = lastPt.x;
      }

      if (fRects.length > 0 && !pointInRects(worldPt, fRects)) return;

      updateShape([...points, worldPt], closed);
    }

    if (showPoles) {
      let clickedIdx = -1;
      for (let i = polesData.length - 1; i >= 0; i--) {
          const p = polesData[i];
          const dist = Math.sqrt((p.x_inches - worldPt.x)**2 + (p.z_inches - worldPt.y)**2);
          if (dist < 10) {
              clickedIdx = i;
              break;
          }
      }

      if (clickedIdx !== -1) {
          setSelectedPlacedIdx(clickedIdx);
          setDraggingPoleIdx(clickedIdx);
          setDragPoleStart(worldPt);
          return;
      }

      if (mode === 'place' && selectedPoleId) {
          const fRect = fRects.find(r => {
             if (r.isPillar) {
                const dx = worldPt.x - r.centerX;
                const dy = worldPt.y - r.centerY;
                return (dx * dx + dy * dy) <= r.radius * r.radius;
             }
             return worldPt.x >= r.minX && worldPt.x <= r.maxX && worldPt.y >= r.minY && worldPt.y <= r.maxY;
          });
          const fIdx = fRect ? fRect.itemIdx : 0;
          const fItem = foundationItems[fIdx] || {};
          const defHeight = (fItem.depth_inches || 36) + 48; 

          const newPole = {
              id: Date.now() + Math.random(),
              pole_id: selectedPoleId,
              x_inches: worldPt.x,
              z_inches: worldPt.y,
              height_inches: defHeight,
              y_offset_inches: 0,
              foundation_idx: fIdx,
              paint: false
          };
          onChangePoles([...polesData, newPole]);
          setSelectedPlacedIdx(polesData.length);
      }
    }
  };

  const handleMouseUp = () => {
    setPanning(false);
    setPanStart(null);
    setDraggingWall(false);
    setDragWallStart(null);
    setDraggingFoundationIndex(null);
    setDragFoundStart(null);
    setDraggingPointIndex(null);
    setDraggingPoleIdx(null);
    setDragPoleStart(null);
  };

  const handleUndo = () => {
    if (closed) {
      updateShape(points, false);
    } else {
      updateShape(points.slice(0, -1), false);
    }
  };

  const handleReset = () => {
    updateShape([], false);
    setSelectedPointIndex(null);
    setNearFirstPoint(false);
  };

  const deleteSelectedPoint = () => {
    if (selectedPointIndex === null) return;
    const newPoints = points.filter((_, i) => i !== selectedPointIndex);
    const newClosed = closed && newPoints.length <= 3 ? false : closed;
    updateShape(newPoints, newClosed);
    setSelectedPointIndex(null);
  };

  const handleDoubleClick = (e) => {
    if (activeWallIndex === null || closed || points.length < 2) return;
    const { rawX, rawY } = getRawCanvasPoint(e);
    const segs = closed ? points.length : points.length - 1;
    for (let i = 0; i < segs; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const cp1 = toCanvas(p1);
        const cp2 = toCanvas(p2);
        const mx = (cp1.x + cp2.x) / 2;
        const my = (cp1.y + cp2.y) / 2;
        
        const distToMid = Math.sqrt((rawX - mx)**2 + (rawY - my)**2);
        if (distToMid < 20) {
            const lenIn = segmentLengthInches(p1, p2);
            setEditingSegment({
                index: i,
                x: mx,
                y: my,
                initialValue: Math.round(lenIn)
            });
            return;
        }
    }
  };

  const handleSegmentChange = (idx, newLengthInches) => {
    const p1 = points[idx];
    const p2 = points[(idx + 1) % points.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const currentLen = Math.sqrt(dx * dx + dy * dy);
    if (currentLen === 0) return;
    
    const scaleLen = newLengthInches / currentLen;
    const newP2 = {
        x: p1.x + dx * scaleLen,
        y: p1.y + dy * scaleLen
    };

    const deltaX = newP2.x - p2.x;
    const deltaY = newP2.y - p2.y;

    const arr = [...points];
    if (closed) {
        return; 
    } else {
        for (let i = idx + 1; i < arr.length; i++) {
            arr[i] = { x: arr[i].x + deltaX, y: arr[i].y + deltaY };
        }
    }
    if (fRects.length > 0 && !arr.every(p => pointInRects(p, fRects))) {
        return; 
    }
    updateShape(arr, closed);
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

  const centerActiveWall = (direction) => {
      if (activeWallIndex === null || points.length === 0) return;
      let minX = points[0].x, maxX = points[0].x, minY = points[0].y, maxY = points[0].y;
      for (const p of points) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
      }
      const wallCenterX = (minX + maxX) / 2;
      const wallCenterZ = (minY + maxY) / 2;

      let fMinX = 0, fMaxX = 0, fMinZ = 0, fMaxZ = 0;
      if (fRects.length > 0) {
          fMinX = Math.min(...fRects.map(r => r.isPillar ? r.centerX - r.radius : r.minX));
          fMaxX = Math.max(...fRects.map(r => r.isPillar ? r.centerX + r.radius : r.maxX));
          fMinZ = Math.min(...fRects.map(r => r.isPillar ? r.centerY - r.radius : r.minY));
          fMaxZ = Math.max(...fRects.map(r => r.isPillar ? r.centerY + r.radius : r.maxY));
      }
      const fCX = fRects.length > 0 ? (fMinX + fMaxX) / 2 : 0;
      const fCZ = fRects.length > 0 ? (fMinZ + fMaxZ) / 2 : 0;

      const dx = (direction === 'horizontal' || direction === 'both') ? (fCX - wallCenterX) : 0;
      const dz = (direction === 'vertical' || direction === 'both') ? (fCZ - wallCenterZ) : 0;

      const newPts = points.map(p => ({ x: p.x + dx, y: p.y + dz }));
      updateShape(newPts, closed);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-2 rounded-lg border border-slate-200">
        {activeWallIndex !== null && (
          <>
            <Button size="sm" variant={mode === 'draw' ? 'default' : 'outline'} onClick={() => setMode('draw')}>
              <Plus className="w-3 h-3 mr-1" /> Draw
            </Button>
            <Button size="sm" variant={mode === 'edit_points' ? 'default' : 'outline'} onClick={() => setMode('edit_points')}>
              <Crosshair className="w-3 h-3 mr-1" /> Edit Points
            </Button>
            <Button size="sm" variant={mode === 'move_wall' ? 'default' : 'outline'} onClick={() => setMode('move_wall')}>
              <Move className="w-3 h-3 mr-1" /> Move Wall
            </Button>
            {closed && points.length > 0 && (
                <div className="flex bg-slate-200 rounded-md p-0.5 mx-1 items-center gap-0.5">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => centerActiveWall('both')}>Center C</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => centerActiveWall('horizontal')}>Center H</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => centerActiveWall('vertical')}>Center V</Button>
                </div>
            )}
          </>
        )}
        {showPoles && (
          <div className="flex items-center gap-1 ml-2 border-l border-slate-300 pl-2">
             <span className="text-[10px] font-semibold text-slate-500 uppercase">Pole:</span>
             <Select value={selectedPoleId} onValueChange={setSelectedPoleId}>
                <SelectTrigger className="h-7 text-xs w-[140px] bg-white">
                   <SelectValue placeholder="Select Pole..." />
                </SelectTrigger>
                <SelectContent>
                   {polesInventory.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.material_name}</SelectItem>
                   ))}
                </SelectContent>
             </Select>
             <Button size="sm" variant={mode === 'place' ? 'default' : 'outline'} onClick={() => setMode('place')} className="h-7 px-2">
                 <Crosshair className="w-3 h-3 mr-1" /> Place
             </Button>
          </div>
        )}
        <Button size="sm" variant={mode === 'pan' ? 'default' : 'outline'} onClick={() => setMode('pan')}>
          <Move className="w-3 h-3 mr-1" /> Pan
        </Button>
        
        {(!useExistingFoundation && foundationItems.length > 0) && (
            <Button size="sm" variant={mode === 'move_foundation' ? 'default' : 'outline'} onClick={() => setMode('move_foundation')}>
            <Move className="w-3 h-3 mr-1" /> Move Foundation
            </Button>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 border-l border-r border-slate-300 px-2 mx-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}>
                <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.min(3, z + 0.2))}>
                <ZoomIn className="w-4 h-4" />
            </Button>
        </div>

        {activeWallIndex !== null && (
          <>
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
          </>
        )}
      </div>

      <div className="relative border rounded-lg overflow-hidden bg-white" style={{ width: canvasW, maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          style={{ cursor: mode === 'pan' ? 'grab' : (mode === 'move_wall' || mode === 'move_foundation' ? 'move' : (mode === 'edit_points' ? 'crosshair' : ((activeWallIndex !== null && nearFirstPoint && points.length >= 3 && !closed) ? 'pointer' : 'crosshair'))), display: 'block', maxWidth: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onMouseLeave={() => { setHoverInches(null); setPanning(false); setNearFirstPoint(false); setDraggingWall(false); setDragWallStart(null); setDraggingFoundationIndex(null); setDragFoundStart(null); setDraggingPointIndex(null); }}
        />
        {editingSegment && (
            <div 
                className="absolute bg-white shadow-lg border border-slate-200 rounded p-1 flex items-center gap-1 z-10"
                style={{ 
                    left: editingSegment.x, 
                    top: editingSegment.y, 
                    transform: 'translate(-50%, -50%)' 
                }}
            >
                <Input 
                    type="number"
                    autoFocus
                    className="w-20 h-7 text-xs"
                    defaultValue={editingSegment.initialValue}
                    onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0 && val !== editingSegment.initialValue) {
                            handleSegmentChange(editingSegment.index, val);
                        }
                        setEditingSegment(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        else if (e.key === 'Escape') setEditingSegment(null);
                    }}
                />
                <span className="text-xs text-slate-500 pr-1">in</span>
            </div>
        )}
      </div>

      {activeWallIndex !== null && (
        <>
          <p className="text-xs text-slate-500">
            {!closed
              ? `Click to place points (Snaps to ${snapInch}"). Move cursor near first point to auto-close. Pan to view. Move Wall to reposition. Double-click a measurement to edit.`
              : 'Shape closed. Use Move Wall to reposition. To edit lengths, click Undo to open the shape. Click "Reset" to start over.'}
          </p>

          {points.length > 1 && !closed && (
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
        </>
      )}
    </div>
  );
}