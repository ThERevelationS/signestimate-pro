import React, { useState, useEffect, useContext, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Plus, Save, ArrowLeft, Trash2, Crosshair, Move, Undo, Redo, Copy, HelpCircle, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import WallSection from '@/components/WallSection';
import SharedCanvas from '@/components/SharedCanvas';
import FoundationWalls3DViewer from '@/components/FoundationWalls3DViewer';
import { UnsavedChangesContext } from '@/components/UnsavedChangesContext';
import ClientSearchInput from "@/components/ClientSearchInput";
import SummaryTab from '@/components/foundation/SummaryTab';
import BOMTab from '@/components/foundation/BOMTab';
import EquipmentTab from '@/components/foundation/EquipmentTab';
import BeautifyCanvas from '@/components/BeautifyCanvas';
import SignDesignerModal from '@/components/SignDesignerModal';
import AIEngineeringCalculatorModal from '@/components/foundation/AIEngineeringCalculatorModal';
import HelpAssistant from '@/components/foundation/HelpAssistant';
import FoundationItemRow from '@/components/foundation/FoundationItemRow';
import { Bot, PenTool } from 'lucide-react';

function SignPositioningTools({ pole, pIdx, sign, sIdx, polesData, onUpdate }) {
  const [tempY, setTempY] = useState(0);
  const [tempX, setTempX] = useState(0);

  const applyOffset = () => {
    onUpdate({
      y_offset_inches: (sign.y_offset_inches || 0) + (parseFloat(tempY) || 0),
      x_offset_inches: (sign.x_offset_inches || 0) + (parseFloat(tempX) || 0)
    });
    setTempY(0);
    setTempX(0);
  };

  const alignTop = () => {
    const signHeight = sign.elements && sign.elements.length > 0 
      ? Math.max(...sign.elements.map(e => e.height || 0))
      : (sign.height_inches || 24);
      
    // pole height - sign height/2 + 0.125
    onUpdate({ y_offset_inches: pole.height_inches - (signHeight / 2) + 0.125 });
  };

  const alignBottom = () => {
    const signHeight = sign.elements && sign.elements.length > 0 
      ? Math.max(...sign.elements.map(e => e.height || 0))
      : (sign.height_inches || 24);
      
    // pole height + sign height/2
    onUpdate({ y_offset_inches: pole.height_inches + (signHeight / 2) });
  };

  const centerBetweenPoles = () => {
    if (polesData.length >= 2) {
      const otherPole = polesData.find((p, i) => i !== pIdx);
      if (otherPole) {
        // Find distance between them on X axis and midpoint
        const currentX = pole.x_inches || 0;
        const otherX = otherPole.x_inches || 0;
        const midpointX = (currentX + otherX) / 2;
        onUpdate({ x_offset_inches: midpointX - currentX });
      }
    }
  };

  return (
    <div className="mt-2 bg-slate-100 p-2 rounded-md border border-slate-200">
       <Label className="text-[10px] font-bold text-slate-600 uppercase mb-1.5 block">Positioning Tools</Label>
       <div className="flex flex-wrap gap-1.5 mb-2">
         <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 bg-white" onClick={alignTop}>Align Top</Button>
         <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 bg-white" onClick={alignBottom}>Align Bottom</Button>
         {polesData.length >= 2 && <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 bg-white" onClick={centerBetweenPoles}>Center on 2 Poles</Button>}
       </div>
       <div className="flex items-center gap-2">
         <div className="flex items-center gap-1">
           <Label className="text-[10px] text-slate-500">Y (Up/Dn):</Label>
           <Input type="number" className="h-6 w-14 text-[10px] px-1 bg-white" value={tempY} onChange={e => setTempY(e.target.value)} />
         </div>
         <div className="flex items-center gap-1">
           <Label className="text-[10px] text-slate-500">X (L/R):</Label>
           <Input type="number" className="h-6 w-14 text-[10px] px-1 bg-white" value={tempX} onChange={e => setTempX(e.target.value)} />
         </div>
         <Button size="sm" className="h-6 text-[10px] px-2" onClick={applyOffset}>Apply</Button>
       </div>
    </div>
  );
}

const FoundationProjectEntity = base44.entities.FoundationProject;
const FoundationInventoryEntity = base44.entities.FoundationInventory;
const SettingsEntity = base44.entities.Settings;

export const getConcreteMixes = (invItem) => [
  { id: '3500_ae', name: '3500 AIR ENTRAINED (AE)', price: invItem?.mix_3500_price ?? 195.40, desc: 'Often used for driveways, slabs, and moderate-load footings.' },
  { id: '4000_ae', name: '4000 AIR ENTRAINED (AE)', price: invItem?.mix_4000_price ?? 201.00, desc: 'STANDARD. Used for sign foundations, commercial flatwork, and structural footings requiring good durability.' },
  { id: '4500_ae', name: '4500 AIR ENTRAINED (AE)', price: invItem?.mix_4500_price ?? 208.70, desc: 'Used for heavy-duty commercial slabs and heavy traffic areas.' },
  { id: '5000_ae', name: '5000 AIR ENTRAINED (AE)', price: invItem?.mix_5000_price ?? 214.60, desc: 'High-strength mix for heavy structural columns, pillars, and extreme load conditions.' },
  { id: 'fast_set', name: 'FAST SET', price: invItem?.mix_fast_set_price ?? 248.00, desc: 'Quick-curing concrete used when rapid strength gain is needed to minimize downtime.' },
];

export const getConcreteAdmixtures = (invItem) => [
  { id: 'calcium_chloride', name: 'Calcium Chloride', price: invItem?.admix_calcium_chloride_price ?? 8.50, desc: 'Accelerating admixture used in cold weather to speed up setting time (Not for use with steel reinforcement).' },
  { id: 'set_retarding', name: 'Set-Retarding Admix (Type D)', price: invItem?.admix_set_retarding_price ?? 4.50, desc: 'Slows down setting time, useful in hot weather or when long transit times are expected.' },
  { id: 'water_reducing', name: 'Water-Reducing Admix (Type A)', price: invItem?.admix_water_reducing_price ?? 4.25, desc: 'Improves workability without adding water, increasing final strength and reducing shrinkage.' },
  { id: 'fibers', name: 'Fibers', price: invItem?.admix_fibers_price ?? 12.50, desc: 'Synthetic fibers added to reduce plastic shrinkage cracking and improve impact resistance.' },
  { id: 'winter_service', name: 'Winter Service', price: invItem?.admix_winter_service_price ?? 5.50, desc: 'Additional fee applied during winter months for heating water/aggregates to ensure proper curing.' },
];

function newItem() {
  return {
    _id: Date.now() + Math.random(),
    foundation_type: 'spread_foot',
    description: '',
    quantity: 1,
    length_inches: 48,
    width_inches: 48,
    diameter: 24,
    depth_inches: 36,
    grade_offset_inches: 0,
    include_rebar: false,
    include_forming: false,
    include_finishing: false,
    rebar_size: '#4',
    rebar_spacing_length: 12,
    rebar_spacing_width: 12,
    rebar_layers: 1,
    rebar_layer_separation_inches: 12,
    pillar_rebar_size: '#4',
    pillar_rebar_hoop_diameter: 20,
    pillar_rebar_layer_separation_inches: 12,
    pillar_rebar_layers: 1,
    pillar_vertical_rebar_count: 4,
    selected_pole_id: '',
    pole_offset_from_bottom_inches: 0,
    pole_total_height_inches: 0,
    include_pole_painting: false,
    custom_concrete_cost_per_cy: null,
    custom_rebar_cost_per_ft: null,
    excavation_method: 'hand_dig',
    selected_concrete_id: '',
    is_new_sign_location: false,
  };
}

function newWall() {
  return {
    _id: Date.now() + Math.random(),
    name: '',
    heightInches: 24,
    materialId: '',
    selectedMaterial: null,
    useExistingFoundation: false,
    mortarGapInches: 0.375,
    offsetFraction: 0.5,
    shape: null,
    calculatedCosts: null,
  };
}

export default function NewFoundationEstimate() {
  const navigate = useNavigate();
  const location = useLocation();
  const editId = new URLSearchParams(location.search).get('id');
  const { isDirty, setIsDirty } = useContext(UnsavedChangesContext) || { isDirty: false, setIsDirty: () => {} };

  const [project, setProject] = useState({
    project_name: '',
    client_name: '',
    estimate_number: '',
    hyperlink: '',
    status: 'draft',
    notes: '',
    items: [],
    walls: [],
    poles: [],
    excavation_method: 'hand_dig',
    selected_concrete_id: '',
    beautify_data_url: '',
    project_concrete_type: '4000_ae',
    project_concrete_admixtures: [],
  });
  const [polesData, setPolesData] = useState([]);
  const [items, setItems] = useState([newItem()]);
  const [walls, setWalls] = useState([]);
  const [selectedEquipmentList, setSelectedEquipmentList] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [wallMaterials, setWallMaterials] = useState([]);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(true);
  const [missingFields, setMissingFields] = useState([]);
  const [show3D, setShow3D] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);

  const [activeWallIndex, setActiveWallIndex] = useState(0);
  const [showPoles, setShowPoles] = useState(false);
  const [selectedPoleId, setSelectedPoleId] = useState('');
  const [selectedPlacedIdx, setSelectedPlacedIdx] = useState(null);
  const [canvasMode, setCanvasMode] = useState('draw');
  
  // Sign Designer State
  const [designerOpen, setDesignerOpen] = useState(false);
  const [designerPoleIdx, setDesignerPoleIdx] = useState(null);
  const [designerSignIdx, setDesignerSignIdx] = useState(null);
  const [shakePoleDropdown, setShakePoleDropdown] = useState(false);
  const [wallShakeIndex, setWallShakeIndex] = useState(null);
  const [helpTrigger, setHelpTrigger] = useState(false);

  // Auto-select pole if inventory loads and no pole selected
  useEffect(() => {
    const availablePoles = inventory.filter(i => i.material_type === 'pole');
    if (availablePoles.length > 0 && !selectedPoleId) {
      setSelectedPoleId(availablePoles[0].id);
    }
  }, [inventory, selectedPoleId]);

  const handleWallMaterialError = (idx) => {
     setWallShakeIndex(idx);
     setTimeout(() => setWallShakeIndex(null), 800);
  };

  const openSignDesigner = (pIdx, sIdx) => {
      setDesignerPoleIdx(pIdx);
      setDesignerSignIdx(sIdx);
      setDesignerOpen(true);
  };

  const handleSaveSign = (signData) => {
      const arr = [...polesData];
      const pole = arr[designerPoleIdx];
      if (!pole.signs) pole.signs = [];
      
      if (designerSignIdx !== null) {
          // Update
          pole.signs[designerSignIdx] = { ...pole.signs[designerSignIdx], ...signData };
      } else {
          // Add new
          pole.signs.push({ ...signData, y_offset_inches: pole.height_inches / 2 || 60, z_offset_inches: 0 });
      }
      setPolesData(arr);
      markDirty();
  };

  // History state for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const skipHistoryRef = useRef(false);

  const saveHistory = () => {
    if (skipHistoryRef.current || loading) return;
    const currentState = {
      items: JSON.parse(JSON.stringify(items)),
      walls: JSON.parse(JSON.stringify(walls)),
      polesData: JSON.parse(JSON.stringify(polesData))
    };
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(saveHistory, 800);
    return () => clearTimeout(t);
  }, [items, walls, polesData, loading]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      skipHistoryRef.current = true;
      const h = history[historyIndex - 1];
      setItems(h.items);
      setWalls(h.walls);
      setPolesData(h.polesData);
      setHistoryIndex(prev => prev - 1);
      markDirty();
      setTimeout(() => skipHistoryRef.current = false, 100);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      skipHistoryRef.current = true;
      const h = history[historyIndex + 1];
      setItems(h.items);
      setWalls(h.walls);
      setPolesData(h.polesData);
      setHistoryIndex(prev => prev + 1);
      markDirty();
      setTimeout(() => skipHistoryRef.current = false, 100);
    }
  };

  useEffect(() => {
     if (walls.length === 0) setActiveWallIndex(null);
     else if (activeWallIndex === null || activeWallIndex >= walls.length) setActiveWallIndex(0);
  }, [walls.length]);

  const autoSaveRef = useRef();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [inv, rawSettings] = await Promise.all([
      FoundationInventoryEntity.list('-created_date', 200),
      SettingsEntity.filter({ category: ['foundation_pricing', 'foundation_labor', 'foundation_calc'] }),
    ]);
    setInventory(inv);
    setWallMaterials(inv.filter(i => i.material_type === 'wall_material'));
    const sMap = {};
    rawSettings.forEach(s => { sMap[s.setting_name] = s.setting_value; });
    setSettings(sMap);

    if (editId) {
      try {
        const p = await FoundationProjectEntity.get(editId);
        if (p) {
          setProject(p);
          setItems(p.items?.length ? p.items.map(i => ({ 
            ...i, 
            excavation_method: i.excavation_method || p.excavation_method || 'hand_dig',
            selected_concrete_id: i.selected_concrete_id || p.selected_concrete_id || '',
            _id: i._id || Date.now() + Math.random() 
          })) : [newItem()]);
          setWalls(p.walls?.length ? p.walls.map(w => ({ 
            ...w, 
            selectedMaterial: w.selectedMaterial || inv.find(m => m.id === w.materialId) || null,
            selectedInternalMaterial: w.selectedInternalMaterial || inv.find(m => m.id === w.internalMaterialId) || null,
            _id: w._id || Date.now() + Math.random() 
          })) : []);
          setPolesData(p.poles || []);
          setSelectedEquipmentList(p.selected_equipment?.length ? p.selected_equipment.map(e => ({ ...e, _id: e._id || Date.now() + Math.random() })) : []);
        }
      } catch (err) {
        console.error("Error loading project:", err);
      }
    }
    setLoading(false);
  };

  const markDirty = () => setIsDirty(true);
  const updateProject = (field, value) => { setProject(prev => ({ ...prev, [field]: value })); markDirty(); };
  const addItem = () => { setItems(prev => [...prev, newItem()]); markDirty(); };
  const removeItem = (idx) => { setItems(prev => prev.filter((_, i) => i !== idx)); markDirty(); };
  const updateItem = (idx, field, value) => {
    setItems(prev => { const arr = [...prev]; arr[idx] = { ...arr[idx], [field]: value }; return arr; });
    markDirty();
  };
  const addWall = () => { 
    const mat = wallMaterials.length > 0 ? wallMaterials[0] : null;
    const matId = mat ? mat.id : '';
    setWalls(prev => [...prev, { ...newWall(), materialId: matId, selectedMaterial: mat }]); 
    markDirty(); 
  };
  const removeWall = (idx) => { setWalls(prev => prev.filter((_, i) => i !== idx)); markDirty(); };
  const updateWall = (idx, wallData) => {
    setWalls(prev => { const arr = [...prev]; arr[idx] = wallData; return arr; });
    markDirty();
  };

  const getFoundationCenter = (globalFIdx) => {
      let cumulativeOffsetX = 0;
      let gIdx = 0;
      for(let i=0; i<items.length; i++) {
          const item = items[i];
          const qty = item.quantity || 1;
          const gridSize = Math.ceil(Math.sqrt(qty));
          const isSpread = item.foundation_type !== 'pillar';
          const footprintX = isSpread ? (item.length_inches || 48) / 12 : (item.diameter || 24) / 12;
          const footprintZ = isSpread ? (item.width_inches || 48) / 12 : (item.diameter || 24) / 12;
          const spacingX = footprintX * 1.5 + 1;
          const spacingZ = footprintZ * 1.5 + 1;
          
          for (let q = 0; q < qty; q++) {
              if (gIdx === parseInt(globalFIdx)) {
                  const col = q % gridSize;
                  const row = Math.floor(q / gridSize);
                  
                  const baseUserOffsetX = (item.offset_x_inches || 0) / 12;
                  const baseUserOffsetZ = (item.offset_z_inches || 0) / 12;
                  
                  const userOffsetX = (item.offsets && item.offsets[q] && item.offsets[q].x !== undefined) ? item.offsets[q].x / 12 : baseUserOffsetX;
                  const userOffsetZ = (item.offsets && item.offsets[q] && item.offsets[q].z !== undefined) ? item.offsets[q].z / 12 : baseUserOffsetZ;

                  const ox = cumulativeOffsetX + col * spacingX + footprintX / 2 + userOffsetX;
                  const oz = row * spacingZ + footprintZ / 2 + userOffsetZ;
                  return { x: ox * 12, z: oz * 12 };
              }
              gIdx++;
          }
          cumulativeOffsetX += gridSize * spacingX + 2;
      }
      return { x: 0, z: 0 };
  };

  const centerPole = (poleIdx, direction) => {
      const arr = [...polesData];
      const p = arr[poleIdx];
      const fIdx = p.foundation_idx || 0;
      const center = getFoundationCenter(fIdx);
      if (direction === 'horizontal' || direction === 'both') p.x_inches = center.x;
      if (direction === 'vertical' || direction === 'both') p.z_inches = center.z;
      setPolesData(arr);
      markDirty();
  };

  const firstFoundation = items[0];
  const foundationLengthInches = firstFoundation?.length_inches || 0;
  const foundationWidthInches = firstFoundation?.width_inches || 0;

  const getSetting = (key, def) => parseFloat(settings[key] || def);

  const calcItemCost = (item) => {
    const selectedConcrete = inventory.find(c => c.id === item.selected_concrete_id);
    const conc_cost = item.custom_concrete_cost_per_cy !== null && item.custom_concrete_cost_per_cy !== undefined 
      ? item.custom_concrete_cost_per_cy 
      : (selectedConcrete?.cost_per_unit || 0);
    
    // Find the selected rebar from inventory (matching the #size)
    const selectedRebar = inventory.find(r => r.material_type === 'rebar' && r.rebar_size === item.rebar_size);
    const pillarSelectedRebar = inventory.find(r => r.material_type === 'rebar' && r.rebar_size === (item.pillar_rebar_size || '#4'));
    const activeRebar = item.foundation_type === 'spread_foot' ? selectedRebar : pillarSelectedRebar;
    
    const rebar_cost = item.custom_rebar_cost_per_ft !== null && item.custom_rebar_cost_per_ft !== undefined 
      ? item.custom_rebar_cost_per_ft 
      : (activeRebar?.cost_per_unit || 0);
    
    const main_labor_rate = getSetting('foundation_main_labor_rate', 60);
    const rebar_time_cross_section = getSetting('foundation_rebar_time_cross_section', 0.05);
    const rebar_time_linear_ft = getSetting('foundation_rebar_time_linear_ft', 0.02);
    
    const forming_cost_per_sqft = getSetting('foundation_forming_cost_per_sqft', 2.50);
    const pouring_cost_per_cy = getSetting('foundation_pouring_cost_per_cy', 15);
    const finishing_cost_per_sqft = getSetting('foundation_finishing_cost_per_sqft', 1.25);
    
    const forming_mult = item.foundation_type === 'spread_foot'
      ? getSetting('foundation_forming_materials_spread_foot', 0.5)
      : getSetting('foundation_forming_materials_pillar', 0.75);

    let baseVolumeCY = 0;
    const lenIn = parseFloat(item.length_inches) || 0;
    const widIn = parseFloat(item.width_inches) || 0;
    const depIn = parseFloat(item.depth_inches) || 0;
    const diaIn = parseFloat(item.diameter) || 0;
    
    if (item.foundation_type === 'spread_foot') {
      baseVolumeCY = ((lenIn / 12) * (widIn / 12) * (depIn / 12)) / 27;
    } else {
      const r = (diaIn / 2) / 12;
      baseVolumeCY = (Math.PI * r * r * (depIn / 12)) / 27;
    }
    baseVolumeCY = baseVolumeCY * (item.quantity || 1);
    
    const volumeCY = item.custom_concrete_qty !== null && item.custom_concrete_qty !== undefined ? item.custom_concrete_qty : baseVolumeCY;

    let concreteCost = 0; 
    let baseBags = null;
    let concreteBags = null;

    if (selectedConcrete?.material_type === 'bagged_concrete') {
      baseBags = Math.ceil(baseVolumeCY * 45); // ~45 80lb bags per CY
      concreteBags = item.custom_concrete_qty !== null && item.custom_concrete_qty !== undefined ? item.custom_concrete_qty : baseBags;
      concreteCost = concreteBags * conc_cost;
    }

    let rebarCost = 0;
    let baseRebarFt = 0;
    let totalIntersections = 0;
    
    if (item.include_rebar && item.foundation_type === 'spread_foot') {
      const nBarsL = Math.floor(widIn / (parseFloat(item.rebar_spacing_width) || 12)) + 1;
      const nBarsW = Math.floor(lenIn / (parseFloat(item.rebar_spacing_length) || 12)) + 1;
      const layers = parseInt(item.rebar_layers) || 1;
      const horizontalFt = (nBarsL * (lenIn / 12) + nBarsW * (widIn / 12)) * layers;
      
      const numIntersections = nBarsL * nBarsW * layers;
      const verticalLengthFt = Math.max(0, depIn - 6) / 12;
      const verticalFt = numIntersections * verticalLengthFt;
      
      baseRebarFt = (horizontalFt + verticalFt) * (parseInt(item.quantity) || 1);
      totalIntersections = numIntersections * (parseInt(item.quantity) || 1);
    } else if (item.include_rebar && item.foundation_type === 'pillar') {
      const hoopDia = parseFloat(item.pillar_rebar_hoop_diameter) || Math.max(0, diaIn - 4);
      const safeHoopDia = Math.min(hoopDia, Math.max(0, diaIn - 4));
      const layers = parseInt(item.pillar_rebar_layers) || 1;
      const verticalCount = parseInt(item.pillar_vertical_rebar_count) || 4;
      
      const hoopLengthFt = (Math.PI * safeHoopDia) / 12;
      const totalHoopFt = hoopLengthFt * layers;
      
      const verticalLengthFt = Math.max(0, depIn - 6) / 12;
      const totalVerticalFt = verticalCount * verticalLengthFt;
      
      baseRebarFt = (totalHoopFt + totalVerticalFt) * (parseInt(item.quantity) || 1);
      totalIntersections = (layers * verticalCount) * (parseInt(item.quantity) || 1);
    }
    
    const rebarFt = item.custom_rebar_qty !== null && item.custom_rebar_qty !== undefined ? item.custom_rebar_qty : baseRebarFt;
    if (item.include_rebar) {
      const materialCost = rebarFt * rebar_cost;
      const totalTimeHours = (totalIntersections * rebar_time_cross_section) + (rebarFt * rebar_time_linear_ft);
      const laborCost = totalTimeHours * main_labor_rate;
      rebarCost = materialCost + laborCost;
    }

    let formingCost = 0;
    let baseFormingQty = 0;
    const selectedForming = inventory.find(i => i.id === item.selected_forming_id);
    const forming_rate = item.custom_forming_rate !== null && item.custom_forming_rate !== undefined ? item.custom_forming_rate : (selectedForming?.cost_per_unit || 0);

    if (item.include_forming) {
      const perim = item.foundation_type === 'spread_foot'
        ? 2 * (lenIn + widIn) / 12
        : Math.PI * diaIn / 12;
      const formingAreaSqFt = perim * (depIn / 12);
      
      // Calculate pcs based on perimeter
      // standard 16ft lengths
      baseFormingQty = Math.ceil(perim / 16) * (parseInt(item.quantity) || 1);
      const formingQty = item.custom_forming_qty !== null && item.custom_forming_qty !== undefined ? item.custom_forming_qty : baseFormingQty;
      
      const formingMaterialCost = formingQty * forming_rate;
      
      // Keep old labor calculation logic
      const laborCost = formingAreaSqFt * (parseInt(item.quantity) || 1) * forming_cost_per_sqft;
      formingCost = laborCost + formingMaterialCost + (concreteCost * forming_mult);
    }

    let finishingCost = 0;
    let baseFinishingHours = 0;
    const finishing_rate = item.custom_finishing_rate !== null && item.custom_finishing_rate !== undefined ? item.custom_finishing_rate : main_labor_rate;

    if (item.include_finishing) {
      const topArea = item.foundation_type === 'spread_foot'
        ? (lenIn * widIn) / 144
        : Math.PI * ((diaIn / 2 / 12) ** 2);
        
      // back out hours from sqft cost formula
      const defaultFinishingCost = topArea * (parseInt(item.quantity) || 1) * finishing_cost_per_sqft;
      baseFinishingHours = defaultFinishingCost / main_labor_rate;
      const finishingHours = item.custom_finishing_hours !== null && item.custom_finishing_hours !== undefined ? item.custom_finishing_hours : baseFinishingHours;
      
      finishingCost = finishingHours * finishing_rate;
    }

    let pouringCost = volumeCY * pouring_cost_per_cy;

    let excavationCost = 0;
    let baseExcavationHours = 0;
    const excVol = volumeCY * 1.25;
    if (item.excavation_method === 'hand_dig' || !item.excavation_method) {
      const timePerCy = getSetting('foundation_hand_dig_time_per_cy', 2.0);
      baseExcavationHours = excVol * timePerCy;
    } else {
      const timePerCy = getSetting('foundation_equipment_excavation_time_per_cy', 0.5);
      baseExcavationHours = excVol * timePerCy;
    }
    
    const excavationHours = item.custom_excavation_hours !== null && item.custom_excavation_hours !== undefined ? item.custom_excavation_hours : baseExcavationHours;
    const excavation_rate = item.custom_excavation_rate !== null && item.custom_excavation_rate !== undefined ? item.custom_excavation_rate : main_labor_rate;
    
    excavationCost = excavationHours * excavation_rate;

    return { 
      concreteCost, 
      concreteBags,
      volumeCY,
      baseVolumeCY,
      baseBags,
      rebarCost, 
      rebarFt,
      baseRebarFt,
      formingCost,
      formingQty: item.custom_forming_qty !== null && item.custom_forming_qty !== undefined ? item.custom_forming_qty : baseFormingQty,
      baseFormingQty,
      finishingCost, 
      finishingHours: item.custom_finishing_hours !== null && item.custom_finishing_hours !== undefined ? item.custom_finishing_hours : baseFinishingHours,
      baseFinishingHours,
      pouringCost,
      excavationCost, 
      excavationHours,
      baseExcavationHours,
      concreteRate: conc_cost,
      rebarRate: rebar_cost,
      formingRate: forming_rate,
      finishingRate: finishing_rate,
      excavationRate: excavation_rate,
      selectedConcreteName: selectedConcrete?.material_name || '',
      selectedRebarName: activeRebar?.material_name || '',
      selectedFormingName: selectedForming?.material_name || '',
      total: concreteCost + rebarCost + formingCost + finishingCost + pouringCost + excavationCost 
    };
  };

  const totals = (() => {
    let itemsTotalWithoutConcrete = items.reduce((s, item) => s + calcItemCost(item).total, 0);
    
    // Concrete project-level calculation
    const concreteServiceItems = items.filter(item => {
        const inv = inventory.find(i => i.id === item.selected_concrete_id);
        return !inv || inv.material_type === 'concrete_service';
    });
    const totalConcreteYards = concreteServiceItems.reduce((sum, item) => sum + calcItemCost(item).volumeCY, 0);
    const roundedYards = Math.ceil(totalConcreteYards * 4) / 4;
    
    const firstConcreteItem = concreteServiceItems.find(i => inventory.find(inv => inv.id === i.selected_concrete_id)?.material_type === 'concrete_service');
    const firstConcreteInv = firstConcreteItem ? inventory.find(inv => inv.id === firstConcreteItem.selected_concrete_id) : null;
    
    const availableMixes = getConcreteMixes(firstConcreteInv);
    const availableAdmixes = getConcreteAdmixtures(firstConcreteInv);
    
    const mix = availableMixes.find(m => m.id === project.project_concrete_type) || availableMixes.find(m => m.id === '4000_ae');
    const mixPrice = mix ? mix.price : 201;
    
    const admixPrice = (project.project_concrete_admixtures || []).reduce((sum, admixId) => {
        const a = availableAdmixes.find(x => x.id === admixId);
        return sum + (a ? a.price : 0);
    }, 0);
    
    const ratePerYard = mixPrice + admixPrice;
    
    let concreteTotal = 0;
    let remainingYards = roundedYards;
    const trucksList = [];
    
    while (remainingYards > 0) {
        let truckYards = Math.min(remainingYards, 9);
        remainingYards -= truckYards;
        
        let smallOrderFee = 0;
        if (truckYards <= 1.75) smallOrderFee = 150;
        else if (truckYards <= 2.75) smallOrderFee = 120;
        else if (truckYards <= 3.75) smallOrderFee = 105;
        else if (truckYards <= 4.25) smallOrderFee = 80;
        else if (truckYards <= 4.75) smallOrderFee = 40;
        
        let fuelFee = 30; // Per load fuel fee
        
        let truckCost = (truckYards * ratePerYard) + smallOrderFee + fuelFee;
        trucksList.push({ yards: truckYards, cost: truckCost, smallOrderFee, fuelFee });
        concreteTotal += truckCost;
    }
    
    // Additional stops calculation
    // "When a new foundation is made I need a checkbox that says 'This is a new sign location'. 
    // If this box is checked apply the cost... called 'Additional Sign Locations/Stops'"
    const newSignLocationsCount = items.filter(i => i.is_new_sign_location).length;
    // We assume the first location is free/included, and each checkbox checked means +1 stop
    // Or does checking the box literally mean it's an additional stop? Yes: "If this box is checked apply the cost..."
    const additionalStopsCost = newSignLocationsCount * 100;
    concreteTotal += additionalStopsCost;

    const itemsTotal = itemsTotalWithoutConcrete + concreteTotal;

    const wallTotal = walls.reduce((s, w) => s + (w.calculatedCosts?.totalCost || 0), 0);
    const polesTotal = polesData.reduce((sum, p) => {
        const inv = inventory.find(i => i.id === p.pole_id);
        if (!inv) return sum;
        if (inv.pole_pricing_mode === 'stock_price') {
            const stockLen = (inv.pole_stock_length_ft || 20) * 12;
            const pieces = Math.ceil(p.height_inches / stockLen);
            const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : (inv.pole_stock_price || 0);
            return sum + (pieces * rate);
        } else {
            const rate = typeof p.custom_cost_per_unit === 'number' ? p.custom_cost_per_unit : (inv.cost_per_unit || 0);
            return sum + ((p.height_inches / 12) * rate);
        }
    }, 0);

    const allAttachments = inventory.filter(i => i.material_type === 'attachment');
    const allSubAttachments = inventory.filter(i => i.material_type === 'sub_attachment');
    
    const equipmentTotal = selectedEquipmentList.reduce((sum, entry) => {
      const eq = inventory.find(i => i.id === entry.equipment_id);
      if (!eq) return sum;
      
      const rentalPeriod = entry.rental_period || 'day';
      const rentalDuration = entry.rental_duration || 1;
      
      const durationOverride = entry.custom_qty !== undefined && entry.custom_qty !== null ? entry.custom_qty : rentalDuration;
      
      const getRentalCost = (item, rateOverride) => {
        if (rateOverride !== undefined && rateOverride !== null) return rateOverride * durationOverride;
        if (rentalPeriod === 'day') return (item.cost_per_day || 0) * durationOverride;
        if (rentalPeriod === 'week') return (item.cost_per_week || 0) * durationOverride;
        if (rentalPeriod === 'month') return (item.cost_per_month || 0) * durationOverride;
        return 0;
      };
      
      let entryTotal = getRentalCost(eq, entry.custom_rate);
      const deliveryCharge = entry.custom_delivery_charge !== undefined && entry.custom_delivery_charge !== null ? entry.custom_delivery_charge : (eq.pickup_delivery_cost || 0);
      
      if (entry.include_delivery) entryTotal += deliveryCharge;
      
      if (entry.attachment_counts) {
        Object.entries(entry.attachment_counts).forEach(([id, qty]) => {
          const a = allAttachments.find(att => att.id === id);
          if (a) entryTotal += getRentalCost(a) * qty;
        });
      } else if (entry.attachment_ids) {
        entry.attachment_ids.forEach(id => {
          const a = allAttachments.find(att => att.id === id);
          if (a) entryTotal += getRentalCost(a);
        });
      }
      
      if (entry.sub_attachment_counts) {
        Object.entries(entry.sub_attachment_counts).forEach(([id, qty]) => {
          const s = allSubAttachments.find(sub => sub.id === id);
          if (s) entryTotal += getRentalCost(s) * qty;
        });
      }
      
      return sum + entryTotal;
    }, 0);

    return { 
      itemsTotal, wallTotal, polesTotal, equipmentTotal, grand: itemsTotal + wallTotal + polesTotal + equipmentTotal,
      concreteTotal,
      trucksList,
      totalConcreteYards,
      roundedYards,
      additionalStopsCost,
      newSignLocationsCount,
      mixPrice,
      admixPrice,
      ratePerYard
    };
  })();

  const handleSave = async (isAutoSave = false) => {
    if (saving || autoSaving) return;
    
    const missing = [];
    if (!project.project_name) missing.push('project_name');
    if (!project.client_name) missing.push('client_name');
    
    if (missing.length > 0) {
      if (isAutoSave) return;
      setMissingFields(missing);
      setActiveTab('info');
      setTimeout(() => setMissingFields([]), 3000);
      return;
    }
    
    if (isAutoSave) setAutoSaving(true);
    else setSaving(true);
    
    const total_excavation = items.reduce((sum, item) => sum + calcItemCost(item).excavationCost, 0);
    const total_equipment = totals.equipmentTotal;
    const total_labor = items.reduce((sum, item) => {
      const c = calcItemCost(item);
      return sum + c.finishingCost + c.pouringCost + c.formingCost; // Includes forming cost logic
    }, 0) + walls.reduce((sum, w) => sum + (w.calculatedCosts?.laborCost || 0) + (w.calculatedCosts?.internalLaborCost || 0), 0);
    const total_materials = totals.grand - total_excavation - total_equipment - total_labor;

    const data = {
      ...project,
      items: items.map(({ _id, ...rest }) => rest),
      walls: walls.map(({ _id, ...rest }) => rest),
      poles: polesData.map(({ id, ...rest }) => rest),
      selected_equipment: selectedEquipmentList.map(({ _id, ...rest }) => rest),
      total_excavation_cost: total_excavation,
      total_equipment_cost: total_equipment,
      total_labor_cost: total_labor,
      total_concrete_cost: total_materials,
      total_rebar_cost: 0,
    };
    
    const currentId = project.id || editId;
    try {
      if (currentId) { 
        await FoundationProjectEntity.update(currentId, data); 
      } else { 
        const created = await FoundationProjectEntity.create(data); 
        setProject(prev => ({...prev, id: created.id}));
        window.history.replaceState(null, '', `?id=${created.id}`);
      }
      setIsDirty(false);
      setLastSaved(new Date());
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      if (isAutoSave) {
        setAutoSaving(false);
      } else {
        setSaving(false);
        navigate(createPageUrl('FoundationProjects'));
      }
    }
  };

  const handleSaveAs = async () => {
    if (saving || autoSaving) return;
    
    setSaving(true);
    
    const total_excavation = items.reduce((sum, item) => sum + calcItemCost(item).excavationCost, 0);
    const total_equipment = totals.equipmentTotal;
    const total_labor = items.reduce((sum, item) => {
      const c = calcItemCost(item);
      return sum + c.finishingCost + c.pouringCost + c.formingCost;
    }, 0) + walls.reduce((sum, w) => sum + (w.calculatedCosts?.laborCost || 0) + (w.calculatedCosts?.internalLaborCost || 0), 0);
    const total_materials = totals.grand - total_excavation - total_equipment - total_labor;

    const data = {
      ...project,
      project_name: `${project.project_name || 'Project'} - Copy`,
      items: items.map(({ _id, ...rest }) => rest),
      walls: walls.map(({ _id, ...rest }) => rest),
      poles: polesData.map(({ id, ...rest }) => rest),
      selected_equipment: selectedEquipmentList.map(({ _id, ...rest }) => rest),
      total_excavation_cost: total_excavation,
      total_equipment_cost: total_equipment,
      total_labor_cost: total_labor,
      total_concrete_cost: total_materials,
      total_rebar_cost: 0,
    };
    
    delete data.id;
    
    try {
      const created = await FoundationProjectEntity.create(data); 
      setProject(prev => ({...prev, id: created.id, project_name: data.project_name}));
      window.history.replaceState(null, '', `?id=${created.id}`);
      setIsDirty(false);
      setLastSaved(new Date());
    } catch (e) {
      console.error("Save As failed", e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    autoSaveRef.current = () => {
      if (isDirty && !saving && !autoSaving) {
        handleSave(true);
      }
    };
  }, [project, items, walls, polesData, selectedEquipmentList, totals, isDirty, editId, saving, autoSaving]);

  useEffect(() => {
    // Lock body scroll to strictly use our internal scroll container
    document.body.style.overflow = 'hidden';
    const interval = setInterval(() => {
      if (autoSaveRef.current) autoSaveRef.current();
    }, 30000); // 30 seconds
    return () => {
      document.body.style.overflow = '';
      clearInterval(interval);
    };
  }, []);

  const handleBlur = (e) => {
    // We defer the save slightly to let state update if multiple fields blur in sequence
    setTimeout(() => {
      if (autoSaveRef.current) autoSaveRef.current();
    }, 500);
  };

  const poles = inventory.filter(i => i.material_type === 'pole');
  const concreteServices = inventory.filter(i => i.material_type === 'concrete_service' || i.material_type === 'bagged_concrete');
  const formingInventory = inventory.filter(i => i.material_type === 'forming_material');

  const hasConcreteService = items.some(item => {
    const invItem = inventory.find(i => i.id === item.selected_concrete_id);
    return invItem && invItem.material_type === 'concrete_service';
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 61px)' }} onBlur={handleBlur}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white flex-shrink-0 flex-wrap gap-2 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('FoundationProjects')}>
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{(editId || project.id) ? 'Edit Concrete | Masonry | Poles Estimate' : 'Concrete | Masonry | Poles'}</h1>
            <p className="text-xs text-slate-500">Engineering, foundation, excavation, wall & pole estimating</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-2">
            {autoSaving && <span className="text-xs text-amber-600 font-medium">Auto-saving...</span>}
            {lastSaved && !autoSaving && !isDirty && <span className="text-xs text-slate-400">All changes saved to cloud</span>}
            {isDirty && !autoSaving && <span className="text-xs text-slate-400">Unsaved changes...</span>}
          </div>
          <Badge variant="secondary" className="px-3 py-1">Total: ${totals.grand.toFixed(2)}</Badge>
          <Button onClick={() => setHelpTrigger(true)} variant="ghost" size="sm" className="h-8 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100">
            <HelpCircle className="w-3.5 h-3.5 mr-1.5" /> Help
          </Button>
          <div className="flex items-center gap-0.5 border-x border-slate-200 px-1">
            <Button onClick={handleUndo} disabled={historyIndex <= 0} variant="ghost" size="sm" className="h-8 px-2 text-xs text-slate-600" title="Undo">
              <Undo className="w-3.5 h-3.5 mr-1" /> Undo
            </Button>
            <Button onClick={handleRedo} disabled={historyIndex >= history.length - 1} variant="ghost" size="sm" className="h-8 px-2 text-xs text-slate-600" title="Redo">
              <Redo className="w-3.5 h-3.5 mr-1" /> Redo
            </Button>
          </div>
          {(editId || project.id) && (
             <Button onClick={handleSaveAs} disabled={saving} variant="outline" size="sm" className="h-8 text-xs bg-white">
               <Copy className="w-3.5 h-3.5 mr-1" /> Save As Copy
             </Button>
          )}
          <Button onClick={() => handleSave(false)} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs" size="sm">
            <Save className="w-3.5 h-3.5 mr-1" />{saving ? 'Saving...' : 'Save & Exit'}
          </Button>
        </div>
      </div>

      <HelpAssistant 
        activeTab={activeTab} 
        manualTrigger={helpTrigger} 
        onManualTriggerClose={() => setHelpTrigger(false)} 
        onStepChange={(stepIdx, stepObj) => {
          if (activeTab === 'foundation' && items.length > 0) {
            setItems(prev => {
              const arr = [...prev];
              const it = { ...arr[0] };
              let changed = false;
              if (stepObj.targetId === 'foundation-toggles-0') {
                 it.include_forming = false; it.include_rebar = false; it.include_finishing = false; changed = true;
              } else if (stepObj.targetId === 'foundation-forming-0') {
                 it.include_forming = true; it.include_rebar = false; it.include_finishing = false; changed = true;
              } else if (stepObj.targetId === 'foundation-rebar-0') {
                 it.include_forming = true; it.include_rebar = true; it.include_finishing = false; changed = true;
              } else if (stepObj.targetId === 'foundation-excavation-0') {
                 it.include_forming = true; it.include_rebar = true; it.include_finishing = true; changed = true;
              }
              if (changed) { arr[0] = it; return arr; }
              return prev;
            });
          }
        }}
      />

      {designerOpen && (
        <SignDesignerModal
          open={designerOpen}
          onClose={() => setDesignerOpen(false)}
          onSave={handleSaveSign}
          initialSign={designerPoleIdx !== null && designerSignIdx !== null ? polesData[designerPoleIdx]?.signs[designerSignIdx] : null}
        />
      )}

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Full-width scroll container to place scrollbar on the far right */}
        <div className="w-full h-full overflow-y-auto overflow-x-hidden flex items-start">

          {/* LEFT: Tabs / Forms */}
          <div className={`flex flex-col min-w-0 pb-12 ${show3D ? 'lg:w-[50%]' : 'w-full'}`}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0">
              <div className="p-4 pb-0 bg-white border-b flex-shrink-0 z-30 sticky top-0 shadow-sm">
                <TabsList className="mb-4 flex-wrap h-auto bg-slate-100/80 p-1.5 border border-slate-200 rounded-xl shadow-sm">
                <TabsTrigger value="info">Project Info</TabsTrigger>
                <TabsTrigger value="foundation">Foundation ({items.length})</TabsTrigger>
                {items.some(i => i.excavation_method === 'equipment_excavation') && (
                  <TabsTrigger value="equipment">Equipment {selectedEquipmentList.length > 0 ? `(${selectedEquipmentList.length})` : ''}</TabsTrigger>
                )}
                <TabsTrigger value="walls_poles">Walls & Poles ({walls.length + polesData.length})</TabsTrigger>
                <TabsTrigger value="beautify">Signage & Landscape</TabsTrigger>
                <TabsTrigger value="summary">Cost Summary</TabsTrigger>
                <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 pt-0">
              {/* PROJECT INFO */}
              <TabsContent value="info" className="space-y-4 pt-4">
                <Card className="border-indigo-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-indigo-50/50 border-b border-indigo-100"><CardTitle className="text-base text-indigo-900">Project Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div id="info-client-name">
                      <Label className={`text-xs transition-colors duration-300 ${missingFields.includes('client_name') ? 'text-red-600 font-bold' : ''}`}>Client Name *</Label>
                      <ClientSearchInput
                        value={project.client_name}
                        onChange={val => updateProject('client_name', val)}
                        onSelectProject={(data) => {
                          setProject(prev => ({
                            ...prev,
                            client_name: data.client_name || prev.client_name,
                            project_name: data.project_name || prev.project_name,
                            estimate_number: data.estimate_number || prev.estimate_number,
                            hyperlink: data.hyperlink || prev.hyperlink
                          }));
                          markDirty();
                        }}
                        className={`h-9 transition-all duration-300 ${missingFields.includes('client_name') ? 'border-red-500 ring-2 ring-red-200 bg-red-50 animate-pulse' : ''}`}
                      />
                    </div>
                    <div id="info-project-name">
                      <Label className={`text-xs transition-colors duration-300 ${missingFields.includes('project_name') ? 'text-red-600 font-bold' : ''}`}>Project Name *</Label>
                      <Input 
                        className={`h-9 transition-all duration-300 ${missingFields.includes('project_name') ? 'border-red-500 ring-2 ring-red-200 bg-red-50 animate-pulse' : ''}`}
                        value={project.project_name} 
                        onChange={e => updateProject('project_name', e.target.value)} 
                      />
                    </div>
                    <div id="info-estimate-number">
                      <Label className="text-xs">Estimate Number</Label>
                      <Input className="h-9" value={project.estimate_number} onChange={e => updateProject('estimate_number', e.target.value)} />
                    </div>
                    <div id="info-reference-link">
                      <Label className="text-xs">Reference Link</Label>
                      <Input className="h-9" value={project.hyperlink} onChange={e => updateProject('hyperlink', e.target.value)} placeholder="https://" />
                    </div>
                    <div className="col-span-1 md:col-span-2" id="info-notes">
                      <Label className="text-xs">Notes</Label>
                      <Textarea className="min-h-[70px]" value={project.notes} onChange={e => updateProject('notes', e.target.value)} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* FOUNDATION ITEMS */}
              <TabsContent value="foundation" className="space-y-4 pt-4">
                
                {/* AI Engineering Calculator */}
                <div id="btn-ai-assistant" className="flex flex-col items-start gap-4 w-full">
                  <div className="w-full bg-indigo-50 border-2 border-indigo-200 border-dashed rounded-xl p-5 flex flex-col md:flex-row items-center justify-between text-left gap-4 shadow-sm">
                    <div>
                      <h3 className="text-base font-bold text-indigo-900 flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-600"/> AI Engineering Assistant</h3>
                      <p className="text-sm text-indigo-700 mt-1">Generate concise wind load calculations and sizing recommendations for your foundation and poles.</p>
                    </div>
                    <AIEngineeringCalculatorModal onSave={(recommendation, aiData) => {
                        setProject(prev => ({ ...prev, ai_engineering_recommendation: recommendation, ai_engineering_data: aiData }));
                        markDirty();
                    }} />
                  </div>
                  
                  {project.ai_engineering_recommendation && (
                    <details className="w-full group" open>
                      <summary className="list-none w-full border border-indigo-200 bg-white shadow-sm rounded-lg py-3 px-4 flex flex-row items-center justify-between cursor-pointer hover:bg-slate-50 font-semibold text-indigo-900 text-sm transition-colors">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-indigo-600" />
                          AI Engineering Recommendations
                        </div>
                        <div className="flex items-center gap-4">
                          {project.ai_engineering_data && (
                             <Button 
                                size="sm" 
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                onClick={(e) => {
                                   e.preventDefault();
                                   if (items.length > 0) {
                                      const data = project.ai_engineering_data;
                                      if (data.foundation_type) updateItem(0, 'foundation_type', data.foundation_type);
                                      if (data.length_inches) updateItem(0, 'length_inches', data.length_inches);
                                      if (data.width_inches) updateItem(0, 'width_inches', data.width_inches);
                                      if (data.depth_inches) updateItem(0, 'depth_inches', data.depth_inches);
                                      if (data.diameter) updateItem(0, 'diameter', data.diameter);
                                   }
                                }}
                             >
                                Apply to Foundation
                             </Button>
                          )}
                          <span className="group-open:rotate-180 transition-transform duration-200">▼</span>
                        </div>
                      </summary>
                      <div className="p-5 border border-t-0 border-indigo-200 bg-indigo-50/30 rounded-b-lg -mt-1 text-sm text-indigo-950 whitespace-pre-wrap font-medium leading-relaxed">
                        {project.ai_engineering_recommendation}
                      </div>
                    </details>
                  )}
                </div>

                {hasConcreteService && (() => {
                  const firstConcreteItem = items.filter(item => {
                      const inv = inventory.find(i => i.id === item.selected_concrete_id);
                      return !inv || inv.material_type === 'concrete_service';
                  }).find(i => inventory.find(inv => inv.id === i.selected_concrete_id)?.material_type === 'concrete_service');
                  const firstConcreteInv = firstConcreteItem ? inventory.find(inv => inv.id === firstConcreteItem.selected_concrete_id) : null;
                  const availableMixes = getConcreteMixes(firstConcreteInv);
                  const availableAdmixes = getConcreteAdmixtures(firstConcreteInv);

                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                      <h3 className="text-base font-bold text-slate-800">Project-Wide Concrete Service Options</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Concrete Type / Mix</Label>
                          <Select 
                            value={project.project_concrete_type || '4000_ae'} 
                            onValueChange={v => updateProject('project_concrete_type', v)}
                          >
                            <SelectTrigger className="bg-white h-auto py-2"><SelectValue /></SelectTrigger>
                            <SelectContent className="w-[500px] max-w-[90vw]">
                              {availableMixes.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                  <div className="flex flex-col text-left py-1 whitespace-normal">
                                    <span className="font-bold">{m.name} <span className="font-normal text-slate-500">- ${m.price.toFixed(2)}/yd</span></span>
                                    <span className="text-xs text-slate-500 mt-0.5">{m.desc}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Admixtures & Additional Services</Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full justify-between bg-white text-left h-auto py-2">
                                <span className="truncate">
                                  {(project.project_concrete_admixtures || []).length > 0
                                    ? `${(project.project_concrete_admixtures || []).length} Admixture(s) Selected`
                                    : "Select Admixtures..."}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[400px] max-w-[90vw] p-2 space-y-1">
                              {availableAdmixes.map(admix => {
                                const isChecked = (project.project_concrete_admixtures || []).includes(admix.id);
                                return (
                                  <DropdownMenuCheckboxItem
                                    key={admix.id}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      let current = [...(project.project_concrete_admixtures || [])];
                                      if (checked) current.push(admix.id);
                                      else current = current.filter(x => x !== admix.id);
                                      updateProject('project_concrete_admixtures', current);
                                    }}
                                    className="flex flex-col items-start px-2 py-2 cursor-pointer whitespace-normal focus:bg-slate-50"
                                  >
                                    <div className="font-bold text-sm text-slate-900 leading-tight">
                                      {admix.name}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 leading-snug">{admix.desc}</p>
                                  </DropdownMenuCheckboxItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {items.map((item, idx) => (
                  <div key={item._id} id={idx === 0 ? "foundation-item-0" : undefined}>
                  <FoundationItemRow
                    item={item}
                    item={item}
                    index={idx}
                    onUpdate={(field, value) => updateItem(idx, field, value)}
                    onRemove={() => removeItem(idx)}
                    poles={poles}
                    concreteServices={concreteServices}
                    formingInventory={formingInventory}
                    costs={calcItemCost(item)}
                    excavationMethod={project.excavation_method}
                    excavationEquipment={inventory.find(i => i.id === project.selected_equipment_id)}
                  />
                  </div>
                ))}
                <Button id="btn-add-foundation" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Add Foundation Item
                </Button>
              </TabsContent>

              {/* EQUIPMENT */}
              {items.some(i => i.excavation_method === 'equipment_excavation') && (
              <TabsContent value="equipment" className="space-y-4 pt-4">
                <EquipmentTab
                  foundationItems={items}
                  inventory={inventory}
                  selectedEquipmentList={selectedEquipmentList}
                  onUpdate={setSelectedEquipmentList}
                  markDirty={markDirty}
                />
              </TabsContent>
              )}

              {/* WALLS AND POLES */}
              <TabsContent value="walls_poles" className="space-y-6 pt-4">
                <div id="wall-configurations" className="space-y-4 pb-6 border-b border-slate-200 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Wall Configurations</h3>
                      {wallMaterials.length === 0 && (
                        <p className="text-xs text-amber-700 mt-1">
                          No wall materials in inventory.{' '}
                          <Link to={createPageUrl('FoundationInventory')} className="underline font-medium">Add wall materials →</Link>
                        </p>
                      )}
                    </div>
                    <Button onClick={() => { addWall(); setActiveWallIndex(walls.length); }} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                      <Plus className="w-4 h-4 mr-1" /> Add Wall Type
                    </Button>
                  </div>

                  {walls.length === 0 && (
                    <Card className="border-dashed">
                      <CardContent className="py-10 text-center text-slate-400">
                        <div className="text-4xl mb-2">🧱</div>
                        <p className="font-medium">No walls added yet</p>
                        <p className="text-sm mt-1">Click "Add Wall Type" to configure materials.</p>
                      </CardContent>
                    </Card>
                  )}

                  {walls.map((wall, idx) => (
                    <WallSection
                      key={wall._id}
                      wall={wall}
                      index={idx}
                      isActive={activeWallIndex === idx}
                      onSetActive={() => setActiveWallIndex(idx)}
                      wallMaterials={wallMaterials}
                      fillMaterials={inventory.filter(i => i.material_type === 'fill_material')}
                      foundationItems={items}
                      settings={settings}
                      onChange={(updated) => updateWall(idx, updated)}
                      onDelete={() => { removeWall(idx); if (activeWallIndex === idx) setActiveWallIndex(0); }}
                      shakeMaterial={wallShakeIndex === idx}
                    />
                  ))}

                </div>

                <div id="layout-canvas" className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Layout Canvas</h3>
                    <p className="text-sm text-slate-600">Draw walls and place poles on your foundations.</p>
                  </div>
                  <div id="add-poles-toggle" className={`flex items-center gap-3 bg-slate-100 p-3 rounded-xl border-2 transition-all duration-500 cursor-pointer ${walls.length > 0 && polesData.length === 0 && !showPoles ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse' : 'border-slate-200'}`} onClick={() => setShowPoles(!showPoles)}>
                    <Checkbox id="add-poles" checked={showPoles} onCheckedChange={setShowPoles} className="w-5 h-5 pointer-events-none" />
                    <Label htmlFor="add-poles" className="font-bold text-sm cursor-pointer pointer-events-none">Add Pole/s</Label>
                  </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-5 items-start">
                  {/* Left: Canvas */}
                  <div className="flex-1 space-y-4 min-w-0 w-full">
                     <SharedCanvas 
                        foundationItems={items}
                        onFoundationUpdate={updateItem}
                        walls={walls}
                        activeWallIndex={activeWallIndex}
                        onWallShapeChange={(idx, shape) => {
                           const newWalls = [...walls];
                           newWalls[idx].shape = shape;
                           setWalls(newWalls);
                           markDirty();
                        }}
                        polesData={polesData}
                        polesInventory={poles}
                        selectedPoleId={selectedPoleId}
                        setSelectedPoleId={setSelectedPoleId}
                        onChangePoles={v => { setPolesData(v); markDirty(); }}
                        selectedPlacedIdx={selectedPlacedIdx}
                        setSelectedPlacedIdx={setSelectedPlacedIdx}
                        showPoles={showPoles}
                        mode={canvasMode}
                        setMode={setCanvasMode}
                        onPlaceWithoutPole={() => {
                          setShakePoleDropdown(true);
                          setTimeout(() => setShakePoleDropdown(false), 800);
                        }}
                        onWallMaterialError={() => handleWallMaterialError(activeWallIndex)}
                     />
                  </div>

                  {/* Right: Poles List */}
                  {showPoles && (
                    <div className="w-full xl:w-[240px] 2xl:w-[280px] space-y-4 flex-shrink-0">
                      
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-sm">
                        <h3 className="font-semibold text-slate-800 text-xs uppercase mb-2">Add Pole</h3>
                        <div className={`space-y-2 ${shakePoleDropdown ? 'animate-pulse ring-2 ring-red-500 rounded p-1 transition-all bg-red-50' : ''}`}>
                           <Select value={selectedPoleId} onValueChange={setSelectedPoleId}>
                              <SelectTrigger className="h-8 text-xs bg-white">
                                 <SelectValue placeholder="Select Pole..." />
                              </SelectTrigger>
                              <SelectContent>
                                 {poles.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.material_name}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                           <Button 
                             size="sm" 
                             variant={canvasMode === 'place' ? 'default' : 'outline'} 
                             onClick={() => setCanvasMode(canvasMode === 'place' ? 'draw' : 'place')} 
                             className="w-full h-8 text-xs"
                           >
                               <Crosshair className="w-3 h-3 mr-1.5" /> 
                               {canvasMode === 'place' ? 'Click on Canvas to Place' : 'Place on Canvas'}
                           </Button>
                           <Button
                             size="sm"
                             variant={canvasMode === 'move_pole' ? 'default' : 'outline'}
                             onClick={() => setCanvasMode(canvasMode === 'move_pole' ? 'draw' : 'move_pole')}
                             className="w-full h-8 text-xs mt-2"
                           >
                               <Move className="w-3 h-3 mr-1.5" />
                               Move Pole
                           </Button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
                          <h3 className="font-semibold text-slate-800 text-sm">Placed Poles ({polesData.length})</h3>
                        </div>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                          {polesData.length === 0 && (
                            <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                              No poles added yet. Select a pole from the bubble above and click on the canvas to place it.
                            </p>
                          )}
                          {polesData.map((pole, idx) => {
                            const isSelected = selectedPlacedIdx === idx;
                            return (
                              <div key={pole.id || idx} className={`border rounded-lg ${isSelected ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400' : 'border-slate-200 bg-white hover:border-slate-300'} cursor-pointer overflow-hidden transition-colors`} onClick={() => setSelectedPlacedIdx(idx)}>
                                <div className="p-1.5 px-2 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
                                  <span className="font-semibold text-xs text-slate-700">Pole {idx + 1}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                      <Label className="text-[10px] text-slate-500 font-semibold uppercase cursor-pointer" htmlFor={`pole-color-${idx}`}>Color</Label>
                                      <input 
                                        id={`pole-color-${idx}`}
                                        type="color" 
                                        defaultValue={pole.pole_color || '#475569'} 
                                        onBlur={(e) => {
                                          const arr = [...polesData];
                                          arr[idx].pole_color = e.target.value;
                                          setPolesData(arr);
                                          markDirty();
                                        }}
                                        className="w-5 h-5 rounded cursor-pointer border border-slate-300 p-0 overflow-hidden"
                                      />
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-5 w-5 text-red-500 hover:bg-red-100 rounded-md" onClick={(e) => {
                                        e.stopPropagation();
                                        setPolesData(polesData.filter((_, i) => i !== idx));
                                        if (selectedPlacedIdx === idx) setSelectedPlacedIdx(null);
                                        else if (selectedPlacedIdx > idx) setSelectedPlacedIdx(selectedPlacedIdx - 1);
                                    }}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {isSelected && (
                                  <div className="p-2 space-y-2" onClick={e => e.stopPropagation()}>
                                    <div>
                                      <Label className="text-[10px] text-slate-500 font-semibold uppercase mb-0.5 block">Foundation</Label>
                                      <Select 
                                        value={String(pole.foundation_idx || 0)} 
                                        onValueChange={v => {
                                            const arr = [...polesData];
                                            arr[idx].foundation_idx = parseInt(v);
                                            setPolesData(arr);
                                            markDirty();
                                        }}
                                      >
                                        <SelectTrigger className="h-6 text-[10px] bg-white">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(() => {
                                            const opts = [];
                                            let gIdx = 0;
                                            items.forEach((f, fIdx) => {
                                              const qty = f.quantity || 1;
                                              for (let q = 0; q < qty; q++) {
                                                opts.push(
                                                  <SelectItem key={gIdx} value={String(gIdx)} className="text-[10px]">
                                                    Foundation {gIdx + 1} {f.description ? `(${f.description})` : ''}
                                                  </SelectItem>
                                                );
                                                gIdx++;
                                              }
                                            });
                                            return opts;
                                          })()}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5">
                                        <div>
                                            <Label className="text-[10px] text-slate-500 font-semibold uppercase mb-0.5 block">Height Above Ground</Label>
                                            <Input type="number" className="h-6 text-[10px] px-1 bg-white" value={pole.height_inches} onChange={e => {
                                                const arr = [...polesData];
                                                arr[idx].height_inches = parseFloat(e.target.value) || 0;
                                                setPolesData(arr);
                                                markDirty();
                                            }} />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] text-slate-500 font-semibold uppercase mb-0.5 block">Depth in Ground</Label>
                                            <Input type="number" className="h-6 text-[10px] px-1 bg-white" value={pole.y_offset_inches} onChange={e => {
                                                const arr = [...polesData];
                                                arr[idx].y_offset_inches = parseFloat(e.target.value) || 0;
                                                setPolesData(arr);
                                                markDirty();
                                            }} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1.5 mt-1.5">
                                        <div>
                                            <Label className="text-[10px] text-slate-500 font-semibold uppercase mb-0.5 block">Rotation (°)</Label>
                                            <Input type="number" className="h-6 text-[10px] px-1 bg-white" value={pole.rotation_degrees || 0} onChange={e => {
                                                const arr = [...polesData];
                                                arr[idx].rotation_degrees = parseFloat(e.target.value) || 0;
                                                setPolesData(arr);
                                                markDirty();
                                            }} />
                                        </div>
                                    </div>
                                    
                                    <div className="pt-1">
                                        <Label className="text-[10px] text-slate-500 font-semibold uppercase mb-1 block">Center on Found</Label>
                                        <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
                                          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 flex-1 bg-white border border-slate-200 shadow-sm rounded-sm mr-0.5" onClick={() => centerPole(idx, 'both')} title="Center X/Y">C/C</Button>
                                          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 flex-1 bg-white border border-slate-200 shadow-sm rounded-sm mr-0.5" onClick={() => centerPole(idx, 'horizontal')} title="Center Horizontally">Horiz</Button>
                                          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 flex-1 bg-white border border-slate-200 shadow-sm rounded-sm" onClick={() => centerPole(idx, 'vertical')} title="Center Vertically">Vert</Button>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-1 flex gap-1">
                                       <Button 
                                          size="sm" 
                                          variant={canvasMode === 'move_pole' && selectedPlacedIdx === idx ? 'default' : 'outline'} 
                                          onClick={(e) => { e.stopPropagation(); setCanvasMode(canvasMode === 'move_pole' ? 'draw' : 'move_pole'); }}
                                          className="h-6 text-[10px] px-2 flex-1 bg-white border border-slate-200 shadow-sm rounded-sm"
                                      >
                                          <Move className="w-3 h-3 mr-1" /> Move Pole
                                      </Button>
                                    </div>


                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {(walls.length > 0 || polesData.length > 0) && (
                  <div className="space-y-4 pt-6 border-t border-slate-200 mt-6">
                    <h3 className="text-base font-bold text-slate-900">Walls & Poles Costs</h3>
                    {walls.map((wall, idx) => {
                      const costs = wall.calculatedCosts;
                      if (!costs) return null;
                      const isConcrete = wall.selectedMaterial?.wall_material_subtype === 'concrete';
                      const isInternalConcrete = wall.selectedInternalMaterial?.wall_material_subtype === 'concrete';

                      return (
                        <div key={`cost-${wall._id}`} className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 space-y-1 text-sm">
                          <p className="font-bold text-emerald-900">Wall #{idx + 1}: {wall.name || 'Untitled Wall'}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <p className="text-[11px] text-emerald-700/80 uppercase font-semibold">Outer Units Needed</p>
                              <p className="text-base font-bold text-emerald-900">{costs.totalBricks}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-emerald-700/80 uppercase font-semibold">Outer Material Cost</p>
                              <p className="text-base font-bold text-emerald-900">${costs.materialCost.toFixed(2)}</p>
                            </div>
                            {!isConcrete && (
                              <div>
                                <p className="text-[11px] text-emerald-700/80 uppercase font-semibold">Outer Mortar Cost</p>
                                <p className="text-base font-bold text-emerald-900">${costs.mortarCost.toFixed(2)}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-[11px] text-emerald-700/80 uppercase font-semibold">Outer Labor ({costs.laborHours.toFixed(1)} Hours)</p>
                              <p className="text-base font-bold text-emerald-900">${costs.laborCost.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          {wall.includeInternalWall && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-emerald-200/50 pt-2 mt-2">
                              <div>
                                <p className="text-[11px] text-emerald-700/80 uppercase font-semibold">Internal Units Needed</p>
                                <p className="text-base font-bold text-emerald-900">{costs.internalTotalBricks}</p>
                              </div>
                              <div>
                                <p className="text-[11px] text-emerald-700/80 uppercase font-semibold">Internal Material Cost</p>
                                <p className="text-base font-bold text-emerald-900">${costs.internalMaterialCost.toFixed(2)}</p>
                              </div>
                              {!isInternalConcrete && (
                                <div>
                                  <p className="text-[11px] text-emerald-700/80 uppercase font-semibold">Internal Mortar Cost</p>
                                  <p className="text-base font-bold text-emerald-900">${costs.internalMortarCost.toFixed(2)}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-[11px] text-emerald-700/80 uppercase font-semibold">Internal Labor ({costs.internalLaborHours.toFixed(1)} Hours)</p>
                                <p className="text-base font-bold text-emerald-900">${costs.internalLaborCost.toFixed(2)}</p>
                              </div>
                            </div>
                          )}

                          <div className="border-t border-emerald-200/50 pt-2 mt-2 flex items-center justify-between">
                            <p className="text-xs font-semibold text-emerald-700/80 uppercase tracking-wide">Total Wall Assembly Cost</p>
                            <p className="text-xl font-extrabold text-emerald-800">${costs.totalCost.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex flex-col md:flex-row gap-4">
                        {polesData.length > 0 && (
                           <Card className="bg-blue-50 border-blue-200 flex-1">
                              <CardContent className="py-3 px-4 flex items-center justify-between">
                                <span className="font-medium text-blue-800">Total Pole Cost</span>
                                <span className="text-lg font-bold text-blue-700">${totals.polesTotal.toFixed(2)}</span>
                              </CardContent>
                           </Card>
                        )}
    
                        {walls.length > 0 && (
                          <Card className="bg-amber-50 border-amber-200 flex-1">
                            <CardContent className="py-3 px-4 flex items-center justify-between">
                              <span className="font-medium text-amber-800">Total Wall Cost</span>
                              <span className="text-lg font-bold text-amber-700">${totals.wallTotal.toFixed(2)}</span>
                            </CardContent>
                          </Card>
                        )}
                    </div>
                  </div>
                )}

              </TabsContent>

              {/* BEAUTIFY */}
              <TabsContent value="beautify" className="space-y-4 pt-4">
                <div id="signage-cabinets" className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
                   <div>
                       <h3 className="font-bold text-slate-800">Signage Cabinets on Poles</h3>
                       <p className="text-xs text-slate-500">Add cabinets and signs to your placed poles. Place poles in the "Walls & Poles" tab.</p>
                   </div>
                </div>
                
                {polesData.length === 0 ? (
                   <p className="text-sm text-slate-500 italic bg-white border border-slate-200 p-4 rounded-lg">No poles placed yet. Go to the "Walls & Poles" tab to add poles first.</p>
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
                                      <span className="font-medium text-slate-700 truncate">{sign.name || `Cabinet ${sIdx + 1}`}</span>
                                      <div className="flex gap-1 flex-shrink-0">
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
                                       setPolesData(arr);
                                       markDirty();
                                   }} />
                                 </div>
                              ))}
                           </div>
                        </div>
                     ))}
                   </div>
                )}

                <div id="landscape-designer" className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
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
              </TabsContent>

              {/* SUMMARY */}
              <TabsContent value="summary" className="space-y-4 pt-4">
                <SummaryTab 
                  items={items} 
                  walls={walls} 
                  totals={totals} 
                  calcItemCost={calcItemCost} 
                  project={project} 
                  polesData={polesData} 
                  selectedEquipmentList={selectedEquipmentList} 
                  inventory={inventory} 
                  onUpdateItem={(idx, updates) => {
                    const arr = [...items];
                    arr[idx] = { ...arr[idx], ...updates };
                    setItems(arr);
                    markDirty();
                  }}
                  onUpdateWall={(idx, updates) => updateWall(idx, { ...walls[idx], ...updates })}
                  onUpdatePole={(idx, updates) => {
                    const arr = [...polesData];
                    arr[idx] = { ...arr[idx], ...updates };
                    setPolesData(arr);
                    markDirty();
                  }}
                  onUpdateEquipment={(idx, updates) => {
                    const arr = [...selectedEquipmentList];
                    arr[idx] = { ...arr[idx], ...updates };
                    setSelectedEquipmentList(arr);
                    markDirty();
                  }}
                />
              </TabsContent>

              {/* BOM */}
              <TabsContent value="bom" className="space-y-4 pt-4">
                <BOMTab items={items} walls={walls} project={project} inventory={inventory} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* RIGHT: Persistent 3D Viewer */}
        <div 
          className={`hidden lg:flex flex-col border-l bg-slate-100 transition-all duration-300 sticky top-0 h-full ${show3D ? 'w-[50%]' : 'w-0'}`}
        >
          <div className="px-4 py-2 border-b bg-white flex items-center justify-between flex-shrink-0 h-12">
            {show3D && (
              <div>
                <span className="text-sm font-semibold text-slate-700">3D Preview</span>
                <span className="text-xs text-slate-400 ml-2">Updates live as you edit</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShow3D(!show3D)} className={!show3D ? "mx-auto" : ""}>
              {show3D ? 'Hide 3D View' : 'Show 3D View'}
            </Button>
          </div>
          {show3D && (
            <div className="flex-1 p-3 overflow-hidden h-full">
              <FoundationWalls3DViewer 
                 items={items} 
                 walls={walls} 
                 polesData={polesData} 
                 polesInventory={poles} 
                 formingInventory={formingInventory} 
                 beautifyDataUrl={project.beautify_data_url} 
                 onUndo={handleUndo}
                 onRedo={handleRedo}
                 canUndo={historyIndex > 0}
                 canRedo={historyIndex < history.length - 1}
              />
            </div>
          )}
        </div>

        </div>
      </div>
    </div>
  );
}