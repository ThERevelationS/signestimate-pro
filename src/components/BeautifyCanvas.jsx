import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

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

export default function BeautifyCanvas({ dataUrl, foundationItems, onChange }) {
  const bgCanvasRef = useRef(null);
  const displayCanvasRef = useRef(null);

  const [matId, setMatId] = useState('grass');
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);

  function worldToCanvas(x_ft, z_ft) {
    return {
      x: (x_ft + WORLD_SIZE / 2) * PX_PER_FT,
      y: (z_ft + WORLD_SIZE / 2) * PX_PER_FT
    };
  }

  // Init canvas
  useEffect(() => {
    const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (dataUrl) {
      const img = new Image();
      img.onload = () => {
        bgCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        bgCtx.drawImage(img, 0, 0);
        renderDisplay();
      };
      img.src = dataUrl;
    } else {
      resetCanvas();
    }
  }, []);

  const resetCanvas = () => {
    const bgCtx = bgCanvasRef.current.getContext('2d');
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
    saveData();
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

      for (let i = 0; i < qty; i++) {
        const col = i % gridSize;
        const row = Math.floor(i / gridSize);
        const ox = cumulativeOffsetX + col * spacingX + footprintX / 2;
        const oz = row * spacingZ + footprintZ / 2;

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
    renderDisplay();
  }, [foundationItems]);

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
    setIsDrawing(true);
    const pos = getMousePos(e);
    setLastPos(pos);
    drawStroke(pos, pos);
  };

  const drawMove = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    drawStroke(lastPos, pos);
    setLastPos(pos);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveData();
    }
  };

  const drawStroke = (start, end) => {
    const bgCtx = bgCanvasRef.current.getContext('2d');
    const color = MATERIALS.find(m => m.id === matId).color;
    bgCtx.beginPath();
    bgCtx.moveTo(start.x, start.y);
    bgCtx.lineTo(end.x, end.y);
    bgCtx.strokeStyle = color;
    bgCtx.lineWidth = brushSize;
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';
    bgCtx.stroke();
    
    // Optional: could add some noise generation along the path here, but solid is fine for MS Paint style
    renderDisplay();
  };

  const saveData = () => {
    const url = bgCanvasRef.current.toDataURL('image/jpeg', 0.6);
    onChange(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4 flex-wrap bg-white p-4 border rounded-lg">
        <div>
          <Label className="text-xs">Brush Material</Label>
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
        <div>
          <Label className="text-xs">Brush Size</Label>
          <div className="flex items-center gap-2 mt-1">
            <input 
              type="range" 
              min="10" max="200" 
              value={brushSize} 
              onChange={e => setBrushSize(parseInt(e.target.value))} 
              className="w-32"
            />
            <span className="text-xs w-8 text-slate-500">{brushSize}px</span>
          </div>
        </div>
        <div className="flex-1 text-right">
          <Button variant="outline" size="sm" onClick={resetCanvas} className="text-red-600">
            <Trash2 className="w-4 h-4 mr-1" /> Reset Canvas
          </Button>
        </div>
      </div>

      <div className="border border-slate-300 shadow-inner rounded-lg overflow-hidden bg-slate-100 relative max-w-[800px] mx-auto cursor-crosshair">
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
          className="w-full h-auto block"
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