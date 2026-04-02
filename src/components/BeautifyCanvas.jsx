import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Paintbrush, Square, Circle, Minus, PaintBucket, Undo, Redo } from 'lucide-react';

const CANVAS_SIZE = 1024;
const WORLD_SIZE = 200; // 200 feet
const PX_PER_FT = CANVAS_SIZE / WORLD_SIZE;

const MATERIALS = [
  { id: 'grass', name: 'Grass', color: '#4ade80' },
  { id: 'sidewalk', name: 'Sidewalk', color: '#94a3b8' },
  { id: 'driveway', name: 'Driveway', color: '#475569' },
  { id: 'mulch', name: 'Mulch', color: '#78350f' },
  { id: 'dirt', name: 'Dirt (Eraser)', color: '#7a5c3a' },
];

function hexToRgba(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
        255
    ] : [0,0,0,255];
}

const floodFill = (ctx, startX, startY, fillColorHex) => {
    const width = CANVAS_SIZE;
    const height = CANVAS_SIZE;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];

    const fillColor = hexToRgba(fillColorHex);
    
    const matchStartColor = (pos) => {
        return Math.abs(data[pos] - startR) < 5 &&
               Math.abs(data[pos+1] - startG) < 5 &&
               Math.abs(data[pos+2] - startB) < 5;
    };

    if (matchStartColor(startPos) && 
        Math.abs(startR - fillColor[0]) < 5 &&
        Math.abs(startG - fillColor[1]) < 5 &&
        Math.abs(startB - fillColor[2]) < 5) {
        return; 
    }

    const pixelStack = [[startX, startY]];
    
    while(pixelStack.length) {
        const newPos = pixelStack.pop();
        const x = newPos[0];
        let y = newPos[1];
        let pixelPos = (y * width + x) * 4;
        
        while(y-- >= 0 && matchStartColor(pixelPos)) {
            pixelPos -= width * 4;
        }
        pixelPos += width * 4;
        ++y;
        
        let reachLeft = false;
        let reachRight = false;
        
        while(y++ < height - 1 && matchStartColor(pixelPos)) {
            data[pixelPos] = fillColor[0];
            data[pixelPos+1] = fillColor[1];
            data[pixelPos+2] = fillColor[2];
            data[pixelPos+3] = 255;
            
            if(x > 0) {
                if(matchStartColor(pixelPos - 4)) {
                    if(!reachLeft) {
                        pixelStack.push([x - 1, y]);
                        reachLeft = true;
                    }
                } else if(reachLeft) {
                    reachLeft = false;
                }
            }
            
            if(x < width - 1) {
                if(matchStartColor(pixelPos + 4)) {
                    if(!reachRight) {
                        pixelStack.push([x + 1, y]);
                        reachRight = true;
                    }
                } else if(reachRight) {
                    reachRight = false;
                }
            }
            
            pixelPos += width * 4;
        }
    }
    ctx.putImageData(imageData, 0, 0);
};

export default function BeautifyCanvas({ dataUrl, foundationItems, onChange }) {
  const bgCanvasRef = useRef(null);
  const displayCanvasRef = useRef(null);

  const [matId, setMatId] = useState('grass');
  const [brushSize, setBrushSize] = useState(40);
  const [tool, setTool] = useState('brush');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [lastPos, setLastPos] = useState(null);
  
  const [initialized, setInitialized] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  function worldToCanvas(x_ft, z_ft) {
    return {
      x: (x_ft + WORLD_SIZE / 2) * PX_PER_FT,
      y: (z_ft + WORLD_SIZE / 2) * PX_PER_FT
    };
  }

  // Init canvas
  useEffect(() => {
    if (initialized) return;
    const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (dataUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        bgCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        bgCtx.drawImage(img, 0, 0);
        renderDisplay();
        
        // Setup initial history state
        const initialData = bgCanvasRef.current.toDataURL('image/jpeg', 0.8);
        setHistory([initialData]);
        setHistoryIndex(0);
        setInitialized(true);
      };
      img.src = dataUrl;
    } else {
      resetCanvas(true); // pass true for initial setup
      setInitialized(true);
    }
  }, [dataUrl, initialized]);

  const saveState = () => {
    const data = bgCanvasRef.current.toDataURL('image/jpeg', 0.8);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(data);
    // limit history size to prevent memory explosion
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
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        loadState(history[newIndex]);
        setHistoryIndex(newIndex);
        onChange(history[newIndex]);
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
    bgCtx.fillStyle = '#7a5c3a'; // Dirt
    bgCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Add noise to dirt
    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * CANVAS_SIZE;
      const y = Math.random() * CANVAS_SIZE;
      const r = Math.random() * 2 + 0.5;
      bgCtx.beginPath();
      bgCtx.arc(x, y, r, 0, Math.PI * 2);
      bgCtx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
      bgCtx.fill();
    }
    
    renderDisplay();
    
    const initialData = bgCanvasRef.current.toDataURL('image/jpeg', 0.8);
    if (isInitial) {
        setHistory([initialData]);
        setHistoryIndex(0);
    } else {
        saveState();
    }
  };

  const renderDisplay = () => {
    if (!displayCanvasRef.current || !bgCanvasRef.current) return;
    const ctx = displayCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(bgCanvasRef.current, 0, 0);

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

      // Add user offsets
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
  }, [foundationItems, initialized]);

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
    
    if (tool === 'fill') {
        const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
        const color = MATERIALS.find(m => m.id === matId).color;
        floodFill(bgCtx, Math.round(pos.x), Math.round(pos.y), color);
        renderDisplay();
        saveState();
        return;
    }
    
    setIsDrawing(true);
    setStartPos(pos);
    setLastPos(pos);

    if (tool === 'brush') {
        drawStroke(pos, pos);
    }
  };

  const drawMove = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    
    if (tool === 'brush') {
        drawStroke(lastPos, pos);
        setLastPos(pos);
    } else {
        renderDisplay();
        drawShapePreview(startPos, pos);
    }
  };

  const stopDrawing = (e) => {
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
    const color = MATERIALS.find(m => m.id === matId).color;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
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
        ctx.stroke();
    } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
  };

  const drawShapeFinal = (start, end) => {
    const ctx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
    const color = MATERIALS.find(m => m.id === matId).color;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
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
        ctx.stroke();
    } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    renderDisplay();
  };

  const drawStroke = (start, end) => {
    const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
    const color = MATERIALS.find(m => m.id === matId).color;
    bgCtx.beginPath();
    bgCtx.moveTo(start.x, start.y);
    bgCtx.lineTo(end.x, end.y);
    bgCtx.strokeStyle = color;
    bgCtx.lineWidth = brushSize;
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';
    bgCtx.stroke();
    
    renderDisplay();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 bg-white p-4 border rounded-lg shadow-sm">
        
        {/* Tools and Undo/Redo */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-1">
            <Button variant={tool === 'brush' ? 'default' : 'ghost'} size="icon" onClick={() => setTool('brush')} title="Brush">
              <Paintbrush className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'rect' ? 'default' : 'ghost'} size="icon" onClick={() => setTool('rect')} title="Rectangle">
              <Square className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'circle' ? 'default' : 'ghost'} size="icon" onClick={() => setTool('circle')} title="Circle">
              <Circle className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'line' ? 'default' : 'ghost'} size="icon" onClick={() => setTool('line')} title="Line">
              <Minus className="w-4 h-4" />
            </Button>
            <Button variant={tool === 'fill' ? 'default' : 'ghost'} size="icon" onClick={() => setTool('fill')} title="Fill Bucket">
              <PaintBucket className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo">
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
              <Redo className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Material and Settings */}
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <Label className="text-xs">Material</Label>
            <Select value={matId} onValueChange={setMatId}>
              <SelectTrigger className="w-[180px] h-9 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIALS.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded border border-slate-300" style={{ backgroundColor: m.color }} />
                      {m.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={tool === 'fill' ? 'opacity-50 pointer-events-none' : ''}>
            <Label className="text-xs">Size</Label>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="range" 
                min="10" max="200" 
                value={brushSize} 
                onChange={e => setBrushSize(parseInt(e.target.value))} 
                className="w-32"
                disabled={tool === 'fill'}
              />
              <span className="text-xs w-8 text-slate-500">{brushSize}px</span>
            </div>
          </div>
          <div className="flex-1 text-right">
            <Button variant="outline" size="sm" onClick={() => resetCanvas()} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-1" /> Reset Canvas
            </Button>
          </div>
        </div>

      </div>

      <div className="border border-slate-300 shadow-inner rounded-lg overflow-hidden bg-slate-100 relative max-w-[800px] mx-auto" style={{ cursor: tool === 'fill' ? 'crosshair' : 'crosshair' }}>
        <canvas 
          ref={bgCanvasRef} 
          width={CANVAS_SIZE} 
          height={CANVAS_SIZE} 
          className="hidden" 
        />
        <canvas
          ref={displayCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-auto block touch-none"
          onMouseDown={startDrawing}
          onMouseMove={drawMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        <div className="absolute top-2 left-2 text-xs text-white/90 bg-black/40 rounded px-2 py-1 pointer-events-none">
          Draw on the project site
        </div>
      </div>
    </div>
  );
}