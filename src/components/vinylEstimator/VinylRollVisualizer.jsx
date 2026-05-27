// Visual roll layout. Roll is drawn vertically with usable area shaded,
// each placed part rendered with a distinct color per source item.

import React, { useMemo } from "react";

const PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

const fmt = (n) => Number(n || 0).toFixed(2);

export default function VinylRollVisualizer({ calc }) {
  const { shelves, usableWidth, effectiveRollWidth, leadingEdge, trailingEdge, lengthConsumedIn, totalLengthIn, partsPlaced, partsUnplaced, wastedSqFt, usedSqFt } = calc;

  // Color map per source item idx
  const colorFor = useMemo(() => {
    const map = {};
    let i = 0;
    shelves.forEach(sh => sh.items.forEach(it => {
      if (!(it.itemIdx in map)) { map[it.itemIdx] = PALETTE[i % PALETTE.length]; i++; }
    }));
    return map;
  }, [shelves]);

  // SVG geometry — roll drawn vertically. 1 svg unit = 1 inch.
  const drawWidth  = Math.max(1, effectiveRollWidth);
  const drawHeight = Math.max(12, lengthConsumedIn);

  // Scale to fit a target visual width, capped so super-long rolls stay readable
  const targetW = 520;
  const scale = targetW / drawWidth;
  const svgW = drawWidth * scale;
  const svgH = Math.min(900, drawHeight * scale);
  // If we capped svgH, recompute drawHeight virtual viewport
  const viewBox = `0 0 ${drawWidth} ${drawHeight}`;

  const usableX = (effectiveRollWidth - usableWidth) / 2;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <Stat label="Roll Width"      value={`${fmt(effectiveRollWidth)}″`} />
        <Stat label="Usable Width"    value={`${fmt(usableWidth)}″`} />
        <Stat label="Content Length"  value={`${fmt(totalLengthIn)}″`} />
        <Stat label="Roll Consumed"   value={`${fmt(lengthConsumedIn / 12)} ft`} />
        <Stat label="Parts Placed"    value={partsPlaced} />
        {partsUnplaced > 0 && <Stat label="Unplaced" value={partsUnplaced} tone="bad" />}
        <Stat label="Used"            value={`${fmt(usedSqFt)} sqft`} />
        <Stat label="Waste"           value={`${fmt(wastedSqFt)} sqft`} tone="warn" />
      </div>

      <div className="bg-slate-100 rounded-lg p-3 border border-slate-200 overflow-auto">
        <svg width={svgW} height={svgH} viewBox={viewBox} preserveAspectRatio="xMidYMin meet" style={{ background: "#e2e8f0" }}>
          {/* Full roll backdrop */}
          <rect x={0} y={0} width={drawWidth} height={drawHeight} fill="#f1f5f9" />

          {/* Usable column */}
          <rect x={usableX} y={leadingEdge} width={usableWidth} height={Math.max(0, drawHeight - leadingEdge - trailingEdge)} fill="#ffffff" />

          {/* Leading / trailing edge stripes (always waste) */}
          <rect x={0} y={0} width={drawWidth} height={leadingEdge} fill="#fef3c7" />
          <rect x={0} y={drawHeight - trailingEdge} width={drawWidth} height={trailingEdge} fill="#fef3c7" />

          {/* Margin columns */}
          <rect x={0} y={0} width={usableX} height={drawHeight} fill="#fde68a" fillOpacity="0.55" />
          <rect x={usableX + usableWidth} y={0} width={drawWidth - usableX - usableWidth} height={drawHeight} fill="#fde68a" fillOpacity="0.55" />

          {/* Parts — shelf items are positioned within usable column, offset by leadingEdge */}
          {shelves.map((sh, sIdx) =>
            sh.items.map((it, iIdx) => {
              const fill = colorFor[it.itemIdx] || "#3b82f6";
              return (
                <g key={`${sIdx}-${iIdx}`}>
                  <rect
                    x={usableX + it.x}
                    y={leadingEdge + it.y}
                    width={it.w}
                    height={it.h}
                    fill={fill}
                    fillOpacity="0.85"
                    stroke="#0f172a"
                    strokeWidth={0.05}
                  />
                  {it.w > 6 && it.h > 4 && (
                    <text
                      x={usableX + it.x + it.w / 2}
                      y={leadingEdge + it.y + it.h / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
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

          {/* Roll outline */}
          <rect x={0} y={0} width={drawWidth} height={drawHeight} fill="none" stroke="#0f172a" strokeWidth={0.1} />
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 text-[11px]">
          <LegendChip color="#fde68a" label="Margin (unprintable)" />
          <LegendChip color="#fef3c7" label="Leading/trailing edge waste" />
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