import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { PenTool } from 'lucide-react';
import BeautifyCanvas from '@/components/BeautifyCanvas';

// Inline positioning tools for pole-mounted signs (kept here so the parent page
// stays under the 2000-line limit). Extracted unchanged from NewFoundationEstimate.
function SignPositioningTools({ pole, pIdx, sign, sIdx, polesData, onUpdate }) {
  const [tempY, setTempY] = React.useState(0);
  const [tempX, setTempX] = React.useState(0);

  const applyOffset = () => {
    onUpdate({
      y_offset_inches: (sign.y_offset_inches || 0) + (parseFloat(tempY) || 0),
      x_offset_inches: (sign.x_offset_inches || 0) + (parseFloat(tempX) || 0)
    });
    setTempY(0); setTempX(0);
  };
  const alignTop = () => {
    const signHeight = sign.elements && sign.elements.length > 0
      ? Math.max(...sign.elements.map(e => e.height || 0))
      : (sign.height_inches || 24);
    onUpdate({ y_offset_inches: pole.height_inches - (signHeight / 2) + 0.125 });
  };
  const alignBottom = () => {
    const signHeight = sign.elements && sign.elements.length > 0
      ? Math.max(...sign.elements.map(e => e.height || 0))
      : (sign.height_inches || 24);
    onUpdate({ y_offset_inches: pole.height_inches + (signHeight / 2) });
  };
  const centerBetweenPoles = () => {
    if (polesData.length >= 2) {
      const otherPole = polesData.find((_, i) => i !== pIdx);
      if (otherPole) {
        const midpointX = ((pole.x_inches || 0) + (otherPole.x_inches || 0)) / 2;
        onUpdate({ x_offset_inches: midpointX - (pole.x_inches || 0) });
      }
    }
  };

  return (
    <div className="mt-2 bg-slate-100 p-2 rounded-md border border-slate-200">
      <p className="text-[10px] font-bold text-slate-600 uppercase mb-1.5">Positioning Tools</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 bg-white" onClick={alignTop}>Align Top</Button>
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 bg-white" onClick={alignBottom}>Align Bottom</Button>
        {polesData.length >= 2 && <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 bg-white" onClick={centerBetweenPoles}>Center on 2 Poles</Button>}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500">Y:</span>
          <input type="number" className="h-6 w-14 text-[10px] px-1 bg-white border border-slate-300 rounded" value={tempY} onChange={e => setTempY(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500">X:</span>
          <input type="number" className="h-6 w-14 text-[10px] px-1 bg-white border border-slate-300 rounded" value={tempX} onChange={e => setTempX(e.target.value)} />
        </div>
        <Button size="sm" className="h-6 text-[10px] px-2" onClick={applyOffset}>Apply</Button>
      </div>
    </div>
  );
}

export default function SignageLandscapeTab({
  items, setItems, polesData, setPolesData,
  project, updateProject,
  openSignDesigner,
  openFoundationDesigner,
  markDirty
}) {
  const flatFoundations = [];
  items.forEach((f, fIdx) => {
    const qty = f.quantity || 1;
    for (let q = 0; q < qty; q++) flatFoundations.push({ item: f, itemIdx: fIdx, q, globalIdx: flatFoundations.length });
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800">Signage Cabinets</h3>
          <p className="text-xs text-slate-500">Add cabinets directly on a foundation or mount them on a placed pole.</p>
        </div>
      </div>

      {/* Foundation-Mounted Cabinets */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {flatFoundations.map(({ item, itemIdx, globalIdx }) => {
            const cabinets = item.foundation_cabinets || [];
            return (
              <div key={`fnd-cab-${globalIdx}`} className="bg-white border border-slate-200 shadow-sm rounded-lg p-3">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-slate-800 text-sm">Foundation {globalIdx + 1}{item.description ? ` (${item.description})` : ''}</h4>
                  <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" onClick={() => openFoundationDesigner(itemIdx, globalIdx, null)}>+ Add Cabinet</Button>
                </div>
                <div className="space-y-2">
                  {cabinets.length === 0 && <p className="text-xs text-slate-400">No cabinets on this foundation.</p>}
                  {cabinets.map((cab, cIdx) => (
                    <div key={cIdx} className="bg-slate-50 border border-slate-100 rounded p-2 text-xs flex justify-between items-center">
                      <span className="font-medium text-slate-700 truncate">
                        {cab.name || `Cabinet ${cIdx + 1}`}
                        {cab.rotation_degrees ? <span className="ml-1 text-amber-600 font-bold">({cab.rotation_degrees}°)</span> : null}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-amber-100" title="Rotate 90°" onClick={() => {
                          const arr = [...items];
                          const cabs = [...(arr[itemIdx].foundation_cabinets || [])];
                          cabs[cIdx] = { ...cabs[cIdx], rotation_degrees: ((cabs[cIdx].rotation_degrees || 0) + 90) % 360 };
                          arr[itemIdx] = { ...arr[itemIdx], foundation_cabinets: cabs };
                          setItems(arr); markDirty();
                        }}>
                          <span className="text-amber-600 font-bold text-[10px]">↻90°</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-blue-100" onClick={() => openFoundationDesigner(itemIdx, globalIdx, cIdx)}><PenTool className="w-3 h-3 text-blue-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-100" onClick={() => {
                          const arr = [...items];
                          const cabs = [...(arr[itemIdx].foundation_cabinets || [])];
                          cabs.splice(cIdx, 1);
                          arr[itemIdx] = { ...arr[itemIdx], foundation_cabinets: cabs };
                          setItems(arr); markDirty();
                        }}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800">Signage Cabinets on Poles</h3>
          <p className="text-xs text-slate-500">Add cabinets to placed poles. Place poles in the "Walls & Poles" tab.</p>
        </div>
      </div>

      {polesData.length === 0 ? (
        <p className="text-sm text-slate-500 italic bg-white border border-slate-200 p-4 rounded-lg">No poles placed. To mount cabinets on a pole, add poles in the "Walls & Poles" tab. (Or skip poles and use Foundation-Mounted Cabinets above.)</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {polesData.map((pole, pIdx) => (
            <div key={pIdx} className="bg-white border border-slate-200 shadow-sm rounded-lg p-3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-slate-800 text-sm">Pole {pIdx + 1}</h4>
                <Button size="sm" variant="outline" className="h-7 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" onClick={() => openSignDesigner(pIdx, null)}>+ Add Cabinet</Button>
              </div>
              <div className="space-y-2">
                {(pole.signs || []).length === 0 && <p className="text-xs text-slate-400">No cabinets added.</p>}
                {(pole.signs || []).map((sign, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <div className="bg-slate-50 border border-slate-100 rounded p-2 text-xs flex justify-between items-center">
                      <span className="font-medium text-slate-700 truncate">
                        {sign.name || `Cabinet ${sIdx + 1}`}
                        {sign.rotation_degrees ? <span className="ml-1 text-amber-600 font-bold">({sign.rotation_degrees}°)</span> : null}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-amber-100" title="Rotate 90°" onClick={() => {
                          const arr = [...polesData];
                          arr[pIdx].signs[sIdx] = { ...arr[pIdx].signs[sIdx], rotation_degrees: ((arr[pIdx].signs[sIdx].rotation_degrees || 0) + 90) % 360 };
                          setPolesData(arr); markDirty();
                        }}>
                          <span className="text-amber-600 font-bold text-[10px]">↻90°</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-blue-100" onClick={() => openSignDesigner(pIdx, sIdx)}><PenTool className="w-3 h-3 text-blue-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-100" onClick={() => {
                          const arr = [...polesData];
                          arr[pIdx].signs.splice(sIdx, 1);
                          setPolesData(arr); markDirty();
                        }}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                      </div>
                    </div>
                    <SignPositioningTools pole={pole} pIdx={pIdx} sign={sign} sIdx={sIdx} polesData={polesData} onUpdate={(updates) => {
                      const arr = [...polesData];
                      arr[pIdx].signs[sIdx] = { ...arr[pIdx].signs[sIdx], ...updates };
                      setPolesData(arr); markDirty();
                    }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800">Landscape Designer</h3>
          <p className="text-xs text-slate-500">Draw landscaping features, paths, and site boundaries.</p>
        </div>
      </div>
      <BeautifyCanvas
        dataUrl={project.beautify_data_url}
        foundationItems={items}
        onChange={v => updateProject('beautify_data_url', v)}
      />
    </div>
  );
}