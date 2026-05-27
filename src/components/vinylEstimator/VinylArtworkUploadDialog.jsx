// SVG / image artwork drop. Feature #34. Reads the file, extracts its
// natural dimensions (or SVG viewBox), and converts to a part at 1in per ~96px
// — the user can override the size after import.

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UploadCloud, FileImage } from "lucide-react";

// SVG viewBox parser → returns width/height in svg units (treated as inches)
const svgDims = async (file) => {
  const text = await file.text();
  const m = text.match(/viewBox\s*=\s*"([\d.\s-]+)"/i);
  if (m) {
    const parts = m[1].split(/\s+/).map(parseFloat);
    if (parts.length >= 4) return { w: parts[2], h: parts[3], unit: "svg" };
  }
  const wm = text.match(/<svg[^>]*\bwidth\s*=\s*"([\d.]+)/i);
  const hm = text.match(/<svg[^>]*\bheight\s*=\s*"([\d.]+)/i);
  if (wm && hm) return { w: parseFloat(wm[1]), h: parseFloat(hm[1]), unit: "svg" };
  return null;
};

const imgDims = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    resolve({ w: img.naturalWidth, h: img.naturalHeight, unit: "px" });
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
  img.src = url;
});

export default function VinylArtworkUploadDialog({ open, onClose, onAdd }) {
  const [parsed, setParsed] = useState(null);  // { name, w, h, unit }
  const [scale, setScale] = useState(96);       // px per inch
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    setError(null);
    setParsed(null);
    if (!file) return;
    try {
      let dims = null;
      if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
        dims = await svgDims(file);
      } else if (file.type.startsWith("image/")) {
        dims = await imgDims(file);
      }
      if (!dims) { setError("Could not read dimensions from this file."); return; }
      setParsed({ name: file.name.replace(/\.[^.]+$/, ""), ...dims });
    } catch (e) {
      setError(e.message);
    }
  };

  const inchesW = parsed ? (parsed.unit === "svg" ? parsed.w : parsed.w / Math.max(1, scale)) : 0;
  const inchesH = parsed ? (parsed.unit === "svg" ? parsed.h : parsed.h / Math.max(1, scale)) : 0;

  const handleAdd = () => {
    if (!parsed) return;
    onAdd({
      id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: parsed.name,
      width_inches: parseFloat(inchesW.toFixed(3)),
      height_inches: parseFloat(inchesH.toFixed(3)),
      quantity: 1,
      bleed_inches: 0,
      allow_rotation: true,
    });
    setParsed(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" /> Upload Artwork
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Drop an SVG or image. We'll pull its dimensions and add it as a part.
            SVGs use their viewBox directly (treated as inches). Raster images
            use the DPI below.
          </p>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50">
            <input
              type="file" accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="text-xs"
            />
            <FileImage className="w-8 h-8 mx-auto mt-2 text-slate-400" />
          </div>

          {parsed?.unit === "px" && (
            <div>
              <Label className="text-xs">DPI (pixels per inch)</Label>
              <Input type="number" value={scale} onChange={(e) => setScale(parseFloat(e.target.value) || 96)} className="h-8 text-sm tabular-nums" />
            </div>
          )}

          {parsed && (
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs space-y-1">
              <div className="font-semibold">{parsed.name}</div>
              <div className="text-slate-700">
                Raw: {parsed.w} × {parsed.h} {parsed.unit === "svg" ? "svg units" : "px"}
              </div>
              <div className="font-medium tabular-nums text-emerald-900">
                → {inchesW.toFixed(2)}″ × {inchesH.toFixed(2)}″
              </div>
            </div>
          )}

          {error && <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!parsed} className="bg-blue-600 hover:bg-blue-700 text-white">
            Add as Part
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}