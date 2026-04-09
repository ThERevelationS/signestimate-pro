import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, Sparkles, PenTool, Shapes, Trash2, MousePointer2, Plus, Move, Circle, Square } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SignDesignerModal({ open, onClose, onSave, initialSign }) {
  const [activeTab, setActiveTab] = useState('elements');
  
  const [signName, setSignName] = useState('Custom Sign');
  const [depthInches, setDepthInches] = useState(12);
  const [faceColor, setFaceColor] = useState('#ffffff');
  const [returnColor, setReturnColor] = useState('#475569');
  const [imageFileUrl, setImageFileUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [elements, setElements] = useState([]);
  const [selectedElId, setSelectedElId] = useState(null);

  const canvasRef = useRef(null);
  const [mode, setMode] = useState('select'); // select, add_point
  const [draggingTarget, setDraggingTarget] = useState(null);
  const [selectedPointIdx, setSelectedPointIdx] = useState(null);

  // Initialize
  useEffect(() => {
    if (open) {
      if (initialSign) {
        setSignName(initialSign.name || 'Custom Sign');
        setDepthInches(initialSign.depth_inches || 12);
        setFaceColor(initialSign.face_color || '#ffffff');
        setReturnColor(initialSign.side_color || initialSign.return_color || '#475569');
        setImageFileUrl(initialSign.image_url || '');
        
        if (initialSign.elements && initialSign.elements.length > 0) {
            setElements(JSON.parse(JSON.stringify(initialSign.elements)));
        } else if (initialSign.shape) {
            // legacy fallback
            setElements([{
                id: 1,
                type: initialSign.shapeType || 'rectangle',
                width: initialSign.width_inches || 48,
                height: initialSign.height_inches || 24,
                x: 0,
                y: 0,
                points: initialSign.shape.points || []
            }]);
        } else {
            setElements([]);
        }
      } else {
        // Defaults
        setSignName('Cabinet Sign');
        setDepthInches(12);
        setFaceColor('#ffffff');
        setReturnColor('#475569');
        setImageFileUrl('');
        setElements([
            { id: Date.now(), type: 'rectangle', width: 48, height: 24, x: 0, y: 0 }
        ]);
      }
      setActiveTab('elements');
      setMode('select');
      setSelectedElId(null);
      setSelectedPointIdx(null);
    }
  }, [open, initialSign]);

  const addElement = (type) => {
      const newEl = {
          id: Date.now(),
          type,
          width: 48,
          height: 24,
          x: 0,
          y: 0,
          points: type === 'custom' ? [
              { x: -24, y: -12, type: 'line' },
              { x: 24, y: -12, type: 'line' },
              { x: 24, y: 12, type: 'line' },
              { x: -24, y: 12, type: 'line' }
          ] : []
      };
      setElements([...elements, newEl]);
      setSelectedElId(newEl.id);
  };

  const removeElement = (id) => {
      setElements(elements.filter(e => e.id !== id));
      if (selectedElId === id) setSelectedElId(null);
  };

  const updateElement = (id, updates) => {
      setElements(elements.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const selectedEl = elements.find(e => e.id === selectedElId);

  const getPointsForElement = (el) => {
      if (el.type === 'custom') return el.points;
      const w2 = el.width / 2;
      const h2 = el.height / 2;
      if (el.type === 'rectangle') {
          return [
              { x: -w2, y: -h2, type: 'line' },
              { x: w2, y: -h2, type: 'line' },
              { x: w2, y: h2, type: 'line' },
              { x: -w2, y: h2, type: 'line' }
          ];
      } else if (el.type === 'circle') {
          const pts = [];
          for (let i = 0; i < 32; i++) {
              const theta = (i / 32) * Math.PI * 2;
              pts.push({ x: Math.cos(theta) * w2, y: Math.sin(theta) * h2, type: 'line' });
          }
          return pts;
      }
      return [];
  };

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

    if (elements.length === 0) return;

    // Find bounding box to scale view
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    elements.forEach(el => {
        const pts = getPointsForElement(el);
        pts.forEach(p => {
            const absX = p.x + el.x;
            const absY = p.y + el.y;
            minX = Math.min(minX, absX); maxX = Math.max(maxX, absX);
            minY = Math.min(minY, absY); maxY = Math.max(maxY, absY);
        });
    });

    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);
    const viewScale = Math.min((w - 80) / boxW, (h - 80) / boxH) || 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(viewScale, viewScale);

    // Draw all elements
    elements.forEach(el => {
        const pts = getPointsForElement(el);
        if(pts.length === 0) return;

        ctx.save();
        ctx.translate(el.x, el.y);

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const nextIdx = (i + 1) % pts.length;
          const nextP = pts[nextIdx];
          
          if (p.type === 'curve' && p.cx !== undefined) {
            ctx.quadraticCurveTo(p.cx, p.cy, nextP.x, nextP.y);
          } else {
            ctx.lineTo(nextP.x, nextP.y);
          }
        }
        ctx.closePath();
        
        ctx.fillStyle = el.id === selectedElId ? faceColor : faceColor + '88';
        ctx.fill();
        ctx.strokeStyle = el.id === selectedElId ? '#2563eb' : returnColor;
        ctx.lineWidth = (el.id === selectedElId ? 3 : 2) / viewScale;
        ctx.stroke();

        // Draw points for custom shapes if selected
        if (el.id === selectedElId && el.type === 'custom') {
            pts.forEach((p, i) => {
                if (p.type === 'curve' && p.cx !== undefined) {
                  ctx.beginPath();
                  ctx.moveTo(p.x, p.y);
                  ctx.lineTo(p.cx, p.cy);
                  ctx.lineTo(pts[(i + 1) % pts.length].x, pts[(i + 1) % pts.length].y);
                  ctx.strokeStyle = '#94a3b8';
                  ctx.lineWidth = 1 / viewScale;
                  ctx.stroke();
                  
                  ctx.beginPath();
                  ctx.arc(p.cx, p.cy, 5 / viewScale, 0, Math.PI * 2);
                  ctx.fillStyle = '#f59e0b';
                  ctx.fill();
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, (i === selectedPointIdx ? 7 : 5) / viewScale, 0, Math.PI * 2);
                ctx.fillStyle = i === selectedPointIdx ? '#ef4444' : '#ffffff';
                ctx.fill();
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 2 / viewScale;
                ctx.stroke();
            });
        }
        ctx.restore();
    });

    ctx.restore();
  }, [elements, selectedElId, selectedPointIdx, faceColor, returnColor]);

  // Mouse handlers
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = canvasRef.current.width / 2;
    const cy = canvasRef.current.height / 2;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    elements.forEach(el => {
        const pts = getPointsForElement(el);
        pts.forEach(p => {
            const absX = p.x + el.x;
            const absY = p.y + el.y;
            minX = Math.min(minX, absX); maxX = Math.max(maxX, absX);
            minY = Math.min(minY, absY); maxY = Math.max(maxY, absY);
        });
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
    const pos = getMousePos(e);
    
    // If we have a selected custom shape, check its points
    if (selectedEl && selectedEl.type === 'custom') {
        const pts = selectedEl.points;
        const localPos = { x: pos.x - selectedEl.x, y: pos.y - selectedEl.y };
        
        if (mode === 'add') {
          const newPts = [...pts];
          newPts.push({ x: localPos.x, y: localPos.y, type: 'line' });
          updateElement(selectedEl.id, { points: newPts });
          setSelectedPointIdx(newPts.length - 1);
          return;
        }

        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (Math.hypot(p.x - localPos.x, p.y - localPos.y) < 15) {
            setSelectedPointIdx(i);
            setDraggingTarget({ type: 'point', index: i });
            return;
          }
          if (p.type === 'curve' && p.cx !== undefined) {
            if (Math.hypot(p.cx - localPos.x, p.cy - localPos.y) < 15) {
              setDraggingTarget({ type: 'control', index: i });
              return;
            }
          }
        }
    }

    // Otherwise, check if we clicked inside any element to select it (bounding box approximation)
    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        let w2 = el.width/2;
        let h2 = el.height/2;
        if (el.type === 'custom') {
            w2 = Math.max(...el.points.map(p=>Math.abs(p.x)));
            h2 = Math.max(...el.points.map(p=>Math.abs(p.y)));
        }
        if (pos.x >= el.x - w2 && pos.x <= el.x + w2 && pos.y >= el.y - h2 && pos.y <= el.y + h2) {
            setSelectedElId(el.id);
            setSelectedPointIdx(null);
            setDraggingTarget({ type: 'shape', id: el.id, startX: pos.x, startY: pos.y, initX: el.x, initY: el.y });
            return;
        }
    }
    
    setSelectedElId(null);
    setSelectedPointIdx(null);
  };

  const handlePointerMove = (e) => {
    if (!draggingTarget) return;
    const pos = getMousePos(e);
    
    if (draggingTarget.type === 'shape') {
        const dx = pos.x - draggingTarget.startX;
        const dy = pos.y - draggingTarget.startY;
        updateElement(draggingTarget.id, { x: draggingTarget.initX + dx, y: draggingTarget.initY + dy });
    } else if (selectedEl && selectedEl.type === 'custom') {
        const localPos = { x: pos.x - selectedEl.x, y: pos.y - selectedEl.y };
        const newPts = [...selectedEl.points];
        if (draggingTarget.type === 'point') {
          newPts[draggingTarget.index].x = localPos.x;
          newPts[draggingTarget.index].y = localPos.y;
        } else {
          newPts[draggingTarget.index].cx = localPos.x;
          newPts[draggingTarget.index].cy = localPos.y;
        }
        updateElement(selectedEl.id, { points: newPts });
    }
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
      elements,
      depth_inches: depthInches,
      scale_multiplier: 1.0,
      image_url: imageFileUrl,
      face_color: faceColor,
      side_color: returnColor,
      return_color: returnColor,
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
              <div className="pt-2 flex flex-wrap gap-2">
                 <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => addElement('rectangle')}><Square className="w-3 h-3 mr-1" /> Add Box</Button>
                 <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => addElement('circle')}><Circle className="w-3 h-3 mr-1" /> Add Oval</Button>
                 <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => addElement('custom')}><PenTool className="w-3 h-3 mr-1" /> Add Custom</Button>
              </div>
            </div>

            {selectedEl && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Selected Element</Label>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => removeElement(selectedEl.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
                
                {selectedEl.type !== 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-slate-500">Width</Label>
                        <Input type="number" value={selectedEl.width} onChange={e => updateElement(selectedEl.id, { width: parseFloat(e.target.value)||1 })} className="mt-1 h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Height</Label>
                        <Input type="number" value={selectedEl.height} onChange={e => updateElement(selectedEl.id, { height: parseFloat(e.target.value)||1 })} className="mt-1 h-8 text-sm" />
                      </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Offset X</Label>
                    <Input type="number" value={selectedEl.x} onChange={e => updateElement(selectedEl.id, { x: parseFloat(e.target.value)||0 })} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Offset Y</Label>
                    <Input type="number" value={selectedEl.y} onChange={e => updateElement(selectedEl.id, { y: parseFloat(e.target.value)||0 })} className="mt-1 h-8 text-sm" />
                  </div>
                </div>

                {selectedEl.type === 'custom' && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <Label className="text-xs font-bold text-blue-800 uppercase mb-2 block">Vector Tools</Label>
                    <div className="flex bg-white rounded-md border p-1 shadow-sm gap-1 mb-2">
                      <Button variant={mode === 'select' ? 'secondary' : 'ghost'} size="sm" className="flex-1 text-xs" onClick={() => setMode('select')}>
                        <MousePointer2 className="w-3 h-3 mr-1" /> Select
                      </Button>
                      <Button variant={mode === 'add' ? 'secondary' : 'ghost'} size="sm" className="flex-1 text-xs" onClick={() => setMode('add')}>
                        <Plus className="w-3 h-3 mr-1" /> Add Pt
                      </Button>
                    </div>
                    {selectedPointIdx !== null && (
                      <Button variant="destructive" size="sm" className="w-full text-xs" onClick={() => {
                        const newPts = selectedEl.points.filter((_, i) => i !== selectedPointIdx);
                        updateElement(selectedEl.id, { points: newPts });
                        setSelectedPointIdx(null);
                      }}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete Point
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-800">Global Materials & Colors</Label>
              <div>
                <Label className="text-xs text-slate-500">Total Depth / Thickness (inches)</Label>
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
                  <Label className="text-xs text-slate-500">Return Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={returnColor} onChange={e => setReturnColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-slate-300" />
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
                style={{ cursor: selectedEl && selectedEl.type === 'custom' && mode === 'add' ? 'crosshair' : 'default' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
            <p className="mt-4 text-xs text-slate-400 text-center max-w-md">
              Drag shapes to move them. Overlapping shapes will be combined into a single sign cabinet structure when rendered in 3D.
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