
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
    bricks_along_length: 6,
    bricks_along_width: 9,
    courses_high: 5,
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
    // Inventory needs to be loaded first for loadProjectForEdit to convert old dimensions
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const inventoryData = await BrickStoneInventory.list();
        setInventory(inventoryData);

        const settingsData = await Settings.list();
        const settingsObj = {};
        settingsData.forEach(s => {
          settingsObj[s.setting_name] = s.setting_value;
        });
        setSettings(settingsObj);

        if (editId) {
          await loadProjectForEdit(editId, inventoryData); // Pass inventoryData
        } else {
          setProject(prev => ({
            ...prev,
            mortar_gap: parseFloat(settingsObj.brick_mortar_gap || 0.375),
            waste_factor: parseFloat(settingsObj.brick_waste_factor || 1.1)
          }));
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [editId]);

  useEffect(() => {
    if (selectedMaterial && project.bricks_along_length && project.bricks_along_width && project.courses_high) {
      performCalculations();
    }
  }, [selectedMaterial, project.base_type, project.bricks_along_length, project.bricks_along_width, project.courses_high, project.layers, project.mortar_gap, project.waste_factor]);

  useEffect(() => {
    drawVisualizations();
  }, [project, selectedMaterial, showDimensions, calculations]);

  // loadData is refactored into the initial useEffect.
  // const loadData = async () => { ... } // Removed

  const loadProjectForEdit = async (projectId, inventoryData) => {
    try {
      const projectData = await BrickStoneProject.get(projectId);
      if (projectData) {
        // Convert saved dimensions back to brick counts if needed for old projects
        if (projectData.base_length && !projectData.bricks_along_length && inventoryData.length > 0) {
          const material = inventoryData.find(m => m.id === projectData.selected_material_id);
          if (material && projectData.mortar_gap !== undefined) {
            const effectiveBrickL = material.length + projectData.mortar_gap;
            const effectiveBrickW = material.width + projectData.mortar_gap;
            const effectiveBrickH = material.height + projectData.mortar_gap;

            // Calculate brick counts based on old base_length/width/height
            // Formula: N = (total_dim + mortar_gap) / (brick_dim + mortar_gap)
            projectData.bricks_along_length = Math.max(1, Math.round((projectData.base_length + projectData.mortar_gap) / effectiveBrickL));
            projectData.bricks_along_width = Math.max(1, Math.round((projectData.base_width + projectData.mortar_gap) / effectiveBrickW));
            projectData.courses_high = Math.max(1, Math.round((projectData.base_height + projectData.mortar_gap) / effectiveBrickH));
          }
        }
        // Remove old base_length/width/height fields if they exist, as they are now derived.
        delete projectData.base_length;
        delete projectData.base_width;
        delete projectData.base_height;

        setProject(projectData);
        if (projectData.selected_material_id) {
          const material = inventoryData.find(m => m.id === projectData.selected_material_id);
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

    const material = selectedMaterial;
    
    const baseType = project.base_type;
    const bricksAlongLength = project.bricks_along_length;
    const bricksAlongWidth = project.bricks_along_width;
    const coursesHigh = project.courses_high;
    const layers = project.layers;
    const mortarGap = project.mortar_gap;
    const wasteFactor = project.waste_factor;
    
    const brickL = material.length;
    const brickW = material.width;
    const brickH = material.height;
    const costPerUnit = material.cost_per_unit;

    // Calculate actual dimensions from brick counts
    const actualLength = bricksAlongLength * brickL + (bricksAlongLength - 1) * mortarGap;
    const actualWidth = bricksAlongWidth * brickW + (bricksAlongWidth - 1) * mortarGap;
    const actualHeight = coursesHigh * brickH + (coursesHigh - 1) * mortarGap;

    let totalBricks = 0;
    let surfaceArea = 0;

    if (baseType === 'solid_rectangular') {
      totalBricks = coursesHigh * bricksAlongLength * bricksAlongWidth * layers;
      surfaceArea = ((actualLength * actualHeight) * 2 + (actualWidth * actualHeight) * 2 + (actualLength * actualWidth)) / 144;
    } else if (baseType === 'hollow_rectangular') {
      // Wall thickness includes mortar gaps between layers
      const wallThickness = layers * brickW + Math.max(0, layers - 1) * mortarGap; // Updated to include mortar gaps
      
      const frontBackBricks = coursesHigh * bricksAlongLength * layers * 2;
      
      const innerWidth = actualWidth - (2 * wallThickness);
      const bricksAlongInnerWidth = Math.max(0, Math.round(innerWidth / (brickL + mortarGap)));
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
    if (!topViewRef.current || !sideViewRef.current || !project.bricks_along_length || !calculations) {
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
          const wallThickness = project.layers * selectedMaterial.width + Math.max(0, project.layers - 1) * project.mortar_gap;
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
            // Wall thickness now includes mortar gaps between layers
            const wallThickness = project.layers * selectedMaterial.width + Math.max(0, project.layers - 1) * project.mortar_gap;
            const innerXStart = wallThickness;
            const innerYStart = wallThickness;
            const innerXEnd = actualLength - wallThickness;
            const innerYEnd = actualWidth - wallThickness;
            
            const numBricksLength = calculations.bricksAlongLength;
            // Number of brick layers in the wall depth
            const layersInWall = project.layers;
            const innerHeightDraw = innerYEnd - innerYStart;
            const numBricksInnerLengthRotated = Math.max(1, Math.round(innerHeightDraw / (brickL + mortarGap)));

            // Draw all bricks as solid red rectangles
            ctx.fillStyle = '#a8332e';

            // FRONT WALL (bottom horizontal) - multiple layers deep
            for (let layerIndex = 0; layerIndex < layersInWall; layerIndex++) {
              const yStart = layerIndex * (brickW + mortarGap);
              if (yStart + brickW > wallThickness + 0.01) break;
              
              const runningBondOffset = (layerIndex % 2) * (brickL / 2);
              
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
            
            // BACK WALL (top horizontal) - multiple layers deep
            const backWallYStart = actualWidth - wallThickness;
            for (let layerIndex = 0; layerIndex < layersInWall; layerIndex++) {
              const yStart = backWallYStart + layerIndex * (brickW + mortarGap);
              if (yStart + brickW > actualWidth + 0.01) break;
              
              const runningBondOffset = (layerIndex % 2) * (brickL / 2);
              
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
            
            // LEFT WALL (vertical - bricks rotated 90°) - multiple layers deep
            for (let layerIndex = 0; layerIndex < layersInWall; layerIndex++) {
              const xStart = layerIndex * (brickW + mortarGap);
              if (xStart + brickW > wallThickness + 0.01) break;
              
              const runningBondOffset = (layerIndex % 2) * (brickL / 2);
              
              for (let row = 0; row < numBricksInnerLengthRotated; row++) {
                let yStart = innerYStart + row * (brickL + mortarGap) - runningBondOffset;
                if (yStart < innerYStart - brickL * 0.99) continue;
                
                const brickYStart = Math.max(innerYStart, yStart);
                const brickYEnd = Math.min(innerYEnd, yStart + brickL);
                const visibleLength = brickYEnd - brickYStart;
                
                if (visibleLength < brickL * 0.05) continue;
                
                ctx.fillRect(xStart * scale, brickYStart * scale, brickW * scale, visibleLength * scale);
              }
            }
            
            // RIGHT WALL (vertical - bricks rotated 90°) - multiple layers deep
            const rightWallXStart = actualLength - wallThickness;
            for (let layerIndex = 0; layerIndex < layersInWall; layerIndex++) {
              const xStart = rightWallXStart + layerIndex * (brickW + mortarGap);
              if (xStart + brickW > actualLength + 0.01) break;
              
              const runningBondOffset = (layerIndex % 2) * (brickL / 2);
              
              for (let row = 0; row < numBricksInnerLengthRotated; row++) {
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
            const wallThickness = project.layers * selectedMaterial.width + Math.max(0, project.layers - 1) * project.mortar_gap;
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
          ctx.fillText(`${calculations.bricksAlongLength} × ${calculations.coursesHigh} courses`,
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

  const updateBrickCount = (dimension, delta) => {
    setProject(prev => ({
      ...prev,
      [dimension]: Math.max(1, (prev[dimension] || 0) + delta)
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
        // Store the calculated actual dimensions based on brick counts and mortar
        base_length: parseFloat(calculations.actualLength),
        base_width: parseFloat(calculations.actualWidth),
        base_height: parseFloat(calculations.actualHeight),
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
                    <Label>Bricks Along Length</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('bricks_along_length', -1)}
                        disabled={!selectedMaterial || project.bricks_along_length <= 1}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={project.bricks_along_length}
                        onChange={(e) => setProject(prev => ({ ...prev, bricks_along_length: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="text-center"
                        disabled={!selectedMaterial}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('bricks_along_length', 1)}
                        disabled={!selectedMaterial}
                      >
                        +
                      </Button>
                    </div>
                    {calculations && (
                      <p className="text-xs text-green-600 mt-1 font-medium">→ {calculations.actualLength}"</p>
                    )}
                  </div>
                  <div>
                    <Label>Bricks Along Width</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('bricks_along_width', -1)}
                        disabled={!selectedMaterial || project.bricks_along_width <= 1}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={project.bricks_along_width}
                        onChange={(e) => setProject(prev => ({ ...prev, bricks_along_width: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="text-center"
                        disabled={!selectedMaterial}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('bricks_along_width', 1)}
                        disabled={!selectedMaterial}
                      >
                        +
                      </Button>
                    </div>
                    {calculations && (
                      <p className="text-xs text-green-600 mt-1 font-medium">→ {calculations.actualWidth}"</p>
                    )}
                  </div>
                  <div>
                    <Label>Courses High</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('courses_high', -1)}
                        disabled={!selectedMaterial || project.courses_high <= 1}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={project.courses_high}
                        onChange={(e) => setProject(prev => ({ ...prev, courses_high: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="text-center"
                        disabled={!selectedMaterial}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('courses_high', 1)}
                        disabled={!selectedMaterial}
                      >
                        +
                      </Button>
                    </div>
                    {calculations && (
                      <p className="text-xs text-green-600 mt-1 font-medium">→ {calculations.actualHeight}"</p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Final Build Dimensions</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Length:</span>
                      <p className="font-bold text-blue-900 text-lg">{calculations?.actualLength || '0'}"</p>
                    </div>
                    <div>
                      <span className="text-blue-700">Width:</span>
                      <p className="font-bold text-blue-900 text-lg">{calculations?.actualWidth || '0'}"</p>
                    </div>
                    <div>
                      <span className="text-blue-700">Height:</span>
                      <p className="font-bold text-blue-900 text-lg">{calculations?.actualHeight || '0'}"</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">These are the actual dimensions considering brick counts and mortar gaps.</p>
                </div>

                <div>
                  <Label>Layers (Depth)</Label>
                  <Input type="number" min="1" value={project.layers} onChange={(e) => setProject(prev => ({ ...prev, layers: parseInt(e.target.value) || 1 }))} disabled={!selectedMaterial} />
                  <p className="text-xs text-slate-500 mt-1">
                    {project.base_type === 'solid_rectangular'
                      ? 'Number of brick layers for the entire base'
                      : 'Number of brick layers for wall thickness'}
                    {selectedMaterial && ` (${(project.layers * selectedMaterial.width + Math.max(0, project.layers - 1) * project.mortar_gap).toFixed(1)}" thick)`}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Mortar Gap (inches)</Label><Input type="number" step="0.125" value={project.mortar_gap} onChange={(e) => setProject(prev => ({ ...prev, mortar_gap: parseFloat(e.target.value) || 0 }))} disabled={!selectedMaterial} /></div>
                  <div><Label>Waste Factor</Label><Input type="number" step="0.05" value={project.waste_factor} onChange={(e) => setProject(prev => ({ ...prev, waste_factor: parseFloat(e.target.value) || 1 }))} disabled={!selectedMaterial} /></div>
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
                        <span className="font-medium">${calculations.materialCost.toFixed(2)}</span>
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
