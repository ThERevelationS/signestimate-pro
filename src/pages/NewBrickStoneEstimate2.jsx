import React, { useState, useEffect, useRef } from "react";
import { BrickStoneProject2, BrickStoneInventory2, Settings } from "@/entities/all";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, ArrowLeft, Box, Eye, EyeOff, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";

export default function NewBrickStoneEstimate2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const topViewRef = useRef(null);
  const sideViewRef = useRef(null);
  const coreSideViewRef = useRef(null);

  const [project, setProject] = useState({
    project_name: "",
    client_name: "",
    estimate_number: "",
    hyperlink: "",
    base_type: "hollow_rectangular",
    bricks_along_length: 6,
    bricks_along_width: 9,
    courses_high: 5,
    layers: 1,
    mortar_gap: 0.375,
    waste_factor: 1.1,
    selected_material_id: "",
    core_materials: [],
    notes: ""
  });

  const [inventory, setInventory] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [calculations, setCalculations] = useState(null);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true);
  const [isAIFilling, setIsAIFilling] = useState(false);
  const [hasAutoFilledCore, setHasAutoFilledCore] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const inventoryData = await BrickStoneInventory2.list();
        setInventory(inventoryData);

        const settingsData = await Settings.list();
        const settingsObj = {};
        settingsData.forEach(s => {
          settingsObj[s.setting_name] = s.setting_value;
        });
        setSettings(settingsObj);

        if (editId) {
          await loadProjectForEdit(editId, inventoryData);
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
  }, [selectedMaterial, project.core_materials, project.base_type, project.bricks_along_length, project.bricks_along_width, project.courses_high, project.mortar_gap, project.waste_factor]);

  useEffect(() => {
    drawVisualizations();
    
    const handleResize = () => drawVisualizations();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [project, selectedMaterial, showDimensions, calculations]);

  const loadProjectForEdit = async (projectId, inventoryData) => {
    try {
      const projectData = await BrickStoneProject2.get(projectId);
      if (projectData) {
        if (projectData.base_length && !projectData.bricks_along_length && inventoryData.length > 0) {
          const material = inventoryData.find(m => m.id === projectData.selected_material_id);
          if (material && projectData.mortar_gap !== undefined) {
            const effectiveBrickL = material.length + projectData.mortar_gap;
            const effectiveBrickW = material.width + projectData.mortar_gap;
            const effectiveBrickH = material.height + projectData.mortar_gap;

            projectData.bricks_along_length = Math.max(1, Math.round((projectData.base_length + projectData.mortar_gap) / effectiveBrickL));
            projectData.bricks_along_width = Math.max(1, Math.round((projectData.base_width + projectData.mortar_gap) / effectiveBrickW));
            projectData.courses_high = Math.max(1, Math.round((projectData.base_height + projectData.mortar_gap) / effectiveBrickH));
          }
        }
        delete projectData.base_length;
        delete projectData.base_width;
        delete projectData.base_height;

        if (projectData.core_material_id && !projectData.core_materials) {
          projectData.core_materials = [{
            material_id: projectData.core_material_id,
            quantity: 0
          }];
          delete projectData.core_material_id;
        } else if (!projectData.core_materials) {
          projectData.core_materials = [];
        }

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

  const handleMaterialSelect = async (materialId) => {
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

    if (material && !hasAutoFilledCore) {
      setHasAutoFilledCore(true);
      setTimeout(() => fillCoreWithAI(materialId), 100);
    }
  };

  const fillCoreWithAI = async (wallMaterialId = null) => {
    const currentWallMaterial = wallMaterialId ? 
      inventory.find(m => m.id === wallMaterialId) : 
      selectedMaterial;
    
    if (!currentWallMaterial) {
      alert('Please select a wall material first');
      return;
    }

    const wallMaterialForCalc = currentWallMaterial;
    const bricksAlongLength = project.bricks_along_length;
    const bricksAlongWidth = project.bricks_along_width;
    const coursesHigh = project.courses_high;
    const mortarGap = project.mortar_gap;
    
    const brickL = wallMaterialForCalc.length;
    const brickW = wallMaterialForCalc.width;
    const brickH = wallMaterialForCalc.height;
    const wallThickness = brickW;
    
    const actualLength = bricksAlongLength * brickL + (bricksAlongLength - 1) * mortarGap;
    const innerSideWallLength = bricksAlongWidth * brickL + (bricksAlongWidth - 1) * mortarGap;
    const actualWidth = (wallThickness * 2) + innerSideWallLength;
    const actualHeight = coursesHigh * brickH + (coursesHigh - 1) * mortarGap;
    
    const innerXStart = wallThickness;
    const innerYStart = wallThickness;
    const innerLength = actualLength - 2 * wallThickness;
    const innerWidth = actualWidth - 2 * wallThickness;
    const innerHeight = actualHeight;

    const blockMaterials = inventory.filter(m => m.material_type === 'block');
    
    if (blockMaterials.length === 0) {
      alert('No block materials found in inventory. Please add blocks to inventory first.');
      return;
    }

    setIsAIFilling(true);
    
    try {
      const prompt = `You are a construction materials calculator. Calculate the optimal way to fill a hollow rectangular space with concrete blocks.

HOLLOW SPACE DIMENSIONS:
- Inner Length: ${innerLength.toFixed(2)} inches
- Inner Width: ${innerWidth.toFixed(2)} inches  
- Inner Height: ${innerHeight.toFixed(2)} inches
- Mortar Gap: ${mortarGap} inches (space between blocks)

AVAILABLE BLOCK MATERIALS:
${blockMaterials.map((block, i) => 
  `${i + 1}. ${block.material_name} (ID: ${block.id})
     - Dimensions: ${block.length}" × ${block.width}" × ${block.height}"
     - Cost: $${block.cost_per_unit.toFixed(2)} per unit`
).join('\n')}

REQUIREMENTS:
1. Fill the entire hollow space efficiently using a grid pattern.
2. Blocks cannot overlap.
3. Account for ${mortarGap}" mortar gaps between all blocks.
4. For each block type, calculate how many blocks fit in each dimension using: floor((total_dimension + mortar_gap) / (block_dimension + mortar_gap))
5. Total blocks = blocks_along_length × blocks_along_width × blocks_along_height
6. Maximize space utilization (fill as much of the hollow space as possible).
7. Minimize cost, considering the total volume filled.

Return your response as a JSON object with the optimal block selection and quantities.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            core_materials: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  material_id: { type: "string", description: "ID of the block material" },
                  quantity: { type: "integer", description: "Number of blocks needed" }
                },
                required: ["material_id", "quantity"]
              }
            },
            total_coverage_percentage: { type: "number", description: "Percentage of space filled" },
            calculation_notes: { type: "string", description: "Notes about the calculation, e.g., which blocks were chosen and why" }
          },
          required: ["core_materials"]
        }
      });

      if (response && response.core_materials && response.core_materials.length > 0) {
        const coreMaterials = response.core_materials.map(item => ({
          material_id: item.material_id,
          quantity: item.quantity || 0
        }));

        setProject(prev => ({
          ...prev,
          core_materials: coreMaterials
        }));

        alert(`AI filled core with ${response.core_materials.length} block type(s).\n\n${response.calculation_notes || 'Blocks calculated based on optimal fit.'}`);
      } else {
        alert('AI could not determine optimal block fill. Please add blocks manually.');
      }
    } catch (error) {
      console.error('Error filling core with AI:', error);
      alert('Error calculating core fill. Please check LLM integration or add blocks manually.');
    }
    
    setIsAIFilling(false);
  };

  const performCalculations = () => {
    if (!selectedMaterial) {
      setCalculations(null);
      return;
    }

    const material = selectedMaterial;
    
    const bricksAlongLength = project.bricks_along_length;
    const bricksAlongWidth = project.bricks_along_width;
    const coursesHigh = project.courses_high;
    const layers = 1;
    const mortarGap = project.mortar_gap;
    const wasteFactor = project.waste_factor;
    
    const brickL = material.length;
    const brickW = material.width;
    const brickH = material.height;
    const costPerUnit = material.cost_per_unit;

    const wallThickness = brickW;
    
    const actualLength = bricksAlongLength * brickL + (bricksAlongLength - 1) * mortarGap;
    const innerSideWallLength = bricksAlongWidth * brickL + (bricksAlongWidth - 1) * mortarGap;
    const actualWidth = (wallThickness * 2) + innerSideWallLength;
    const actualHeight = coursesHigh * brickH + (coursesHigh - 1) * mortarGap;
    
    const frontBackBricks = coursesHigh * bricksAlongLength * layers * 2;
    const leftRightBricks = coursesHigh * bricksAlongWidth * layers * 2;
    const totalWallBricks = frontBackBricks + leftRightBricks;

    let totalCoreMaterialCost = 0;
    const coreBreakdown = project.core_materials.map(coreItem => {
      const coreMaterial = inventory.find(m => m.id === coreItem.material_id);
      if (!coreMaterial) {
        return {
          material_id: coreItem.material_id,
          material_name: "Unknown Material",
          quantity: coreItem.quantity || 0,
          cost_per_unit: 0,
          total_cost: 0
        };
      }
      
      const quantity = coreItem.quantity || 0;
      const cost = quantity * coreMaterial.cost_per_unit;
      totalCoreMaterialCost += cost;
      
      return {
        material_id: coreItem.material_id,
        material_name: coreMaterial.material_name,
        quantity: quantity,
        cost_per_unit: coreMaterial.cost_per_unit,
        total_cost: cost
      };
    });

    const exteriorPerimeter = 2 * (actualLength + actualWidth);
    const exteriorSurfaceArea = (exteriorPerimeter * actualHeight) / 144;

    const totalWallBricksWithWaste = Math.ceil(totalWallBricks * wasteFactor);
    const mortarBagsPerSqFt = parseFloat(settings.brick_mortar_bags_per_100sqft || 3) / 100;
    const mortarBags = Math.ceil(exteriorSurfaceArea * mortarBagsPerSqFt);
    const mortarCostPerBag = parseFloat(settings.brick_mortar_cost_per_bag || 12);
    const wallMaterialCost = totalWallBricksWithWaste * costPerUnit;
    const mortarCost = mortarBags * mortarCostPerBag;
    const totalCost = wallMaterialCost + totalCoreMaterialCost + mortarCost;

    setCalculations({
      totalWallBricks: Math.round(totalWallBricks),
      totalWallBricksWithWaste: totalWallBricksWithWaste,
      coreBreakdown: coreBreakdown,
      surfaceArea: exteriorSurfaceArea.toFixed(2),
      mortarBags: mortarBags,
      wallMaterialCost: wallMaterialCost,
      coreMaterialCost: totalCoreMaterialCost,
      mortarCost: mortarCost,
      totalCost: totalCost,
      actualLength: actualLength.toFixed(2),
      actualWidth: actualWidth.toFixed(2),
      actualHeight: actualHeight.toFixed(2),
      bricksAlongLength: bricksAlongLength,
      bricksAlongWidth: bricksAlongWidth,
      coursesHigh: coursesHigh,
      wallThickness: wallThickness
    });
  };

  const drawVisualizations = () => {
    if (!topViewRef.current || !sideViewRef.current || !coreSideViewRef.current || !project.bricks_along_length || !calculations || !selectedMaterial) {
      return;
    }

    const actualLength = parseFloat(calculations.actualLength);
    const actualWidth = parseFloat(calculations.actualWidth);
    const actualHeight = parseFloat(calculations.actualHeight);
    const mortarGap = project.mortar_gap;

    const drawTopView = () => {
      const canvas = topViewRef.current;
      const container = canvas.parentElement;
      const containerWidth = container.clientWidth;
      const containerHeight = containerWidth;
      
      canvas.width = containerWidth;
      canvas.height = containerHeight;
      
      const ctx = canvas.getContext('2d');
      const padding = Math.max(40, containerWidth * 0.1);
      const availableWidth = containerWidth - (padding * 2);
      const availableHeight = containerHeight - (padding * 2);
      const scale = Math.min(availableWidth / actualLength, availableHeight / actualWidth);

      ctx.clearRect(0, 0, containerWidth, containerHeight);
      ctx.save();
      ctx.translate(padding, padding);

      if (!showDimensions) {
        ctx.fillStyle = selectedMaterial ? '#dc2626' : '#cbd5e1';
        ctx.fillRect(0, 0, actualLength * scale, actualWidth * scale);

        if (selectedMaterial) {
          const wallThickness = calculations.wallThickness;
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
          ctx.fillStyle = '#e8ddd1';
          ctx.fillRect(0, 0, actualLength * scale, actualWidth * scale);

          const brickL = selectedMaterial.length;
          const brickW = selectedMaterial.width;
          
          const numBricksLength = calculations.bricksAlongLength;
          const numBricksWidth = calculations.bricksAlongWidth;
          
          const wallThickness = calculations.wallThickness;
          
          ctx.fillStyle = '#a8332e';

          const yStartFront = 0;
          for (let col = 0; col < numBricksLength; col++) {
            let xStart = col * (brickL + mortarGap);
            ctx.fillRect(xStart * scale, yStartFront * scale, brickL * scale, brickW * scale);
          }
          
          const yStartBack = actualWidth - brickW;
          for (let col = 0; col < numBricksLength; col++) {
            let xStart = col * (brickL + mortarGap);
            ctx.fillRect(xStart * scale, yStartBack * scale, brickL * scale, brickW * scale);
          }
          
          const frontWallEnd = wallThickness;
          const backWallStart = actualWidth - wallThickness;
          
          const xStartLeft = 0;
          for (let row = 0; row < numBricksWidth; row++) {
            let yStart = frontWallEnd + row * (brickL + mortarGap);
            const brickYStart = Math.max(frontWallEnd, yStart);
            const brickYEnd = Math.min(backWallStart, yStart + brickL);
            const visibleLength = brickYEnd - brickYStart;
            
            if (visibleLength > 0.05) {
              ctx.fillRect(xStartLeft * scale, brickYStart * scale, brickW * scale, visibleLength * scale);
            }
          }
          
          const xStartRight = actualLength - brickW;
          for (let row = 0; row < numBricksWidth; row++) {
            let yStart = frontWallEnd + row * (brickL + mortarGap);
            const brickYStart = Math.max(frontWallEnd, yStart);
            const brickYEnd = Math.min(backWallStart, yStart + brickL);
            const visibleLength = brickYEnd - brickYStart;
            
            if (visibleLength > 0.05) {
              ctx.fillRect(xStartRight * scale, brickYStart * scale, brickW * scale, visibleLength * scale);
            }
          }
          
          const innerXStart = wallThickness;
          const innerYStart = wallThickness;
          const innerXEnd = actualLength - wallThickness;
          const innerYEnd = actualWidth - wallThickness;
          
          const innerLength = innerXEnd - innerXStart;
          const innerWidth = innerYEnd - innerYStart;

          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(innerXStart * scale, innerYStart * scale, innerLength * scale, innerWidth * scale);

          if (project.core_materials && project.core_materials.length > 0) {
            const validCoreMaterials = project.core_materials.filter(item => {
              const mat = inventory.find(m => m.id === item.material_id);
              return mat && item.quantity > 0;
            });
            
            if (validCoreMaterials.length > 0) {
              const colors = ['#8B4513', '#A0522D', '#D2691E', '#CD853F', '#DEB887', '#F4A460'];
              
              const blockQueue = [];
              validCoreMaterials.forEach((coreItem, matIndex) => {
                const material = inventory.find(m => m.id === coreItem.material_id);
                if (material) {
                  for (let i = 0; i < coreItem.quantity; i++) {
                    blockQueue.push({
                      material: material,
                      color: colors[matIndex % colors.length],
                      materialIndex: matIndex
                    });
                  }
                }
              });
              
              let blockIndex = 0;
              let currentY = innerYStart;
              
              while (currentY < innerYEnd && blockIndex < blockQueue.length) {
                let currentX = innerXStart;
                const rowStartIndex = blockIndex;
                let rowHeight = 0;
                
                while (currentX < innerXEnd && blockIndex < blockQueue.length) {
                  const block = blockQueue[blockIndex];
                  const blockL = block.material.length;
                  const blockW = block.material.width;
                  
                  const remainingWidth = innerXEnd - currentX;
                  const remainingHeight = innerYEnd - currentY;
                  
                  let useWidth = blockL;
                  let useHeight = blockW;
                  
                  const normalFits = (currentX + blockL <= innerXEnd + 0.01) && (currentY + blockW <= innerYEnd + 0.01);
                  const rotatedFits = (currentX + blockW <= innerXEnd + 0.01) && (currentY + blockL <= innerYEnd + 0.01);
                  
                  if (!normalFits && rotatedFits) {
                    useWidth = blockW;
                    useHeight = blockL;
                  } else if (normalFits && rotatedFits) {
                    const normalWaste = remainingWidth - blockL;
                    const rotatedWaste = remainingWidth - blockW;
                    
                    if (rotatedWaste < normalWaste && rotatedWaste >= 0) {
                      useWidth = blockW;
                      useHeight = blockL;
                    }
                  } else if (!normalFits && !rotatedFits) {
                    break;
                  }
                  
                  if (currentX + useWidth > innerXEnd + 0.01 || currentY + useHeight > innerYEnd + 0.01) {
                    break;
                  }
                  
                  ctx.fillStyle = block.color;
                  ctx.fillRect(currentX * scale, currentY * scale, useWidth * scale, useHeight * scale);
                  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                  ctx.lineWidth = 1;
                  ctx.strokeRect(currentX * scale, currentY * scale, useWidth * scale, useHeight * scale);
                  
                  rowHeight = Math.max(rowHeight, useHeight);
                  currentX += useWidth + mortarGap;
                  blockIndex++;
                }
                
                if (blockIndex === rowStartIndex) break;
                currentY += rowHeight + mortarGap;
              }
              
              if (currentY < innerYEnd - 0.5) {
                ctx.fillStyle = 'rgba(220, 220, 220, 0.3)';
                ctx.fillRect(innerXStart * scale, currentY * scale, innerLength * scale, (innerYEnd - currentY) * scale);
              }
            }
          }

          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3;
          ctx.strokeRect(0, 0, actualLength * scale, actualWidth * scale);
          
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;
          ctx.strokeRect(innerXStart * scale, innerYStart * scale,
                        innerLength * scale,
                        innerWidth * scale);
        }

      if (showDimensions) {
        const fontSize = Math.max(12, containerWidth * 0.04);
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';

        ctx.fillText(calculations.actualLength + '"', (actualLength * scale) / 2, -fontSize * 1.2);

        ctx.save();
        ctx.translate(-fontSize * 1.2, (actualWidth * scale) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(calculations.actualWidth + '"', 0, 0);
        ctx.restore();

        const labelFontSize = Math.max(10, containerWidth * 0.035);
        ctx.font = `${labelFontSize}px sans-serif`;
        ctx.fillStyle = '#64748b';
        ctx.fillText('TOP VIEW', (actualLength * scale) / 2, actualWidth * scale + fontSize * 2);

        if (selectedMaterial) {
          const detailFontSize = Math.max(8, containerWidth * 0.03);
          ctx.font = `${detailFontSize}px sans-serif`;
          ctx.fillText(`${calculations.bricksAlongLength} × ${calculations.bricksAlongWidth} bricks (1 layer)`,
                      (actualLength * scale) / 2, actualWidth * scale + fontSize * 3);
        }
      }

      ctx.restore();
    };

    const drawSideView = () => {
      const canvas = sideViewRef.current;
      const container = canvas.parentElement;
      const containerWidth = container.clientWidth;
      const containerHeight = containerWidth;
      
      canvas.width = containerWidth;
      canvas.height = containerHeight;
      
      const ctx = canvas.getContext('2d');
      const padding = Math.max(40, containerWidth * 0.1);
      const availableWidth = containerWidth - (padding * 2);
      const availableHeight = containerHeight - (padding * 2);
      const scale = Math.min(availableWidth / actualLength, availableHeight / actualHeight);

      ctx.clearRect(0, 0, containerWidth, containerHeight);
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
        const mortarGapScaled = mortarGap * scale;

        for (let courseIndex = 0; courseIndex < calculations.coursesHigh; courseIndex++) {
          const y = courseIndex * (brickH + mortarGapScaled);
          if (y + brickH > actualHeight * scale + 0.1) break;

          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(actualLength * scale, y);
          ctx.stroke();

          const offset = (courseIndex % 2) * (brickL / 2);

          for (let x = -offset; x < actualLength * scale; x += brickL + mortarGapScaled) {
            const brickStart = x;
            const brickEnd = x + brickL;
            
            if (brickStart < actualLength * scale - 0.1) {
              if (brickStart >= -0.1) {
                ctx.beginPath();
                ctx.moveTo(brickStart, y);
                ctx.lineTo(brickStart, y + brickH);
                ctx.stroke();
              }
              
              if (brickEnd > actualLength * scale + 0.1) {
                ctx.beginPath();
                ctx.moveTo(actualLength * scale, y);
                ctx.lineTo(actualLength * scale, y + brickH);
                ctx.stroke();
                break;
              }
            }
          }
        }
      }

      if (showDimensions) {
        const fontSize = Math.max(12, containerWidth * 0.04);
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';

        ctx.fillText(calculations.actualLength + '"', (actualLength * scale) / 2, -fontSize * 1.2);

        ctx.save();
        ctx.translate(-fontSize * 1.2, (actualHeight * scale) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(actualHeight + '"', 0, 0);
        ctx.restore();

        const labelFontSize = Math.max(10, containerWidth * 0.035);
        ctx.font = `${labelFontSize}px sans-serif`;
        ctx.fillStyle = '#64748b';
        ctx.fillText('SIDE VIEW - Wall Material', (actualLength * scale) / 2, actualHeight * scale + fontSize * 2);

        if (selectedMaterial && calculations) {
          const detailFontSize = Math.max(8, containerWidth * 0.03);
          ctx.font = `${detailFontSize}px sans-serif`;
          ctx.fillText(`${calculations.bricksAlongLength} × ${calculations.coursesHigh} courses`,
                      (actualLength * scale) / 2, actualHeight * scale + fontSize * 3);
        }
      }

      ctx.restore();
    };

    const drawCoreSideView = () => {
      const canvas = coreSideViewRef.current;
      const container = canvas.parentElement;
      const containerWidth = container.clientWidth;
      const containerHeight = containerWidth;
      
      canvas.width = containerWidth;
      canvas.height = containerHeight;
      
      const ctx = canvas.getContext('2d');
      const padding = Math.max(40, containerWidth * 0.1);
      const availableWidth = containerWidth - (padding * 2);
      const availableHeight = containerHeight - (padding * 2);
      
      const scale = Math.min(availableWidth / actualLength, availableHeight / actualHeight);

      ctx.clearRect(0, 0, containerWidth, containerHeight);
      ctx.save();
      ctx.translate(padding, padding);

      ctx.fillStyle = '#e8ddd1';
      ctx.fillRect(0, 0, actualLength * scale, actualHeight * scale);

      if (selectedMaterial) {
        const brickL = selectedMaterial.length;
        const brickH = selectedMaterial.height;
        const brickW = selectedMaterial.width;
        
        const wallThickness = brickW;
        const innerXStart = wallThickness;
        const innerLength = actualLength - (2 * wallThickness);

        ctx.strokeStyle = '#a8332e';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(168, 51, 46, 0.15)';

        for (let courseIndex = 0; courseIndex < calculations.coursesHigh; courseIndex++) {
          const y = courseIndex * (brickH + mortarGap);
          if (y + brickH > actualHeight + 0.1) break;

          const offset = (courseIndex % 2) * (brickL / 2);

          ctx.fillRect(0, y * scale, brickW * scale, brickH * scale);
          ctx.strokeRect(0, y * scale, brickW * scale, brickH * scale);
          
          ctx.fillRect((actualLength - brickW) * scale, y * scale, brickW * scale, brickH * scale);
          ctx.strokeRect((actualLength - brickW) * scale, y * scale, brickW * scale, brickH * scale);

          ctx.strokeStyle = 'rgba(168, 51, 46, 0.5)';
          ctx.lineWidth = 1;
          for (let x_actual = -offset; x_actual < actualLength; x_actual += (brickL + mortarGap)) {
            const brickStartActual = x_actual;
            const brickEndActual = x_actual + brickL;
            
            if (brickStartActual >= innerXStart - 0.01 && brickEndActual <= innerXStart + innerLength + 0.01) {
              ctx.strokeRect(brickStartActual * scale, y * scale, brickL * scale, brickH * scale);
            }
          }
        }

        if (project.core_materials && project.core_materials.length > 0) {
          const validCoreMaterials = project.core_materials.filter(item => {
            const mat = inventory.find(m => m.id === item.material_id);
            return mat && item.quantity > 0;
          });
          
          if (validCoreMaterials.length > 0) {
            const colors = ['#8B4513', '#A0522D', '#D2691E', '#CD853F', '#DEB887', '#F4A460'];
            
            const blockQueue = [];
            validCoreMaterials.forEach((coreItem, matIndex) => {
              const material = inventory.find(m => m.id === coreItem.material_id);
              if (material) {
                for (let i = 0; i < coreItem.quantity; i++) {
                  blockQueue.push({
                    material: material,
                    color: colors[matIndex % colors.length],
                    materialIndex: matIndex
                  });
                }
              }
            });
            
            let blockIndex = 0;
            let currentY = actualHeight;
            
            while (currentY > 0 && blockIndex < blockQueue.length) {
              let currentX = innerXStart;
              const rowStartIndex = blockIndex;
              let rowHeight = 0;
              
              while (currentX < (innerXStart + innerLength) && blockIndex < blockQueue.length) {
                const block = blockQueue[blockIndex];
                const blockL = block.material.length;
                const blockH = block.material.height;
                
                const remainingWidth = (innerXStart + innerLength) - currentX;
                
                let useWidth = blockL;
                let useHeight = blockH;
                
                const normalFits = (currentX + blockL <= innerXStart + innerLength + 0.01) && (currentY - blockH >= -0.01);
                const rotatedFits = (currentX + blockH <= innerXStart + innerLength + 0.01) && (currentY - blockL >= -0.01);
                
                if (!normalFits && rotatedFits) {
                  useWidth = blockH;
                  useHeight = blockL;
                } else if (normalFits && rotatedFits) {
                  const normalWaste = remainingWidth - blockL;
                  const rotatedWaste = remainingWidth - blockH;
                  
                  if (rotatedWaste < normalWaste && rotatedWaste >= 0) {
                    useWidth = blockH;
                    useHeight = blockL;
                  }
                } else if (!normalFits && !rotatedFits) {
                  break;
                }
                
                if (currentX + useWidth > innerXStart + innerLength + 0.01 || currentY - useHeight < -0.01) {
                  break;
                }
                
                const blockY = currentY - useHeight;
                ctx.fillStyle = block.color;
                ctx.fillRect(currentX * scale, blockY * scale, useWidth * scale, useHeight * scale);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 1;
                ctx.strokeRect(currentX * scale, blockY * scale, useWidth * scale, useHeight * scale);
                
                rowHeight = Math.max(rowHeight, useHeight);
                currentX += useWidth + mortarGap;
                blockIndex++;
              }
              
              if (blockIndex === rowStartIndex) break;
              currentY -= rowHeight + mortarGap;
            }
            
            if (currentY > 0.5) {
              ctx.fillStyle = 'rgba(220, 220, 220, 0.4)';
              ctx.fillRect(innerXStart * scale, 0, innerLength * scale, currentY * scale);
            }
          }
        }
      }

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, actualLength * scale, actualHeight * scale);

      if (showDimensions) {
        const fontSize = Math.max(12, containerWidth * 0.04);
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';

        ctx.fillText(actualLength.toFixed(2) + '"', (actualLength * scale) / 2, -fontSize * 1.2);

        ctx.save();
        ctx.translate(-fontSize * 1.2, (actualHeight * scale) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(actualHeight.toFixed(2) + '"', 0, 0);
        ctx.restore();

        const labelFontSize = Math.max(10, containerWidth * 0.035);
        ctx.font = `${labelFontSize}px sans-serif`;
        ctx.fillStyle = '#64748b';
        ctx.fillText('SIDE VIEW - Wall with Core', (actualLength * scale) / 2, actualHeight * scale + fontSize * 2);
      }

      ctx.restore();
    };

    drawTopView();
    drawSideView();
    drawCoreSideView();
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
        base_length: parseFloat(calculations.actualLength),
        base_width: parseFloat(calculations.actualWidth),
        base_height: parseFloat(calculations.actualHeight),
        calculated_bricks: calculations.totalWallBricksWithWaste,
        calculated_surface_area: parseFloat(calculations.surfaceArea),
        mortar_bags_needed: calculations.mortarBags,
        material_cost: calculations.wallMaterialCost,
        core_material_cost: calculations.coreMaterialCost,
        mortar_cost: calculations.mortarCost,
        total_cost: calculations.totalCost,
        status: 'calculated'
      };

      if (editId) {
        await BrickStoneProject2.update(editId, dataToSave);
        alert('Project updated successfully!');
      } else {
        await BrickStoneProject2.create(dataToSave);
        alert('Project saved successfully!');
      }
      navigate(createPageUrl("BrickStoneProjects2"));
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
    <div className="p-3 md:p-6 bg-slate-50 min-h-screen">
      <div className="w-full mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Box className="w-6 h-6 md:w-7 md:h-7" />
              {editId ? 'Edit' : 'New'} Brick & Stone 2 Estimate
            </h1>
            <p className="text-sm text-slate-600">Design and calculate sign base materials</p>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <Button variant="outline" onClick={() => navigate(createPageUrl("BrickStoneProjects2"))} className="flex-1 lg:flex-none">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={saveProject} disabled={isSaving || !selectedMaterial} className="bg-green-600 hover:bg-green-700 flex-1 lg:flex-none">
              {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save Project</>}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg">Project Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label className="text-sm">Client Name *</Label><Input value={project.client_name} onChange={(e) => setProject(prev => ({ ...prev, client_name: e.target.value }))} className="h-9" /></div>
                  <div><Label className="text-sm">Project Name *</Label><Input value={project.project_name} onChange={(e) => setProject(prev => ({ ...prev, project_name: e.target.value }))} className="h-9" /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label className="text-sm">Estimate Number *</Label><Input value={project.estimate_number} onChange={(e) => setProject(prev => ({ ...prev, estimate_number: e.target.value }))} className="h-9" /></div>
                  <div><Label className="text-sm">Project Link *</Label><Input value={project.hyperlink} onChange={(e) => setProject(prev => ({ ...prev, hyperlink: e.target.value }))} placeholder="https://..." className="h-9" /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="flex flex-col">
                    <h4 className="font-medium mb-2 text-center text-sm">Top View</h4>
                    <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                      <canvas 
                        ref={topViewRef} 
                        className="absolute inset-0 border border-slate-200 rounded-lg bg-white w-full h-full"
                        style={{ width: '100%', height: '100%' }}
                      ></canvas>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-medium mb-2 text-center text-sm">Side View - Walls</h4>
                    <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                      <canvas 
                        ref={sideViewRef} 
                        className="absolute inset-0 border border-slate-200 rounded-lg bg-white w-full h-full"
                        style={{ width: '100%', height: '100%' }}
                      ></canvas>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-medium mb-2 text-center text-sm">Side View - Core</h4>
                    <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                      <canvas 
                        ref={coreSideViewRef} 
                        className="absolute inset-0 border border-slate-200 rounded-lg bg-white w-full h-full"
                        style={{ width: '100%', height: '100%' }}
                      ></canvas>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg">Base Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div> 
                  <Label className="text-sm">Wall Material</Label>
                  <Select value={project.selected_material_id} onValueChange={handleMaterialSelect}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Choose from inventory" /></SelectTrigger>
                    <SelectContent>
                      {inventory.map(mat => (
                        <SelectItem key={mat.id} value={mat.id}>
                          {mat.material_name} ({mat.length}×{mat.width}×{mat.height}")
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div> 
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm">Core Materials (Optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fillCoreWithAI()}
                      disabled={!selectedMaterial || isAIFilling}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 h-8 text-xs"
                    >
                      {isAIFilling ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          AI Filling...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          Fill with AI
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Add blocks to fill the hollow core - blocks only
                  </p>
                  <div className="space-y-2">
                    {project.core_materials.map((coreItem, index) => {
                      return (
                        <div key={index} className="flex gap-2 items-start p-2 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex-1">
                            <Select 
                              value={coreItem.material_id} 
                              onValueChange={(value) => {
                                const newCoreMaterials = [...project.core_materials];
                                newCoreMaterials[index] = { ...newCoreMaterials[index], material_id: value };
                                setProject(prev => ({ ...prev, core_materials: newCoreMaterials }));
                              }}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select block" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventory
                                  .filter(mat => mat.material_type === 'block')
                                  .map(mat => (
                                    <SelectItem key={mat.id} value={mat.id}>
                                      {mat.material_name} ({mat.length}×{mat.width}×{mat.height}")
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-20">
                            <Input
                              type="number"
                              placeholder="Qty"
                              min="0"
                              value={coreItem.quantity || 0}
                              onChange={(e) => {
                                const newCoreMaterials = [...project.core_materials];
                                newCoreMaterials[index] = { ...newCoreMaterials[index], quantity: parseInt(e.target.value) || 0 };
                                setProject(prev => ({ ...prev, core_materials: newCoreMaterials }));
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newCoreMaterials = project.core_materials.filter((_, i) => i !== index);
                              setProject(prev => ({ ...prev, core_materials: newCoreMaterials }));
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProject(prev => ({
                          ...prev,
                          core_materials: [...prev.core_materials, { material_id: "", quantity: 0 }]
                        }));
                      }}
                      className="w-full h-8 text-sm"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Core Material
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-sm">Bricks Along Length</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('bricks_along_length', -1)}
                        disabled={!selectedMaterial || project.bricks_along_length <= 1}
                        className="h-8 w-8"
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={project.bricks_along_length}
                        onChange={(e) => setProject(prev => ({ ...prev, bricks_along_length: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="text-center h-8"
                        disabled={!selectedMaterial}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('bricks_along_length', 1)}
                        disabled={!selectedMaterial}
                        className="h-8 w-8"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Bricks Along Width</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('bricks_along_width', -1)}
                        disabled={!selectedMaterial || project.bricks_along_width <= 1}
                        className="h-8 w-8"
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={project.bricks_along_width}
                        onChange={(e) => setProject(prev => ({ ...prev, bricks_along_width: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="text-center h-8"
                        disabled={!selectedMaterial}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('bricks_along_width', 1)}
                        disabled={!selectedMaterial}
                        className="h-8 w-8"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Courses High</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('courses_high', -1)}
                        disabled={!selectedMaterial || project.courses_high <= 1}
                        className="h-8 w-8"
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={project.courses_high}
                        onChange={(e) => setProject(prev => ({ ...prev, courses_high: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="text-center h-8"
                        disabled={!selectedMaterial}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateBrickCount('courses_high', 1)}
                        disabled={!selectedMaterial}
                        className="h-8 w-8"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-1 text-sm">Final Built Dimensions</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700 text-xs">Length:</span>
                      <p className="font-bold text-blue-900">{calculations?.actualLength || '0'}"</p>
                    </div>
                    <div>
                      <span className="text-blue-700 text-xs">Width:</span>
                      <p className="font-bold text-blue-900">{calculations?.actualWidth || '0'}"</p>
                    </div>
                    <div>
                      <span className="text-blue-700 text-xs">Height:</span>
                      <p className="font-bold text-blue-900">{calculations?.actualHeight || '0'}"</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">These are the actual dimensions considering brick counts and mortar gaps.</p>
                </div>

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full h-8 text-sm"
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                  </Button>
                </div>

                {showAdvanced && (
                  <div className="grid md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <Label className="text-sm">Mortar Gap (inches)</Label>
                      <Input type="number" step="0.125" value={project.mortar_gap} onChange={(e) => setProject(prev => ({ ...prev, mortar_gap: parseFloat(e.target.value) || 0 }))} disabled={!selectedMaterial} className="h-8 mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Waste Factor</Label>
                      <Input type="number" step="0.05" value={project.waste_factor} onChange={(e) => setProject(prev => ({ ...prev, waste_factor: parseFloat(e.target.value) || 1 }))} disabled={!selectedMaterial} className="h-8 mt-1" />
                    </div>
                  </div>
                )}

                <div><Label className="text-sm">Notes</Label><Textarea value={project.notes} onChange={(e) => setProject(prev => ({ ...prev, notes: e.target.value }))} className="h-16 mt-1 text-sm" /></div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader className="pb-3"><CardTitle className="text-lg">Cost Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {selectedMaterial && (
                  <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                    <h4 className="font-medium text-pink-900 mb-1 text-sm">Wall Material</h4>
                    <p className="text-sm text-pink-800">{selectedMaterial.material_name}</p>
                    <p className="text-xs text-pink-600">
                      {selectedMaterial.length}" × {selectedMaterial.width}" × {selectedMaterial.height}"
                    </p>
                    <p className="text-sm font-medium text-pink-900 mt-1">${selectedMaterial.cost_per_unit.toFixed(2)} per unit</p>
                  </div>
                )}

                {calculations && calculations.coreBreakdown && calculations.coreBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900 text-sm">Core Materials</h4>
                    {calculations.coreBreakdown.map((coreItem, index) => {
                      const coreMaterial = inventory.find(m => m.id === coreItem.material_id);
                      if (!coreMaterial) return null;
                      return (
                        <div key={index} className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm font-medium text-amber-900">{coreMaterial.material_name}</p>
                          <p className="text-xs text-amber-600">
                            {coreMaterial.length}" × {coreMaterial.width}" × {coreMaterial.height}"
                          </p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            ${coreMaterial.cost_per_unit.toFixed(2)} per unit
                          </p>
                          <div className="flex justify-between mt-1 text-xs">
                            <span className="text-amber-700">Qty: {coreItem.quantity}</span>
                            <span className="font-medium text-amber-900">${coreItem.total_cost.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {calculations && (
                  <>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Wall Bricks (no waste):</span>
                        <span className="font-medium">{calculations.totalWallBricks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Wall Bricks with {((project.waste_factor - 1) * 100).toFixed(0)}% Waste:</span>
                        <span className="font-medium text-blue-600">{calculations.totalWallBricksWithWaste}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span>Surface Area:</span>
                        <span className="font-medium">{calculations.surfaceArea} sq ft</span>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-purple-900">Mortar Bags (60lb):</span>
                          <span className="text-2xl font-bold text-purple-900">{calculations.mortarBags}</span>
                        </div>
                        <div className="flex justify-between text-xs text-purple-700">
                          <span>Cost per bag: ${parseFloat(settings.brick_mortar_cost_per_bag || 12).toFixed(2)}</span>
                          <span>Total: ${calculations.mortarCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Wall Material Cost:</span>
                        <span className="font-medium">${calculations.wallMaterialCost.toFixed(2)}</span>
                      </div>
                      {calculations.coreMaterialCost > 0 && (
                        <div className="flex justify-between">
                          <span>Core Material Cost:</span>
                          <span className="font-medium">${calculations.coreMaterialCost.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t pt-2">
                        <span>TOTAL:</span>
                        <span className="text-green-600">${calculations.totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}

                {!selectedMaterial && (
                  <div className="text-center py-6 text-slate-500">
                    <Box className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">Select a material to see cost calculations</p>
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