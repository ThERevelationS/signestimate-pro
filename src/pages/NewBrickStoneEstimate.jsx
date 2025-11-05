
import React, { useState, useEffect, useRef } from "react";
import { BrickStoneProject, BrickStoneInventory, Settings } from "@/entities/all";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, ArrowLeft, Box, Eye, EyeOff } from "lucide-react";

export default function NewBrickStoneEstimate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const topViewRef = useRef(null);
  const sideViewRef = useRef(null);

  const [project, setProject] = useState({
    project_name: "",
    client_name: "",
    estimate_number: "",
    hyperlink: "",
    base_type: "solid_rectangular",
    base_length: 48,
    base_width: 36,
    base_height: 36,
    layers: 1,
    mortar_gap: 0.375,
    waste_factor: 1.1,
    selected_material_id: "",
    notes: ""
  });

  const [inventory, setInventory] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [calculations, setCalculations] = useState(null);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true);

  useEffect(() => {
    loadData();
    if (editId) {
      loadProjectForEdit(editId);
    }
  }, [editId]);

  useEffect(() => {
    if (selectedMaterial && project.base_length && project.base_width && project.base_height) {
      performCalculations();
    }
  }, [selectedMaterial, project.base_type, project.base_length, project.base_width, project.base_height, project.layers, project.mortar_gap, project.waste_factor]);

  useEffect(() => {
    drawVisualizations();
  }, [project, selectedMaterial, showDimensions, calculations]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const inventoryData = await BrickStoneInventory.list();
      const settingsData = await Settings.list();
      
      setInventory(inventoryData);
      
      const settingsObj = {};
      settingsData.forEach(s => {
        settingsObj[s.setting_name] = s.setting_value;
      });
      setSettings(settingsObj);

      if (!editId) {
        setProject(prev => ({
          ...prev,
          mortar_gap: parseFloat(settingsObj.brick_mortar_gap || 0.375),
          waste_factor: parseFloat(settingsObj.brick_waste_factor || 1.1)
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const loadProjectForEdit = async (projectId) => {
    try {
      const projectData = await BrickStoneProject.get(projectId);
      if (projectData) {
        setProject(projectData);
        if (projectData.selected_material_id) {
          const material = inventory.find(m => m.id === projectData.selected_material_id);
          setSelectedMaterial(material);
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const performCalculations = () => {
    if (!selectedMaterial) {
      return;
    }

    const projectData = project;
    const material = selectedMaterial;
    
    const baseType = projectData.base_type;
    const baseLength = projectData.base_length;
    const baseWidth = projectData.base_width;
    const baseHeight = projectData.base_height;
    const layers = projectData.layers;
    const mortarGap = projectData.mortar_gap;
    const wasteFactor = projectData.waste_factor;
    
    const brickL = material.length;
    const brickW = material.width;
    const brickH = material.height;
    const costPerUnit = material.cost_per_unit;

    const effectiveBrickL = brickL + mortarGap;
    const effectiveBrickW = brickW + mortarGap;
    const effectiveBrickH = brickH + mortarGap;

    // Calculate actual dimensions using whole bricks only (no cutting)
    const bricksAlongLength = Math.round(baseLength / effectiveBrickL);
    const actualLength = bricksAlongLength * effectiveBrickL - mortarGap;
    
    const bricksAlongWidth = Math.round(baseWidth / effectiveBrickW);
    const actualWidth = bricksAlongWidth * effectiveBrickW - mortarGap;
    
    const coursesHigh = Math.round(baseHeight / effectiveBrickH);
    const actualHeight = coursesHigh * effectiveBrickH - mortarGap;

    // AUTO-ADJUST PROJECT DIMENSIONS TO ACTUAL BUILD DIMENSIONS
    setProject(prev => ({
      ...prev,
      base_length: parseFloat(actualLength.toFixed(3)),
      base_width: parseFloat(actualWidth.toFixed(3)),
      base_height: parseFloat(actualHeight.toFixed(3))
    }));

    let totalBricks = 0;
    let surfaceArea = 0;

    if (baseType === 'solid_rectangular') {
      totalBricks = coursesHigh * bricksAlongLength * bricksAlongWidth * layers;
      surfaceArea = ((actualLength * actualHeight) * 2 + (actualWidth * actualHeight) * 2 + (actualLength * actualWidth)) / 144;
    } else if (baseType === 'hollow_rectangular') {
      const wallThickness = layers * brickW;
      
      const frontBackBricks = coursesHigh * bricksAlongLength * layers * 2;
      
      const innerWidth = actualWidth - (2 * wallThickness);
      const bricksAlongInnerWidth = Math.max(0, Math.round(innerWidth / effectiveBrickL));
      const leftRightBricks = coursesHigh * bricksAlongInnerWidth * layers * 2;
      
      totalBricks = frontBackBricks + leftRightBricks;
      surfaceArea = ((actualLength * actualHeight) * 2 + ((actualWidth - 2 * wallThickness) * actualHeight) * 2) / 144;
    }

    const totalBricksWithWaste = Math.ceil(totalBricks * wasteFactor);
    const mortarBagsPerSqFt = parseFloat(settings.brick_mortar_bags_per_100sqft || 3) / 100;
    const mortarBags = Math.ceil(surfaceArea * mortarBagsPerSqFt);
    const mortarCostPerBag = parseFloat(settings.brick_mortar_cost_per_bag || 12);
    const materialCost = totalBricksWithWaste * costPerUnit;
    const mortarCost = mortarBags * mortarCostPerBag;
    const totalCost = materialCost + mortarCost;

    setCalculations({
      totalBricks: Math.round(totalBricks),
      totalBricksWithWaste: totalBricksWithWaste,
      surfaceArea: surfaceArea.toFixed(2),
      mortarBags: mortarBags,
      materialCost: materialCost,
      mortarCost: mortarCost,
      totalCost: totalCost,
      actualLength: actualLength.toFixed(2),
      actualWidth: actualWidth.toFixed(2),
      actualHeight: actualHeight.toFixed(2),
      bricksAlongLength: bricksAlongLength,
      bricksAlongWidth: bricksAlongWidth,
      coursesHigh: coursesHigh
    });
  };

  const drawVisualizations = () => {
    if (!topViewRef.current || !sideViewRef.current || !project.base_length || !calculations) {
      return;
    }

    const actualLength = parseFloat(calculations.actualLength);
    const actualWidth = parseFloat(calculations.actualWidth);
    const actualHeight = parseFloat(calculations.actualHeight);

    const drawTopView = () => {
      const canvas = topViewRef.current;
      const ctx = canvas.getContext('2d');
      const padding = 40;
      const availableWidth = 300 - (padding * 2);
      const availableHeight = 300 - (padding * 2);
      const scale = Math.min(availableWidth / actualLength, availableHeight / actualWidth);

      ctx.clearRect(0, 0, 300, 300);
      ctx.save();
      ctx.translate(padding, padding);

      if (!selectedMaterial || !showDimensions) {
        ctx.fillStyle = selectedMaterial ? '#dc2626' : '#cbd5e1';
        ctx.fillRect(0, 0, actualLength * scale, actualWidth * scale);
        
        if (project.base_type === 'hollow_rectangular' && selectedMaterial) {
          const wallThickness = project.layers * selectedMaterial.width;
          const innerX = wallThickness * scale;
          const innerY = wallThickness * scale;
          const innerW = (actualLength - 2 * wallThickness) * scale;
          const innerH = (actualWidth - 2 * wallThickness) * scale;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(innerX, innerY, innerW, innerH);
        }
        
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, actualLength * scale, actualWidth * scale);
      } else {
          // Background - mortar color
          ctx.fillStyle = '#e8ddd1';
          ctx.fillRect(0, 0, actualLength * scale, actualWidth * scale);

          const brickL = selectedMaterial.length;
          const brickW = selectedMaterial.width;
          const mortarGap = project.mortar_gap;

          if (project.base_type === 'solid_rectangular') {
            const numBricksLength = calculations.bricksAlongLength;
            const numBricksWidth = calculations.bricksAlongWidth;
            
            // Draw each brick as a solid red rectangle - NO OVERLAY
            ctx.fillStyle = '#a8332e';
            
            for (let row = 0; row < numBricksWidth; row++) {
              const yStart = row * (brickW + mortarGap);
              const runningBondOffset = (row % 2) * (brickL / 2);
              
              for (let col = 0; col < numBricksLength; col++) {
                let xStart = col * (brickL + mortarGap) - runningBondOffset;
                
                if (xStart < -brickL * 0.99) continue;
                
                const brickXStart = Math.max(0, xStart);
                const brickXEnd = Math.min(actualLength, xStart + brickL);
                const visibleLength = brickXEnd - brickXStart;
                
                if (visibleLength < brickL * 0.05) continue;
                
                // Draw solid brick - no overlay
                ctx.fillRect(brickXStart * scale, yStart * scale, visibleLength * scale, brickW * scale);
              }
            }
          } else if (project.base_type === 'hollow_rectangular') {
            const wallThickness = project.layers * selectedMaterial.width;
            const innerXStart = wallThickness;
            const innerYStart = wallThickness;
            const innerXEnd = actualLength - wallThickness;
            const innerYEnd = actualWidth - wallThickness;
            
            const numBricksLength = calculations.bricksAlongLength;
            const coursesInWall = Math.max(1, Math.round(wallThickness / (brickW + mortarGap)));
            const innerHeight = innerYEnd - innerYStart;
            const numBricksInnerHeight = Math.max(1, Math.round(innerHeight / (brickL + mortarGap)));
            
            // Draw all bricks as solid red rectangles - NO OVERLAY
            ctx.fillStyle = '#a8332e';
            
            // FRONT WALL (bottom horizontal)
            for (let row = 0; row < coursesInWall; row++) {
              const yStart = row * (brickW + mortarGap);
              if (yStart + brickW > wallThickness + 0.01) break;
              
              const runningBondOffset = (row % 2) * (brickL / 2);
              
              for (let col = 0; col < numBricksLength; col++) {
                let xStart = col * (brickL + mortarGap) - runningBondOffset;
                if (xStart < -brickL * 0.99) continue;
                
                const brickXStart = Math.max(0, xStart);
                const brickXEnd = Math.min(actualLength, xStart + brickL);
                const visibleLength = brickXEnd - brickXStart;
                
                if (visibleLength < brickL * 0.05) continue;
                
                ctx.fillRect(brickXStart * scale, yStart * scale, visibleLength * scale, brickW * scale);
              }
            }
            
            // BACK WALL (top horizontal)
            const backWallYStart = actualWidth - wallThickness;
            for (let row = 0; row < coursesInWall; row++) {
              const yStart = backWallYStart + row * (brickW + mortarGap);
              if (yStart + brickW > actualWidth + 0.01) break;
              
              const runningBondOffset = (row % 2) * (brickL / 2);
              
              for (let col = 0; col < numBricksLength; col++) {
                let xStart = col * (brickL + mortarGap) - runningBondOffset;
                if (xStart < -brickL * 0.99) continue;
                
                const brickXStart = Math.max(0, xStart);
                const brickXEnd = Math.min(actualLength, xStart + brickL);
                const visibleLength = brickXEnd - brickXStart;
                
                if (visibleLength < brickL * 0.05) continue;
                
                ctx.fillRect(brickXStart * scale, yStart * scale, visibleLength * scale, brickW * scale);
              }
            }
            
            // LEFT WALL (vertical - bricks rotated 90°)
            for (let col = 0; col < coursesInWall; col++) {
              const xStart = col * (brickW + mortarGap);
              if (xStart + brickW > wallThickness + 0.01) break;
              
              const runningBondOffset = (col % 2) * (brickL / 2);
              
              for (let row = 0; row < numBricksInnerHeight; row++) {
                let yStart = innerYStart + row * (brickL + mortarGap) - runningBondOffset;
                if (yStart < innerYStart - brickL * 0.99) continue;
                
                const brickYStart = Math.max(innerYStart, yStart);
                const brickYEnd = Math.min(innerYEnd, yStart + brickL);
                const visibleLength = brickYEnd - brickYStart;
                
                if (visibleLength < brickL * 0.05) continue;
                
                ctx.fillRect(xStart * scale, brickYStart * scale, brickW * scale, visibleLength * scale);
              }
            }
            
            // RIGHT WALL (vertical - bricks rotated 90°)
            const rightWallXStart = actualLength - wallThickness;
            for (let col = 0; col < coursesInWall; col++) {
              const xStart = rightWallXStart + col * (brickW + mortarGap);
              if (xStart + brickW > actualLength + 0.01) break;
              
              const runningBondOffset = (col % 2) * (brickL / 2);
              
              for (let row = 0; row < numBricksInnerHeight; row++) {
                let yStart = innerYStart + row * (brickL + mortarGap) - runningBondOffset;
                if (yStart < innerYStart - brickL * 0.99) continue;
                
                const brickYStart = Math.max(innerYStart, yStart);
                const brickYEnd = Math.min(innerYEnd, yStart + brickL);
                const visibleLength = brickYEnd - brickYStart;
                
                if (visibleLength < brickL * 0.05) continue;
                
                ctx.fillRect(xStart * scale, brickYStart * scale, brickW * scale, visibleLength * scale);
              }
            }
            
            // Fill hollow center with white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(innerXStart * scale, innerYStart * scale, (innerXEnd - innerXStart) * scale, (innerYEnd - innerYStart) * scale);
          }
          
          // Draw borders
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3;
          ctx.strokeRect(0, 0, actualLength * scale, actualWidth * scale);
          
          if (project.base_type === 'hollow_rectangular') {
            const wallThickness = project.layers * selectedMaterial.width;
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.strokeRect(wallThickness * scale, wallThickness * scale, 
                          (actualLength - 2 * wallThickness) * scale, 
                          (actualWidth - 2 * wallThickness) * scale);
          }
        }

      if (showDimensions) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        
        ctx.fillText(calculations.actualLength + '"', (actualLength * scale) / 2, -15);
        
        ctx.save();
        ctx.translate(-15, (actualWidth * scale) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(calculations.actualWidth + '"', 0, 0);
        ctx.restore();
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('TOP VIEW', (actualLength * scale) / 2, actualWidth * scale + 25);
        
        if (selectedMaterial && project.layers > 1) {
          ctx.font = '10px sans-serif';
          ctx.fillText(`${calculations.bricksAlongLength} × ${calculations.bricksAlongWidth} bricks (${project.layers} layers)`, 
                      (actualLength * scale) / 2, actualWidth * scale + 38);
        }
      }

      ctx.restore();
    };

    const drawSideView = () => {
      const canvas = sideViewRef.current;
      const ctx = canvas.getContext('2d');
      const padding = 40;
      const availableWidth = 300 - (padding * 2);
      const availableHeight = 300 - (padding * 2);
      const scale = Math.min(availableWidth / actualLength, availableHeight / actualHeight);

      ctx.clearRect(0, 0, 300, 300);
      ctx.save();
      ctx.translate(padding, padding);

      ctx.fillStyle = selectedMaterial ? '#dc2626' : '#cbd5e1';
      ctx.fillRect(0, 0, actualLength * scale, actualHeight * scale);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, actualLength * scale, actualHeight * scale);

      if (selectedMaterial && showDimensions) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        const brickH = selectedMaterial.height * scale;
        const brickL = selectedMaterial.length * scale;
        const mortarGap = project.mortar_gap * scale;

        for (let courseIndex = 0; courseIndex < calculations.coursesHigh; courseIndex++) {
          const y = courseIndex * (brickH + mortarGap);
          if (y + brickH > actualHeight * scale + 0.1) break; // Break if full brick height doesn't fit

          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(actualLength * scale, y);
          ctx.stroke();

          const offset = (courseIndex % 2) * (brickL / 2);
          
          for (let x = -offset; x < actualLength * scale; x += brickL + mortarGap) {
            const drawX = Math.max(0, x);
            
            // Only draw vertical line if full brick length fits
            if (drawX + brickL > actualLength * scale + 0.1) continue;
            
            ctx.beginPath();
            ctx.moveTo(drawX, y);
            ctx.lineTo(drawX, y + brickH); // Draw up to full brick height
            ctx.stroke();
          }
        }
      }

      if (showDimensions) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        
        ctx.fillText(calculations.actualLength + '"', (actualLength * scale) / 2, -15);
        
        ctx.save();
        ctx.translate(-15, (actualHeight * scale) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(calculations.actualHeight + '"', 0, 0);
        ctx.restore();
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('SIDE VIEW (Actual Built Size)', (actualLength * scale) / 2, actualHeight * scale + 25);
        
        if (selectedMaterial && calculations) {
          ctx.font = '10px sans-serif';
          ctx.fillText(`${calculations.bricksAlongLength} × ${calculations.coursesHigh} courses = ${calculations.totalBricksWithWaste} bricks`, 
                      (actualLength * scale) / 2, actualHeight * scale + 38);
        }
      }

      ctx.restore();
    };

    drawTopView();
    drawSideView();
  };

  const handleMaterialSelect = (materialId) => {
    const material = inventory.find(m => m.id === materialId);
    setSelectedMaterial(material);
    setProject(prev => ({
      ...prev,
      selected_material_id: materialId,
      material_name: material ? material.material_name : "",
      material_dimensions: material ? {
        length: material.length,
        width: material.width,
        height: material.height
      } : null
    }));
  };

  const saveProject = async () => {
    if (!project.project_name || !project.client_name || !project.estimate_number || !project.hyperlink) {
      alert('Please fill in all required project fields');
      return;
    }

    if (!selectedMaterial) {
      alert('Please select a material from inventory');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...project,
        calculated_bricks: calculations.totalBricksWithWaste,
        calculated_surface_area: parseFloat(calculations.surfaceArea),
        mortar_bags_needed: calculations.mortarBags,
        material_cost: calculations.materialCost,
        mortar_cost: calculations.mortarCost,
        total_cost: calculations.totalCost,
        status: 'calculated'
      };

      if (editId) {
        await BrickStoneProject.update(editId, dataToSave);
        alert('Project updated successfully!');
      } else {
        await BrickStoneProject.create(dataToSave);
        alert('Project saved successfully!');
      }
      navigate(createPageUrl("BrickStoneProjects"));
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Box className="w-8 h-8" />
              {editId ? 'Edit' : 'New'} Brick & Stone Estimate
            </h1>
            <p className="text-slate-600">Design and calculate sign base materials</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(createPageUrl("BrickStoneProjects"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={saveProject} disabled={isSaving || !selectedMaterial} className="bg-green-600 hover:bg-green-700">
              {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save Project</>}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Project Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Client Name *</Label><Input value={project.client_name} onChange={(e) => setProject(prev => ({ ...prev, client_name: e.target.value }))} /></div>
                  <div><Label>Project Name *</Label><Input value={project.project_name} onChange={(e) => setProject(prev => ({ ...prev, project_name: e.target.value }))} /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Estimate Number *</Label><Input value={project.estimate_number} onChange={(e) => setProject(prev => ({ ...prev, estimate_number: e.target.value }))} /></div>
                  <div><Label>Project Link *</Label><Input value={project.hyperlink} onChange={(e) => setProject(prev => ({ ...prev, hyperlink: e.target.value }))} placeholder="https://..." /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Visual Editor</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowDimensions(!showDimensions)}>
                    {showDimensions ? <><EyeOff className="w-4 h-4 mr-2" />Hide Details</> : <><Eye className="w-4 h-4 mr-2" />Show Details</>}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2 text-center">Top View</h4>
                    <canvas ref={topViewRef} width="300" height="300" className="border border-slate-200 rounded-lg bg-white w-full"></canvas>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-center">Side View</h4>
                    <canvas ref={sideViewRef} width="300" height="300" className="border border-slate-200 rounded-lg bg-white w-full"></canvas>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Base Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Base Type</Label>
                    <Select value={project.base_type} onValueChange={(value) => setProject(prev => ({ ...prev, base_type: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid_rectangular">Solid Rectangular</SelectItem>
                        <SelectItem value="hollow_rectangular">Hollow Rectangular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Select Material</Label>
                    <Select value={project.selected_material_id} onValueChange={handleMaterialSelect}>
                      <SelectTrigger><SelectValue placeholder="Choose from inventory" /></SelectTrigger>
                      <SelectContent>
                        {inventory.map(mat => (
                          <SelectItem key={mat.id} value={mat.id}>
                            {mat.material_name} ({mat.length}×{mat.width}×{mat.height}")
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Length (inches)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      value={project.base_length} 
                      onChange={(e) => setProject(prev => ({ ...prev, base_length: parseFloat(e.target.value) || 0 }))} 
                    />
                    {calculations && (
                      <p className="text-xs text-green-600 mt-1">✓ {calculations.bricksAlongLength} whole bricks</p>
                    )}
                  </div>
                  <div>
                    <Label>Width (inches)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      value={project.base_width} 
                      onChange={(e) => setProject(prev => ({ ...prev, base_width: parseFloat(e.target.value) || 0 }))} 
                    />
                    {calculations && (
                      <p className="text-xs text-green-600 mt-1">✓ {calculations.bricksAlongWidth} whole bricks</p>
                    )}
                  </div>
                  <div>
                    <Label>Height (inches)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      value={project.base_height} 
                      onChange={(e) => setProject(prev => ({ ...prev, base_height: parseFloat(e.target.value) || 0 }))} 
                    />
                    {calculations && (
                      <p className="text-xs text-green-600 mt-1">✓ {calculations.coursesHigh} courses</p>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <span className="font-semibold">✓ Dimensions auto-adjusted to whole bricks only</span>
                  </p>
                  <p className="text-xs text-green-700 mt-1">No cutting required • Standard {project.mortar_gap}" mortar gaps throughout</p>
                </div>

                <div>
                  <Label>Layers (Depth)</Label>
                  <Input type="number" min="1" value={project.layers} onChange={(e) => setProject(prev => ({ ...prev, layers: parseInt(e.target.value) || 1 }))} />
                  <p className="text-xs text-slate-500 mt-1">
                    {project.base_type === 'solid_rectangular' 
                      ? 'Number of brick layers for the entire base'
                      : 'Number of brick layers for wall thickness'}
                    {selectedMaterial && ` (${(project.layers * selectedMaterial.width).toFixed(1)}" thick)`}
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Mortar Gap (inches)</Label><Input type="number" step="0.125" value={project.mortar_gap} onChange={(e) => setProject(prev => ({ ...prev, mortar_gap: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><Label>Waste Factor</Label><Input type="number" step="0.05" value={project.waste_factor} onChange={(e) => setProject(prev => ({ ...prev, waste_factor: parseFloat(e.target.value) || 1 }))} /></div>
                </div>

                <div><Label>Notes</Label><Textarea value={project.notes} onChange={(e) => setProject(prev => ({ ...prev, notes: e.target.value }))} className="h-20" /></div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-8">
              <CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {selectedMaterial && (
                  <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                    <h4 className="font-medium text-rose-900 mb-2">Selected Material</h4>
                    <p className="text-sm text-rose-800">{selectedMaterial.material_name}</p>
                    <p className="text-xs text-rose-600">
                      {selectedMaterial.length}" × {selectedMaterial.width}" × {selectedMaterial.height}"
                    </p>
                    <p className="text-sm font-medium text-rose-900 mt-2">${selectedMaterial.cost_per_unit.toFixed(2)} per unit</p>
                  </div>
                )}

                {calculations && (
                  <>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Bricks Needed (no waste):</span>
                        <span className="font-medium">{calculations.totalBricks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>With {((project.waste_factor - 1) * 100).toFixed(0)}% Waste:</span>
                        <span className="font-medium text-blue-600">{calculations.totalBricksWithWaste}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Surface Area:</span>
                        <span className="font-medium">{calculations.surfaceArea} sq ft</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Mortar Bags (60lb):</span>
                        <span className="font-medium">{calculations.mortarBags}</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Material Cost:</span>
                        <span className="font-medium">${calculations.materialCost.toFixed(2)}}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Mortar Cost:</span>
                        <span className="font-medium">${calculations.mortarCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-3">
                        <span>TOTAL:</span>
                        <span className="text-green-600">${calculations.totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}

                {!selectedMaterial && (
                  <div className="text-center py-8 text-slate-500">
                    <Box className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>Select a material to see cost calculations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
