import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image as ImageIcon, Sparkles, PenTool, Shapes, Trash2, MousePointer2, Plus, Move } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PREMADE_SHAPES = [
  {
    name: 'Rectangle',
    points: [
      { x: -50, y: -25, type: 'line' },
      { x: 50, y: -25, type: 'line' },
      { x: 50, y: 25, type: 'line' },
      { x: -50, y: 25, type: 'line' }
    ]
  },
  {
    name: 'Circle',
    points: [
      { x: 0, y: -50, type: 'curve', cx: 50, cy: -50 },
      { x: 50, y: 0, type: 'curve', cx: 50, cy: 50 },
      { x: 0, y: 50, type: 'curve', cx: -50, cy: 50 },
      { x: -50, y: 0, type: 'curve', cx: -50, cy: -50 }
    ]
  },
  {
    name: 'Shield',
    points: [
      { x: -40, y: -50, type: 'line' },
      { x: 40, y: -50, type: 'line' },
      { x: 40, y: 10, type: 'curve', cx: 40, cy: 50 },
      { x: 0, y: 60, type: 'curve', cx: -40, cy: 50 },
      { x: -40, y: 10, type: 'line' }
    ]
  }
];

export default function SignDesignerModal({ open, onClose, onSave, initialSign }) {
  const canvasRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('draw');
  const [points, setPoints] = useState([]);
  const [depthInches, setDepthInches] = useState(12);
  const [scaleMultiplier, setScaleMultiplier] = useState(1.0);
  const [imageFileUrl, setImageFileUrl] = useState('');
  
  const [mode, setMode] = useState('select'); // 'select', 'add'
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [draggingTarget, setDraggingTarget] = useState(null); // { type: 'point'|'control', index: number }

  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialSign) {
        setPoints(JSON.parse(JSON.stringify(initialSign.shape?.points || PREMADE_SHAPES[0].points)));
        setDepthInches(initialSign.depth_inches || 12);
        setScaleMultiplier(initialSign.scale_multiplier || 1.0);
        setImageFileUrl(initialSign.image_url || '');
      } else {
        setPoints(JSON.parse(JSON.stringify(PREMADE_SHAPES[0].points)));
        setDepthInches(12);
        setScaleMultiplier(1.0);
        setImageFileUrl('');
      }
      setMode('select');
      setSelectedIdx(null);
    }
  }, [open, initialSign]);

  // Canvas drawing
  useEffect(() => {
    if (!canvasRef.current || !open) return;
    const ctx = canvasRef.current.getContext('2d');
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    
    ctx.clearRect(0, 0, w, h);
    
    // Draw Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for(let i = 0; i <= w; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
    
    const cx = w/2;
    const cy = h/2;
    
    if (points.length > 0) {
      // Draw filled shape
      ctx.beginPath();
      ctx.moveTo(cx + points[0].x, cy + points[0].y);
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const nextIdx = (i + 1) % points.length;
        const nextP = points[nextIdx];
        
        if (p.type === 'curve' && p.cx !== undefined) {
          ctx.quadraticCurveTo(cx + p.cx, cy + p.cy, cx + nextP.x, cy + nextP.y);
        } else {
          ctx.lineTo(cx + nextP.x, cy + nextP.y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fill();
      
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw points and handles
      points.forEach((p, i) => {
        // Draw control line if curve
        if (p.type === 'curve' && p.cx !== undefined) {
          ctx.beginPath();
          ctx.moveTo(cx + p.x, cy + p.y);
          ctx.lineTo(cx + p.cx, cy + p.cy);
          const nextP = points[(i + 1) % points.length];
          ctx.lineTo(cx + nextP.x, cy + nextP.y);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Control point handle
          ctx.beginPath();
          ctx.arc(cx + p.cx, cy + p.cy, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          ctx.strokeStyle = '#b45309';
          ctx.stroke();
        }
        
        // Main vertex
        ctx.beginPath();
        ctx.arc(cx + p.x, cy + p.y, i === selectedIdx ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = i === selectedIdx ? '#ef4444' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = i === selectedIdx ? '#991b1b' : '#2563eb';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      
      // Draw measurements (bounding box)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      points.forEach(p => {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        if(p.type === 'curve' && p.cx !== undefined) {
          minX = Math.min(minX, p.cx); maxX = Math.max(maxX, p.cx);
          minY = Math.min(minY, p.cy); maxY = Math.max(maxY, p.cy);
        }
      });
      const width = maxX - minX;
      const height = maxY - minY;
      
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px sans-serif';
      ctx.fillText(`W: ${(width * scaleMultiplier).toFixed(1)}"`, cx + minX, cy + maxY + 20);
      ctx.fillText(`H: ${(height * scaleMultiplier).toFixed(1)}"`, cx + maxX + 10, cy + minY + height/2);
    }
  }, [points, selectedIdx, scaleMultiplier, open]);

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = canvasRef.current.width / 2;
    const cy = canvasRef.current.height / 2;
    return {
      x: (e.clientX - rect.left) - cx,
      y: (e.clientY - rect.top) - cy
    };
  };

  const handlePointerDown = (e) => {
    const pos = getMousePos(e);
    
    if (mode === 'add') {
      const newPts = [...points];
      newPts.push({ x: pos.x, y: pos.y, type: 'line' });
      setPoints(newPts);
      setSelectedIdx(newPts.length - 1);
      return;
    }
    
    // Check hit test for control points first
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.type === 'curve' && p.cx !== undefined) {
        if (Math.hypot(p.cx - pos.x, p.cy - pos.y) < 10) {
          setDraggingTarget({ type: 'control', index: i });
          return;
        }
      }
    }
    
    // Check hit test for vertices
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (Math.hypot(p.x - pos.x, p.y - pos.y) < 10) {
        setSelectedIdx(i);
        setDraggingTarget({ type: 'point', index: i });
        return;
      }
    }
    
    setSelectedIdx(null);
  };

  const handlePointerMove = (e) => {
    if (!draggingTarget) return;
    const pos = getMousePos(e);
    const newPts = [...points];
    
    if (draggingTarget.type === 'point') {
      newPts[draggingTarget.index].x = pos.x;
      newPts[draggingTarget.index].y = pos.y;
    } else if (draggingTarget.type === 'control') {
      newPts[draggingTarget.index].cx = pos.x;
      newPts[draggingTarget.index].cy = pos.y;
    }
    setPoints(newPts);
  };

  const handlePointerUp = () => {
    setDraggingTarget(null);
  };
  
  const toggleSegmentType = () => {
    if (selectedIdx === null) return;
    const newPts = [...points];
    const p = newPts[selectedIdx];
    if (p.type === 'line') {
      p.type = 'curve';
      const nextIdx = (selectedIdx + 1) % points.length;
      const nextP = newPts[nextIdx];
      // Place control point halfway and offset
      p.cx = (p.x + nextP.x) / 2 + 20;
      p.cy = (p.y + nextP.y) / 2 - 20;
    } else {
      p.type = 'line';
      delete p.cx;
      delete p.cy;
    }
    setPoints(newPts);
  };

  const deleteSelectedPoint = () => {
    if (selectedIdx === null || points.length <= 3) return;
    const newPts = points.filter((_, i) => i !== selectedIdx);
    setPoints(newPts);
    setSelectedIdx(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAiLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageFileUrl(file_url);
      
      // Use LLM to extract contour points
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Look at the sign in this image. I need a rough 2D polygon (array of x, y coordinates centered around 0,0 with max width/height around 100) representing its outer shape boundary. Return ONLY valid JSON matching this schema: {"points": [{"x": number, "y": number, "type": "line"}]}. Return at least 4 points, max 12.`,
        file_urls: [file_url],
        model: 'automatic',
        response_json_schema: {
          type: "object",
          properties: {
            points: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                  type: { type: "string" }
                }
              }
            }
          }
        }
      });
      
      if (res && res.points && res.points.length >= 3) {
        setPoints(res.points);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process AI image. ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    onSave({
      shape: { points, closed: true },
      depth_inches: depthInches,
      scale_multiplier: scaleMultiplier,
      image_url: imageFileUrl,
      id: initialSign?.id || `sign_${Date.now()}`,
      name: initialSign?.name || 'Custom Sign'
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Cabinet Sign Designer</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Left tools */}
          <div className="w-64 border-r bg-slate-50 flex flex-col p-4 overflow-y-auto gap-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="draw" className="text-[10px]">Draw</TabsTrigger>
                <TabsTrigger value="shapes" className="text-[10px]">Premade</TabsTrigger>
                <TabsTrigger value="ai" className="text-[10px]">AI</TabsTrigger>
              </TabsList>
              
              <TabsContent value="draw" className="space-y-4 mt-4">
                <div className="flex bg-white rounded-md border p-1 shadow-sm gap-1">
                  <Button variant={mode === 'select' ? 'secondary' : 'ghost'} size="sm" className="flex-1 text-xs h-8" onClick={() => setMode('select')}>
                    <MousePointer2 className="w-3 h-3 mr-1" /> Select
                  </Button>
                  <Button variant={mode === 'add' ? 'secondary' : 'ghost'} size="sm" className="flex-1 text-xs h-8" onClick={() => setMode('add')}>
                    <Plus className="w-3 h-3 mr-1" /> Add Pt
                  </Button>
                </div>
                
                {selectedIdx !== null && (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg space-y-3">
                    <p className="text-xs font-semibold text-blue-900">Point {selectedIdx + 1} Selected</p>
                    <Button variant="outline" size="sm" className="w-full text-xs h-8 bg-white" onClick={toggleSegmentType}>
                      {points[selectedIdx].type === 'line' ? 'Convert path to Curve' : 'Convert path to Line'}
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs h-8 text-red-600 hover:text-red-700 bg-white" onClick={deleteSelectedPoint}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete Point
                    </Button>
                  </div>
                )}
                
                <div className="text-xs text-slate-500">
                  <p>• Click points to select them.</p>
                  <p>• Drag points to move.</p>
                  <p>• Drag orange handles to adjust curves.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="shapes" className="space-y-3 mt-4">
                <p className="text-xs text-slate-500 mb-2">Apply a starting base shape:</p>
                {PREMADE_SHAPES.map(s => (
                  <Button key={s.name} variant="outline" className="w-full justify-start h-9 bg-white" onClick={() => {
                    setPoints(JSON.parse(JSON.stringify(s.points)));
                    setSelectedIdx(null);
                  }}>
                    <Shapes className="w-4 h-4 mr-2 text-indigo-500" /> {s.name}
                  </Button>
                ))}
              </TabsContent>
              
              <TabsContent value="ai" className="space-y-4 mt-4">
                <div className="bg-indigo-50 border-indigo-100 border p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-indigo-900 flex items-center mb-2">
                    <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" /> AI Auto-Trace
                  </h4>
                  <p className="text-xs text-indigo-700 mb-3">Upload a reference image of a sign. AI will generate a vector cabinet shape matching its bounds.</p>
                  
                  <div className="relative">
                    <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={aiLoading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Button className="w-full" variant="outline" disabled={aiLoading}>
                      {aiLoading ? 'Analyzing...' : 'Upload Image'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="h-px bg-slate-200"></div>
            
            <div className="space-y-4">
              <Label className="text-xs font-bold text-slate-700 uppercase">Cabinet Dimensions</Label>
              <div>
                <Label className="text-xs text-slate-500">Scale Multiplier</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" step="0.1" value={scaleMultiplier} onChange={e => setScaleMultiplier(parseFloat(e.target.value)||1)} className="h-8 text-xs" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Depth / Thickness (inches)</Label>
                <Input type="number" value={depthInches} onChange={e => setDepthInches(parseFloat(e.target.value)||1)} className="h-8 text-xs mt-1" />
              </div>
            </div>
          </div>
          
          {/* Right Canvas */}
          <div className="flex-1 bg-slate-200 relative overflow-hidden flex items-center justify-center p-4">
            <div className="relative border shadow-sm bg-white" style={{ width: 600, height: 600 }}>
              <canvas 
                ref={canvasRef}
                width={600}
                height={600}
                className="block w-full h-full touch-none"
                style={{ cursor: mode === 'add' ? 'crosshair' : 'default' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="p-4 border-t bg-slate-50">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Cabinet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}