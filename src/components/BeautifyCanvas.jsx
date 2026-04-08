import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Paintbrush, Square, Circle, Minus, Undo, Redo, Hexagon, Droplets, Grid3x3, Layers, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CANVAS_SIZE = 1024;
const WORLD_SIZE = 100; // 100 feet
const PX_PER_FT = CANVAS_SIZE / WORLD_SIZE;

const MATERIALS = [
  { id: 'dirt', name: 'Dirt (Eraser)', color: '#7a5c3a', icon: <Grid3x3 className="w-4 h-4 text-amber-800" /> },
  { id: 'grass', name: 'Grass', color: '#4ade80', icon: <div className="w-4 h-4 bg-green-400 rounded" /> },
  { id: 'concrete', name: 'Concrete / Sidewalk', color: '#94a3b8', icon: <div className="w-4 h-4 bg-slate-400 rounded" /> },
  { id: 'asphalt', name: 'Asphalt / Driveway', color: '#334155', icon: <div className="w-4 h-4 bg-slate-700 rounded" /> },
  { id: 'gravel', name: 'Gravel', color: '#a8a29e', icon: <div className="w-4 h-4 bg-stone-400 rounded" /> },
  { id: 'sand', name: 'Sand', color: '#fcd34d', icon: <div className="w-4 h-4 bg-amber-300 rounded" /> },
  { id: 'mulch', name: 'Mulch', color: '#78350f', icon: <div className="w-4 h-4 bg-amber-900 rounded" /> },
  { id: 'wood', name: 'Wood Decking', color: '#b45309', icon: <div className="w-4 h-4 bg-amber-700 rounded" /> },
  { id: 'water', name: 'Water', color: '#38bdf8', icon: <Droplets className="w-4 h-4 text-sky-400" /> },
];

// Using high-performance procedural seamless patterns

const generateTexture = (type) => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (type === 'grass') {
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#22c55e' : '#16a34a';
      const w = Math.random() * 2 + 1;
      const h = Math.random() * 6 + 2;
      ctx.fillRect(Math.random() * size, Math.random() * size, w, h);
    }
  } else if (type === 'concrete') {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 8000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }
  } else if (type === 'asphalt') {
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 10000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
    }
  } else if (type === 'mulch') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#451a03' : '#92400e';
      ctx.save();
      ctx.translate(Math.random() * size, Math.random() * size);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillRect(0, 0, 8, 3);
      ctx.restore();
    }
  } else if (type === 'dirt') {
    ctx.fillStyle = '#7a5c3a';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
  } else if (type === 'gravel') {
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4000; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() > 0.5 ? '#d6d3d1' : '#78716c';
      ctx.fill();
    }
  } else if (type === 'sand') {
    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 8000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#fde68a' : '#fbbf24';
      ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
    }
  } else if (type === 'water') {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random()*20+10, 2);
    }
  } else if (type === 'wood') {
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < size; i+= 8) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, i + Math.random() * 2, size, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, i, size, 1);
    }
  }
  return canvas;
};

export default function BeautifyCanvas({ dataUrl, foundationItems, onChange }) {
  const bgCanvasRef = useRef(null);
  const displayCanvasRef = useRef(null);

  const [matId, setMatId] = useState('grass');
  const [brushSize, setBrushSize] = useState(40);
  const [tool, setTool] = useState('brush'); // brush, rect, circle, line, polygon
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [lastPos, setLastPos] = useState(null);
  
  const [polygonPoints, setPolygonPoints] = useState([]); // For polygon tool
  
  const [preventOverlap, setPreventOverlap] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [texturesLoaded, setTexturesLoaded] = useState(true);
  const textureCacheRef = useRef({});

  const [presets, setPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('beautify_presets')) || [];
    } catch {
      return [];
    }
  });

  const savePreset = () => {
    const name = prompt('Enter preset name (e.g. "Grass Fill"):');
    if (!name) return;
    const newPreset = { id: Date.now(), name, matId, brushSize, preventOverlap };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('beautify_presets', JSON.stringify(updated));
  };
  
  const loadPreset = (p) => {
    setMatId(p.matId);
    setBrushSize(p.brushSize);
    setPreventOverlap(p.preventOverlap);
  };

  const deletePreset = (id) => {
    if (!confirm('Delete this preset?')) return;
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('beautify_presets', JSON.stringify(updated));
  };

  const getPattern = (ctx, type) => {
    if (!textureCacheRef.current[type]) {
       textureCacheRef.current[type] = generateTexture(type);
    }
    return ctx.createPattern(textureCacheRef.current[type], 'repeat');
  };

  function worldToCanvas(x_ft, z_ft) {
    return {
      x: (x_ft + WORLD_SIZE / 2) * PX_PER_FT,
      y: (z_ft + WORLD_SIZE / 2) * PX_PER_FT
    };
  }

  // Init canvas
  useEffect(() => {
    if (initialized || !texturesLoaded || !bgCanvasRef.current) return;
    const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (dataUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        bgCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        bgCtx.drawImage(img, 0, 0);
        renderDisplay();
        
        const initialData = bgCanvasRef.current.toDataURL('image/png');
        setHistory([initialData]);
        setHistoryIndex(0);
        setInitialized(true);
      };
      img.src = dataUrl;
    } else {
      resetCanvas(true);
      setInitialized(true);
    }
  }, [dataUrl, initialized, texturesLoaded]);

  const saveState = () => {
    const data = bgCanvasRef.current.toDataURL('image/png');
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(data);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    onChange(data);
  };

  const undo = () => {
    if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        loadState(history[newIndex]);
        setHistoryIndex(newIndex);
        onChange(history[newIndex]);
        setPolygonPoints([]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        loadState(history[newIndex]);
        setHistoryIndex(newIndex);
        onChange(history[newIndex]);
        setPolygonPoints([]);
    }
  };

  const loadState = (data) => {
    const img = new Image();
    img.onload = () => {
        const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
        bgCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        bgCtx.drawImage(img, 0, 0);
        renderDisplay();
    };
    img.src = data;
  };

  const resetCanvas = (isInitial = false) => {
    const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
    bgCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    renderDisplay();
    
    const initialData = bgCanvasRef.current.toDataURL('image/png');
    if (isInitial) {
        setHistory([initialData]);
        setHistoryIndex(0);
    } else {
        saveState();
        setPolygonPoints([]);
    }
  };

  const renderDisplay = (previewPos = null) => {
    if (!displayCanvasRef.current || !bgCanvasRef.current) return;
    const ctx = displayCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    ctx.fillStyle = getPattern(ctx, 'dirt');
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.drawImage(bgCanvasRef.current, 0, 0);

    // Render Polygon Preview
    if (tool === 'polygon' && polygonPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
        for (let i = 1; i < polygonPoints.length; i++) {
            ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
        }
        if (previewPos) {
            ctx.lineTo(previewPos.x, previewPos.y);
        }
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.fill();
        
        // Draw points
        polygonPoints.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    // Overlay foundations
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;

    let cumulativeOffsetX = 0;
    foundationItems.forEach((item) => {
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

        const c = worldToCanvas(ox, oz);
        const wPx = footprintX * PX_PER_FT;
        const hPx = footprintZ * PX_PER_FT;

        if (isSpread) {
          ctx.fillRect(c.x - wPx / 2, c.y - hPx / 2, wPx, hPx);
          ctx.strokeRect(c.x - wPx / 2, c.y - hPx / 2, wPx, hPx);
        } else {
          ctx.beginPath();
          ctx.arc(c.x, c.y, wPx / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      cumulativeOffsetX += gridSize * spacingX + 2;
    });
  };

  useEffect(() => {
    if (initialized) {
        renderDisplay();
    }
  }, [foundationItems, initialized, polygonPoints]);

  const getMousePos = (e) => {
    const rect = displayCanvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    const pos = getMousePos(e);
    
    if (tool === 'polygon') {
        setPolygonPoints([...polygonPoints, pos]);
        return;
    }
    
    setIsDrawing(true);
    setStartPos(pos);
    setLastPos(pos);

    if (tool === 'brush') {
        drawStroke(pos, pos);
    }
  };

  const handleDoubleClick = (e) => {
      if (tool === 'polygon' && polygonPoints.length >= 2) {
          const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
          
          if (matId === 'dirt') {
              bgCtx.globalCompositeOperation = 'destination-out';
              bgCtx.fillStyle = 'rgba(0,0,0,1)';
          } else {
              bgCtx.globalCompositeOperation = preventOverlap ? 'destination-over' : 'source-over';
              bgCtx.fillStyle = getPattern(bgCtx, matId);
          }
          
          bgCtx.beginPath();
          bgCtx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
          for (let i = 1; i < polygonPoints.length; i++) {
              bgCtx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
          }
          bgCtx.closePath();
          bgCtx.fill();
          
          bgCtx.globalCompositeOperation = 'source-over';
          clearFoundations();
          setPolygonPoints([]);
          renderDisplay();
          saveState();
      }
  };

  const drawMove = (e) => {
    const pos = getMousePos(e);
    
    if (tool === 'polygon' && polygonPoints.length > 0) {
        renderDisplay(pos);
        return;
    }

    if (!isDrawing) return;
    
    if (tool === 'brush') {
        drawStroke(lastPos, pos);
        setLastPos(pos);
    } else {
        renderDisplay();
        drawShapePreview(startPos, pos);
    }
  };

  const stopDrawing = (e) => {
    if (tool === 'polygon') return;

    if (isDrawing) {
        if (tool !== 'brush') {
            const pos = getMousePos(e);
            drawShapeFinal(startPos, pos);
        }
        setIsDrawing(false);
        saveState();
    }
  };

  const drawShapePreview = (start, end) => {
    const ctx = displayCanvasRef.current.getContext('2d');
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    if (tool === 'line') {
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    } else if (tool === 'rect') {
        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
        ctx.fill();
        ctx.stroke();
    } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    ctx.setLineDash([]);
  };

  const clearFoundations = () => {
    const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'destination-out';
    bgCtx.fillStyle = 'rgba(0,0,0,1)';
    
    let cumulativeOffsetX = 0;
    foundationItems.forEach((item) => {
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

        const c = worldToCanvas(ox, oz);
        const wPx = footprintX * PX_PER_FT;
        const hPx = footprintZ * PX_PER_FT;

        if (isSpread) {
          bgCtx.fillRect(c.x - wPx / 2, c.y - hPx / 2, wPx, hPx);
        } else {
          bgCtx.beginPath();
          bgCtx.arc(c.x, c.y, wPx / 2, 0, Math.PI * 2);
          bgCtx.fill();
        }
      }
      cumulativeOffsetX += gridSize * spacingX + 2;
    });
    bgCtx.restore();
  };

  const drawShapeFinal = (start, end) => {
    const ctx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
    
    if (matId === 'dirt') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = preventOverlap ? 'destination-over' : 'source-over';
        const pattern = getPattern(ctx, matId);
        ctx.strokeStyle = pattern;
        ctx.fillStyle = pattern;
    }

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (tool === 'line') {
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    } else if (tool === 'rect') {
        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
        ctx.fill();
    } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.globalCompositeOperation = 'source-over';
    clearFoundations();
    renderDisplay();
  };

  const drawStroke = (start, end) => {
    const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
    
    if (matId === 'dirt') {
        bgCtx.globalCompositeOperation = 'destination-out';
        bgCtx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        bgCtx.globalCompositeOperation = preventOverlap ? 'destination-over' : 'source-over';
        bgCtx.strokeStyle = getPattern(bgCtx, matId);
    }

    bgCtx.beginPath();
    bgCtx.moveTo(start.x, start.y);
    bgCtx.lineTo(end.x, end.y);
    bgCtx.lineWidth = brushSize;
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';
    bgCtx.stroke();
    
    bgCtx.globalCompositeOperation = 'source-over';
    clearFoundations();
    renderDisplay();
  };

  if (!texturesLoaded) {
      return (
          <div className="flex items-center justify-center h-full min-h-[500px] bg-slate-100 rounded-xl text-slate-500 flex-col gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-medium text-sm">Loading High-Res Textures...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left Toolbar */}
      <div className="w-full lg:w-64 flex flex-col gap-4 shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Materials</Label>
          <div className="grid grid-cols-2 gap-2">
            {MATERIALS.map(m => (
              <button
                key={m.id}
                onClick={() => setMatId(m.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-xs gap-1.5 ${matId === m.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'}`}
              >
                {m.icon}
                <span className="font-medium text-center leading-tight truncate w-full">{m.name.split('/')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-200 w-full my-1"></div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Presets</Label>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={savePreset} className="h-8 text-xs bg-white text-slate-600 border-dashed">
              <Save className="w-3 h-3 mr-1.5" /> Save Current as Preset
            </Button>
            {presets.length > 0 && (
              <div className="flex flex-col gap-1">
                {presets.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-2 py-1">
                    <button onClick={() => loadPreset(p)} className="text-xs font-medium text-slate-700 hover:text-blue-600 truncate text-left flex-1" title="Load preset">
                      {p.name}
                    </button>
                    <button onClick={() => deletePreset(p.id)} className="text-slate-400 hover:text-red-500 ml-2" title="Delete preset">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-slate-200 w-full my-1"></div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Drawing Tools</Label>
          <div className="grid grid-cols-5 gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <Button variant={tool === 'brush' ? 'default' : 'ghost'} size="icon" className="w-full h-8" onClick={() => setTool('brush')} title="Brush">
              <Paintbrush className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'rect' ? 'default' : 'ghost'} size="icon" className="w-full h-8" onClick={() => setTool('rect')} title="Rectangle">
              <Square className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'circle' ? 'default' : 'ghost'} size="icon" className="w-full h-8" onClick={() => setTool('circle')} title="Circle">
              <Circle className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'line' ? 'default' : 'ghost'} size="icon" className="w-full h-8" onClick={() => setTool('line')} title="Line">
              <Minus className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'polygon' ? 'default' : 'ghost'} size="icon" className="w-full h-8" onClick={() => setTool('polygon')} title="Polygon (Click points, Double-click to close)">
              <Hexagon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className={`flex flex-col gap-2 ${tool === 'polygon' ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex justify-between items-center">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Brush Size</Label>
            <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">{brushSize}px</span>
          </div>
          <input 
            type="range" 
            min="10" max="200" 
            value={brushSize} 
            onChange={e => setBrushSize(parseInt(e.target.value))} 
            className="w-full accent-blue-500"
            disabled={tool === 'polygon'}
          />
        </div>

        <div className="h-px bg-slate-200 w-full my-1"></div>
        
        <div className="flex flex-col gap-2">
          <Button 
            variant={preventOverlap ? 'secondary' : 'outline'} 
            size="sm" 
            onClick={() => setPreventOverlap(!preventOverlap)} 
            className={`w-full text-xs h-8 ${preventOverlap ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' : ''}`}
          >
            <Layers className="w-3 h-3 mr-1.5" />
            {preventOverlap ? 'Smart Fill: ON' : 'Smart Fill: OFF'}
          </Button>
          <p className="text-[10px] text-slate-400 leading-tight">
            {preventOverlap ? 'Prevents overlapping other materials. Dirt tool always erases.' : 'Draws over existing materials.'}
          </p>
        </div>

        <div className="h-px bg-slate-200 w-full my-1"></div>

        <div className="flex flex-col gap-3 mt-auto pt-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex-1 h-9 bg-white" onClick={undo} disabled={historyIndex <= 0}>
                <Undo className="w-4 h-4 mr-1.5" /> Undo
              </Button>
              <Button variant="outline" className="flex-1 h-9 bg-white" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <Redo className="w-4 h-4 mr-1.5" /> Redo
              </Button>
            </div>
            <Button variant="outline" className="w-full h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => resetCanvas()}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Clear All
            </Button>
        </div>
      </div>

      {/* Right Canvas Area */}
      <div className="flex-1 border border-slate-300 shadow-inner rounded-xl overflow-hidden bg-slate-100 relative min-h-[500px] lg:min-h-0 flex justify-center items-center">
        <canvas 
          ref={bgCanvasRef} 
          width={CANVAS_SIZE} 
          height={CANVAS_SIZE} 
          className="hidden" 
        />
        <div className="relative w-full h-full max-w-full max-h-full aspect-square flex justify-center items-center">
            <canvas
              ref={displayCanvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="w-full h-full block touch-none object-fill"
              style={{ 
                 cursor: tool === 'polygon' ? 'crosshair' : 'crosshair',
              }}
              onMouseDown={startDrawing}
              onMouseMove={drawMove}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onDoubleClick={handleDoubleClick}
            />
        </div>
        
        {tool === 'polygon' && polygonPoints.length > 0 && (
            <Badge className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white shadow-md pointer-events-none">
                Double-click to close shape & fill
            </Badge>
        )}
        
        <div className="absolute bottom-4 left-4 text-[10px] font-medium text-white/90 bg-black/60 rounded px-2.5 py-1.5 pointer-events-none shadow-sm backdrop-blur-sm border border-white/10">
          Scale: 100ft × 100ft Area
        </div>
      </div>
    </div>
  );
}