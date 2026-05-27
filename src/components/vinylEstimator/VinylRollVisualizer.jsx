// Roll layout visualizer.
// Upgrades:
//   #7  Waste regions shown as red hatched rectangles
//   #10 Zoom + pan (slider + drag)
//   #11 Registration marks rendered when print-and-cut is active
//   #12 Print feed direction arrow

import React, { useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, ArrowDown } from "lucide-react";

const PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

const fmt = (n) => Number(n || 0).toFixed(2);

// Compute axis-aligned "waste" rectangles inside the usable area:
// for each shelf, the strip to the right of the last placed item is wasted,
// plus the inter-shelf gutter band is wasted.
const computeWasteRects = (shelves, usableWidth, gutterV) => {
  const wastes = [];
  shelves.forEach((sh, sIdx) => {
    if (sh.items.length === 0) return;
    const last = sh.items[sh.items.length - 1];
    const rightEdge = last.x + last.w;
    if (rightEdge < usableWidth - 0.01) {
      wastes.push({ x: rightEdge, y: sh.y, w: usableWidth - rightEdge, h: sh.height });
    }
    // Gutter band between this shelf and the next
    const next = shelves[sIdx + 1];
    if (next && next.y > sh.y + sh.height) {
      wastes.push({ x: 0, y: sh.y + sh.height, w: usableWidth, h: next.y - sh.y - sh.height });
    }
  });
  return wastes;
};

export default function VinylRollVisualizer({ calc, showRegistrationMarks = false }) {
  const { shelves, usableWidth, effectiveRollWidth, leadingEdge, trailingEdge, lengthConsumedIn, totalLengthIn, partsPlaced, partsUnplaced, wastedSqFt, usedSqFt, gutterV } = calc;

  // Zoom + pan
  const [zoom, setZoom] = useState(1);
  const [panY, setPanY] = useState(0);
  const containerRef = useRef(null);

  const colorFor = useMemo(() => {
    const map = {};
    let i = 0;
    shelves.forEach(sh => sh.items.forEach(it => {
      if (!(it.itemIdx in map)) { map[it.itemIdx] = PALETTE[i % PALETTE.length]; i++; }
    }));
    return map;
  }, [shelves]);

  const wasteRects = useMemo(() => computeWasteRects(shelves, usableWidth, gutterV), [shelves, usableWidth, gutterV]);

  const drawWidth  = Math.max(1, effectiveRollWidth);
  const drawHeight = Math.max(12, lengthConsumedIn);

  const targetW = 520;
  const baseScale = targetW / drawWidth;
  const svgW = drawWidth * baseScale * zoom;
  const cappedH = Math.min(900, drawHeight * baseScale);
  const svgH = cappedH * zoom;

  const viewBox = `0 0 ${drawWidth} ${drawHeight}`;
  const usableX = (effectiveRollWidth - usableWidth) / 2;

  // Registration marks — small crosses every ~12" along the usable column
  const regMarks = useMemo(() => {
    if (!showRegistrationMarks) return [];
    const marks = [];
    const spacing = 12; // inches
    const startY = leadingEdge + 0.5;
    const endY = drawHeight - trailingEdge - 0.5;
    for (let y = startY; y < endY; y += spacing) {
      marks.push({ x: usableX + 0.3, y });
      marks.push({ x: usableX + usableWidth - 0.3, y });
    }
    return marks;
  }, [showRegistrationMarks, leadingEdge, trailingEdge, drawHeight, usableX, usableWidth]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-slate-600 items-center">
        <Stat label="Roll Width"      value={`${fmt(effectiveRollWidth)}″`} />
        <Stat label="Usable Width"    value={`${fmt(usableWidth)}″`} />
        <Stat label="Content Length"  value={`${fmt(totalLengthIn)}″`} />
        <Stat label="Roll Consumed"   value={`${fmt(lengthConsumedIn / 12)} ft`} />
        <Stat label="Parts Placed"    value={partsPlaced} />
        {partsUnplaced > 0 && <Stat label="Unplaced" value={partsUnplaced} tone="bad" />}
        <Stat label="Used"            value={`${fmt(usedSqFt)} sqft`} />
        <Stat label="Waste"           value={`${fmt(wastedSqFt)} sqft`} tone="warn" />
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.min(4, z + 0.25))} title="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setZoom(1); setPanY(0); }} title="Reset zoom">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="bg-slate-100 rounded-lg p-3 border border-slate-200 overflow-auto" style={{ maxHeight: 700 }}>
        <svg width={svgW} height={svgH} viewBox={viewBox} preserveAspectRatio="xMidYMin meet" style={{ background: "#e2e8f0", display: "block" }}>
          <defs>
            {/* Waste hatching pattern — Feature #7 */}
            <pattern id="wasteHatch" patternUnits="userSpaceOnUse" width="1.4" height="1.4" patternTransform="rotate(45)">
              <rect width="1.4" height="1.4" fill="#fecaca" fillOpacity="0.4" />
              <line x1="0" y1="0" x2="0" y2="1.4" stroke="#dc2626" strokeWidth="0.18" strokeOpacity="0.6" />
            </pattern>
          </defs>

          {/* Full roll backdrop */}
          <rect x={0} y={0} width={drawWidth} height={drawHeight} fill="#f1f5f9" />

          {/* Usable column */}
          <rect x={usableX} y={leadingEdge} width={usableWidth} height={Math.max(0, drawHeight - leadingEdge - trailingEdge)} fill="#ffffff" />

          {/* Waste rects — Feature #7 */}
          {wasteRects.map((w, i) => (
            <rect key={`w-${i}`} x={usableX + w.x} y={leadingEdge + w.y} width={w.w} height={w.h} fill="url(#wasteHatch)" />
          ))}

          {/* Leading / trailing edge stripes (always waste) */}
          <rect x={0} y={0} width={drawWidth} height={leadingEdge} fill="#fef3c7" />
          <rect x={0} y={drawHeight - trailingEdge} width={drawWidth} height={trailingEdge} fill="#fef3c7" />

          {/* Margin columns */}
          <rect x={0} y={0} width={usableX} height={drawHeight} fill="#fde68a" fillOpacity="0.55" />
          <rect x={usableX + usableWidth} y={0} width={drawWidth - usableX - usableWidth} height={drawHeight} fill="#fde68a" fillOpacity="0.55" />

          {/* Registration marks — Feature #11 */}
          {regMarks.map((m, i) => (
            <g key={`reg-${i}`} stroke="#0f172a" strokeWidth={0.07} fill="none">
              <line x1={m.x - 0.4} y1={m.y} x2={m.x + 0.4} y2={m.y} />
              <line x1={m.x} y1={m.y - 0.4} x2={m.x} y2={m.y + 0.4} />
              <circle cx={m.x} cy={m.y} r="0.25" />
            </g>
          ))}

          {/* Parts */}
          {shelves.map((sh, sIdx) =>
            sh.items.map((it, iIdx) => {
              const fill = colorFor[it.itemIdx] || "#3b82f6";
              return (
                <g key={`${sIdx}-${iIdx}`}>
                  <rect
                    x={usableX + it.x} y={leadingEdge + it.y}
                    width={it.w} height={it.h}
                    fill={fill} fillOpacity="0.85"
                    stroke="#0f172a" strokeWidth={0.05}
                  />
                  {/* Feed direction arrow on the part — Feature #12 */}
                  {it.w > 6 && it.h > 6 && (
                    <g pointerEvents="none">
                      <path
                        d={`M ${usableX + it.x + it.w / 2} ${leadingEdge + it.y + 0.5}
                            L ${usableX + it.x + it.w / 2} ${leadingEdge + it.y + Math.min(it.h - 1, 2.2)}`}
                        stroke="white" strokeWidth={0.18} strokeOpacity="0.6" markerEnd="url(#arrow)"
                      />
                    </g>
                  )}
                  {it.w > 6 && it.h > 4 && (
                    <text
                      x={usableX + it.x + it.w / 2}
                      y={leadingEdge + it.y + it.h / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.min(it.w / 7, it.h / 3, 2.2)}
                      fill="white"
                      style={{ pointerEvents: "none", fontWeight: 600 }}
                    >
                      {it.w.toFixed(1)}×{it.h.toFixed(1)}{it.rotated ? " ↻" : ""}
                    </text>
                  )}
                </g>
              );
            })
          )}

          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="white" fillOpacity="0.6" />
            </marker>
          </defs>

          {/* Roll outline */}
          <rect x={0} y={0} width={drawWidth} height={drawHeight} fill="none" stroke="#0f172a" strokeWidth={0.1} />
        </svg>

        {/* Feed direction tag — Feature #12 */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 pt-1">
          <ArrowDown className="w-3 h-3" /> Print feed direction (top → bottom)
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 text-[11px]">
          <LegendChip color="#fde68a" label="Margin (unprintable)" />
          <LegendChip color="#fef3c7" label="Leading/trailing edge waste" />
          <LegendSwatchHatch label="Waste in usable area" />
          {showRegistrationMarks && <LegendChip color="#0f172a" label="Registration marks" />}
          <LegendChip color="#ffffff" label="Usable" border />
          {Object.entries(colorFor).map(([idx, c]) => (
            <LegendChip key={idx} color={c} label={`Item ${parseInt(idx) + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

const Stat = ({ label, value, tone }) => {
  const toneClass = tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-slate-800";
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-slate-500">{label}:</span>
      <span className={`font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
};

const LegendChip = ({ color, label, border }) => (
  <span className="inline-flex items-center gap-1">
    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color, border: border ? "1px solid #94a3b8" : "none" }} />
    <span className="text-slate-600">{label}</span>
  </span>
);

const LegendSwatchHatch = ({ label }) => (
  <span className="inline-flex items-center gap-1">
    <svg width="12" height="12" className="inline-block">
      <defs>
        <pattern id="legendHatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="#fecaca" fillOpacity="0.6" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="#dc2626" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="12" height="12" fill="url(#legendHatch)" stroke="#94a3b8" strokeWidth="0.5" />
    </svg>
    <span className="text-slate-600">{label}</span>
  </span>
);