import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, Sparkles, PenTool, Shapes, Trash2, MousePointer2, Plus, Move } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SignDesignerModal({ open, onClose, onSave, initialSign }) {
  const [activeTab, setActiveTab] = useState('dimensions');
  
  const [signName, setSignName] = useState('Custom Sign');
  const [shapeType, setShapeType] = useState('rectangle'); // rectangle, circle, custom
  const [widthInches, setWidthInches] = useState(48);
  const [heightInches, setHeightInches] = useState(24);
  const [depthInches, setDepthInches] = useState(12);
  
  const [faceColor, setFaceColor] = useState('#ffffff');
  const [sideColor, setSideColor] = useState('#475569');
  const [imageFileUrl, setImageFileUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [customPoints, setCustomPoints] = useState([]);
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('select');
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [draggingTarget, setDraggingTarget] = useState(null);

  // Initialize
  useEffect(() => {
    if (open) {
      if (initialSign) {
        setSignName(initialSign.name || 'Custom Sign');
        setShapeType(initialSign.shapeType || 'rectangle');
        setWidthInches(initialSign.width_inches || 48);
        setHeightInches(initialSign.height_inches || 24);
        setDepthInches(initialSign.depth_inches || 12);
        setFaceColor(initialSign.face_color || '#ffffff');
        setSideColor(initialSign.side_color || '#475569');
        setImageFileUrl(initialSign.image_url || '');
        setCustomPoints(JSON.parse(JSON.stringify(initialSign.shape?.points || [])));
      } else {
        // Defaults
        setSignName('Cabinet Sign');
        setShapeType('rectangle');
        setWidthInches(48);
        setHeightInches(24);
        setDepthInches(12);
        setFaceColor('#ffffff');
        setSideColor('#475569');
        setImageFileUrl('');
        setCustomPoints([]);
      }
      setActiveTab('dimensions');
      setMode('select');
      setSelectedIdx(null);
    }
  }, [open, initialSign]);

  // Generate points based on selected shape type
  const getGeneratedPoints = () => {
    if (shapeType === 'custom') return customPoints;
    
    const w2 = widthInches / 2;
    const h2 = heightInches / 2;
    
    if (shapeType === 'rectangle') {
      return [
        { x: -w2, y: -h2, type: 'line' },
        { x: w2, y: -h2, type: 'line' },
        { x: w2, y: h2, type: 'line' },
        { x: -w2, y: h2, type: 'line' }
      ];
    } else if (shapeType === 'circle') {
      const pts = [];
      for (let i = 0; i < 32; i++) {
        const theta = (i / 32) * Math.PI * 2;
        pts.push({
          x: Math.cos(theta) * w2,
          y: Math.sin(theta) * h2,
          type: 'line'
        });
      }
      return pts;
    }
    return [];
  };

  const currentPoints = getGeneratedPoints();

  // Draw canvas preview
  useEffect(() => {
    if (!canvasRef.current || !open) return;
    const ctx = canvasRef.current.getContext('2d');
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    
    ctx.clearRect(0, 0, w, h);
    
    const cx = w/2;
    const cy = h/2;
    
    // Grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for(let i = 0; i <= w; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }
    
    // Axes
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    if (currentPoints.length === 0) return;

    // Find bounding box to scale view
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    currentPoints.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      if(p.type === 'curve' && p.cx !== undefined) {
        minX = Math.min(minX, p.cx); maxX = Math.max(maxX, p.cx);
        minY = Math.min(minY, p.cy); maxY = Math.max(maxY, p.cy);
      }
    });

    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);
    const viewScale = Math.min((w - 80) / boxW, (h - 80) / boxH) || 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(viewScale, viewScale);

    // Draw filled shape
    ctx.beginPath();
    ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
    for (let i = 0; i < currentPoints.length; i++) {
      const p = currentPoints[i];
      const nextIdx = (i + 1) % currentPoints.length;
      const nextP = currentPoints[nextIdx];
      
      if (p.type === 'curve' && p.cx !== undefined) {
        ctx.quadraticCurveTo(p.cx, p.cy, nextP.x, nextP.y);
      } else {
        ctx.lineTo(nextP.x, nextP.y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = faceColor;
    ctx.fill();
    
    ctx.strokeStyle = sideColor;
    ctx.lineWidth = 2 / viewScale;
    ctx.stroke();

    // If custom shape, draw editable points
    if (shapeType === 'custom') {
      currentPoints.forEach((p, i) => {
        if (p.type === 'curve' && p.cx !== undefined) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.cx, p.cy);
          const nextP = currentPoints[(i + 1) % currentPoints.length];
          ctx.lineTo(nextP.x, nextP.y);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1 / viewScale;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(p.cx, p.cy, 5 / viewScale, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, (i === selectedIdx ? 7 : 5) / viewScale, 0, Math.PI * 2);
        ctx.fillStyle = i === selectedIdx ? '#ef4444' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2 / viewScale;
        ctx.stroke();
      });
    }

    ctx.restore();
  }, [currentPoints, selectedIdx, faceColor, sideColor, shapeType, widthInches, heightInches]);

  // Mouse handlers for custom shapes
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = canvasRef.current.width / 2;
    const cy = canvasRef.current.height / 2;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    currentPoints.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    });
    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);
    const viewScale = Math.min((canvasRef.current.width - 80) / boxW, (canvasRef.current.height - 80) / boxH) || 1;

    return {
      x: ((e.clientX - rect.left) - cx) / viewScale,
      y: ((e.clientY - rect.top) - cy) / viewScale
    };
  };

  const handlePointerDown = (e) => {
    if (shapeType !== 'custom') return;
    const pos = getMousePos(e);
    
    if (mode === 'add') {
      const newPts = [...customPoints];
      newPts.push({ x: pos.x, y: pos.y, type: 'line' });
      setCustomPoints(newPts);
      setSelectedIdx(newPts.length - 1);
      return;
    }
    
    for (let i = 0; i < customPoints.length; i++) {
      const p = customPoints[i];
      if (Math.hypot(p.x - pos.x, p.y - pos.y) < 15) {
        setSelectedIdx(i);
        setDraggingTarget({ type: 'point', index: i });
        return;
      }
      if (p.type === 'curve' && p.cx !== undefined) {
        if (Math.hypot(p.cx - pos.x, p.cy - pos.y) < 15) {
          setDraggingTarget({ type: 'control', index: i });
          return;
        }
      }
    }
    setSelectedIdx(null);
  };

  const handlePointerMove = (e) => {
    if (!draggingTarget || shapeType !== 'custom') return;
    const pos = getMousePos(e);
    const newPts = [...customPoints];
    if (draggingTarget.type === 'point') {
      newPts[draggingTarget.index].x = pos.x;
      newPts[draggingTarget.index].y = pos.y;
    } else {
      newPts[draggingTarget.index].cx = pos.x;
      newPts[draggingTarget.index].cy = pos.y;
    }
    setCustomPoints(newPts);
  };

  const handlePointerUp = () => setDraggingTarget(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAiLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageFileUrl(file_url);
    } catch (err) {
      alert('Failed to upload image. ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    onSave({
      shape: { points: currentPoints, closed: true },
      shapeType,
      width_inches: widthInches,
      height_inches: heightInches,
      depth_inches: depthInches,
      scale_multiplier: 1.0,
      image_url: imageFileUrl,
      face_color: faceColor,
      side_color: sideColor,
      id: initialSign?.id || `sign_${Date.now()}`,
      name: signName
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 bg-slate-50">
        <DialogHeader className="p-4 border-b bg-white shrink-0">
          <DialogTitle>Cabinet Sign Designer</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 min-h-0">
          <div className="w-80 border-r bg-white flex flex-col p-5 overflow-y-auto gap-6 custom-scrollbar shrink-0">
            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-800">Sign Settings</Label>
              <div>
                <Label className="text-xs text-slate-500">Cabinet Name</Label>
                <Input value={signName} onChange={e => setSignName(e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
              
              <div className="pt-2">
                <Label className="text-xs text-slate-500">Shape Type</Label>
                <Select value={shapeType} onValueChange={v => {
                  setShapeType(v);
                  if (v === 'custom' && customPoints.length === 0) {
                    setCustomPoints([
                        { x: -widthInches/2, y: -heightInches/2, type: 'line' },
                        { x: widthInches/2, y: -heightInches/2, type: 'line' },
                        { x: widthInches/2, y: heightInches/2, type: 'line' },
                        { x: -widthInches/2, y: heightInches/2, type: 'line' }
                    ]);
                  }
                }}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rectangle">Rectangle</SelectItem>
                    <SelectItem value="circle">Oval / Circle</SelectItem>
                    <SelectItem value="custom">Custom Vector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {shapeType !== 'custom' && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Label className="text-xs font-bold text-slate-700 uppercase">Size (Inches)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Width</Label>
                    <Input type="number" value={widthInches} onChange={e => setWidthInches(parseFloat(e.target.value)||1)} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Height</Label>
                    <Input type="number" value={heightInches} onChange={e => setHeightInches(parseFloat(e.target.value)||1)} className="mt-1 h-8 text-sm" />
                  </div>
                </div>
              </div>
            )}

            {shapeType === 'custom' && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Label className="text-xs font-bold text-blue-800 uppercase">Vector Tools</Label>
                <div className="flex bg-white rounded-md border p-1 shadow-sm gap-1">
                  <Button variant={mode === 'select' ? 'secondary' : 'ghost'} size="sm" className="flex-1 text-xs" onClick={() => setMode('select')}>
                    <MousePointer2 className="w-3 h-3 mr-1" /> Select
                  </Button>
                  <Button variant={mode === 'add' ? 'secondary' : 'ghost'} size="sm" className="flex-1 text-xs" onClick={() => setMode('add')}>
                    <Plus className="w-3 h-3 mr-1" /> Add Pt
                  </Button>
                </div>
                {selectedIdx !== null && (
                  <Button variant="destructive" size="sm" className="w-full text-xs" onClick={() => {
                    setCustomPoints(customPoints.filter((_, i) => i !== selectedIdx));
                    setSelectedIdx(null);
                  }}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete Point
                  </Button>
                )}
                <p className="text-[10px] text-blue-700 leading-tight">Click on the canvas to add or select points. Drag points to modify your custom shape. All coordinates are in inches relative to the center.</p>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-800">Materials & Colors</Label>
              <div>
                <Label className="text-xs text-slate-500">Depth / Thickness (inches)</Label>
                <Input type="number" value={depthInches} onChange={e => setDepthInches(parseFloat(e.target.value)||1)} className="mt-1 h-8 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Face Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={faceColor} onChange={e => setFaceColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-slate-300" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Side Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={sideColor} onChange={e => setSideColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-slate-300" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <Label className="text-xs font-bold text-slate-700 uppercase">Face Graphic / Image</Label>
              <div className="relative">
                <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={aiLoading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Button className="w-full bg-white text-slate-700 hover:bg-slate-100" variant="outline" disabled={aiLoading}>
                  <ImageIcon className="w-4 h-4 mr-2 text-slate-400" />
                  {aiLoading ? 'Uploading...' : (imageFileUrl ? 'Change Image' : 'Upload Image')}
                </Button>
              </div>
              {imageFileUrl && (
                <div className="mt-2 relative group rounded overflow-hidden border border-slate-200">
                  <img src={imageFileUrl} alt="Sign face" className="w-full h-auto max-h-32 object-contain bg-white" />
                  <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => setImageFileUrl('')}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 bg-slate-200/50 relative overflow-hidden flex flex-col items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
              <canvas 
                ref={canvasRef}
                width={800}
                height={600}
                className="block max-w-full h-auto touch-none"
                style={{ cursor: shapeType === 'custom' && mode === 'add' ? 'crosshair' : 'default' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
            <p className="mt-4 text-xs text-slate-400 text-center max-w-md">
              This is a 2D preview of your sign cabinet. The final 3D model will be generated with your specified depth and attached to the pole.
            </p>
          </div>
        </div>
        
        <DialogFooter className="p-4 border-t bg-white shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">Apply Cabinet to Pole</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}