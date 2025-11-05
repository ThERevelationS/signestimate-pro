
import React, { useState, useEffect, useRef } from "react";
import { BrickStoneProject, BrickStoneInventory, Settings } from "@/entities/all";
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
    base_type: "hollow_rectangular",
    bricks_along_length: 6,
    bricks_along_width: 9,
    courses_high: 5,
    layers: 1, // Fixed at 1 for walls
    mortar_gap: 0.375,
    waste_factor: 1.1,
    selected_material_id: "",
    core_materials: [], // Array of {material_id, quantity}
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
    // Dependency array updated to project.core_materials
    if (selectedMaterial && project.bricks_along_length && project.bricks_along_width && project.courses_high) {
      performCalculations();
    }
  }, [selectedMaterial, project.core_materials, project.base_type, project.bricks_along_length, project.bricks_along_width, project.courses_high, project.mortar_gap, project.waste_factor]);

  useEffect(() => {
    drawVisualizations();
  }, [project, selectedMaterial, showDimensions, calculations]);

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

        // NEW: Convert old core_material_id to new core_materials array format if it exists
        // This ensures backward compatibility for projects saved with a single core_material_id
        if (projectData.core_material_id && !projectData.core_materials) {
          projectData.core_materials = [{
            material_id: projectData.core_material_id,
            // Old projects didn't store quantity for core material explicitly.
            // Setting to 0, user will have to manually adjust for existing projects if they wish to include core blocks.
            quantity: 0
          }];
          delete projectData.core_material_id; // Remove the old field
        } else if (!projectData.core_materials) {
          projectData.core_materials = []; // Ensure it's an array if missing
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

    // Auto-fill core on first material selection
    if (material && !hasAutoFilledCore) {
      setHasAutoFilledCore(true);
      // Wait a bit for state to update before filling
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
    // `bricksAlongWidth` defines the number of bricks along the *inner* side walls.
    // So, the total width is two wall thicknesses plus the length of the inner side wall.
    const innerSideWallLength = bricksAlongWidth * brickL + (bricksAlongWidth - 1) * mortarGap;
    const actualWidth = (wallThickness * 2) + innerSideWallLength;
    const actualHeight = coursesHigh * brickH + (coursesHigh - 1) * mortarGap;
    
    // Calculate inner dimensions of the hollow space
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
      setCalculations(null); // Clear calculations if no main material is selected
      return;
    }

    const material = selectedMaterial;
    
    const bricksAlongLength = project.bricks_along_length;
    const bricksAlongWidth = project.bricks_along_width;
    const coursesHigh = project.courses_high;
    const layers = 1; // Always 1 for walls
    const mortarGap = project.mortar_gap;
    const wasteFactor = project.waste_factor;
    
    const brickL = material.length;
    const brickW = material.width;
    const brickH = material.height;
    const costPerUnit = material.cost_per_unit;

    // Wall thickness - single layer
    const wallThickness = brickW;
    
    // Calculate actual dimensions
    const actualLength = bricksAlongLength * brickL + (bricksAlongLength - 1) * mortarGap;
    // `bricksAlongWidth` defines the number of bricks along the *inner* side walls.
    // So, the total width is two wall thicknesses plus the length of the inner side wall.
    const innerSideWallLength = bricksAlongWidth * brickL + (bricksAlongWidth - 1) * mortarGap;
    const actualWidth = (wallThickness * 2) + innerSideWallLength;
    const actualHeight = coursesHigh * brickH + (coursesHigh - 1) * mortarGap;
    
    // Calculate brick counts for main walls
    const frontBackBricks = coursesHigh * bricksAlongLength * layers * 2;
    const leftRightBricks = coursesHigh * bricksAlongWidth * layers * 2;
    const totalWallBricks = frontBackBricks + leftRightBricks;

    // Calculate core materials cost
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
      // Per outline, waste factor is not applied to individual core material quantities for cost calculation.
      const cost = quantity * coreMaterial.cost_per_unit;
      totalCoreMaterialCost += cost;
      
      return {
        material_id: coreItem.material_id,
        material_name: coreMaterial.material_name,
        quantity: quantity, // Storing user-defined quantity (without waste for cost)
        cost_per_unit: coreMaterial.cost_per_unit,
        total_cost: cost
      };
    });

    const exteriorPerimeter = 2 * (actualLength + actualWidth);
    const exteriorSurfaceArea = (exteriorPerimeter * actualHeight) / 144; // Total surface area in sq ft

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
      coreBreakdown: coreBreakdown, // New field for detailed core material breakdown
      surfaceArea: exteriorSurfaceArea.toFixed(2),
      mortarBags: mortarBags,
      wallMaterialCost: wallMaterialCost,
      coreMaterialCost: totalCoreMaterialCost, // Total cost for all core materials
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
    if (!topViewRef.current || !sideViewRef.current || !project.bricks_along_length || !calculations || !selectedMaterial) {
      return;
    }

    const actualLength = parseFloat(calculations.actualLength);
    const actualWidth = parseFloat(calculations.actualWidth);
    const actualHeight = parseFloat(calculations.actualHeight);
    const mortarGap = project.mortar_gap;

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

      if (!showDimensions) {
        ctx.fillStyle = selectedMaterial ? '#dc2626' : '#cbd5e1';
        ctx.fillRect(0, 0, actualLength * scale, actualWidth * scale);

        // Always draw as hollow rectangular now
        if (selectedMaterial) {
          const wallThickness = calculations.wallThickness; // Use calculated wallThickness
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
          
          const numBricksLength = calculations.bricksAlongLength;
          const numBricksWidth = calculations.bricksAlongWidth;
          
          const wallThickness = calculations.wallThickness;
          
          // Draw all wall bricks as solid red rectangles
          ctx.fillStyle = '#a8332e';

          // FRONT WALL (single layer)
          const yStartFront = 0;
          for (let col = 0; col < numBricksLength; col++) {
            let xStart = col * (brickL + mortarGap);
            ctx.fillRect(xStart * scale, yStartFront * scale, brickL * scale, brickW * scale);
          }
          
          // BACK WALL (single layer)
          const yStartBack = actualWidth - brickW;
          for (let col = 0; col < numBricksLength; col++) {
            let xStart = col * (brickL + mortarGap);
            ctx.fillRect(xStart * scale, yStartBack * scale, brickL * scale, brickW * scale);
          }
          
          // Side walls boundaries
          const frontWallEnd = wallThickness;
          const backWallStart = actualWidth - wallThickness;
          
          // LEFT WALL (single layer) - numBricksWidth bricks
          const xStartLeft = 0;
          for (let row = 0; row < numBricksWidth; row++) {
            let yStart = frontWallEnd + row * (brickL + mortarGap);
            const brickYStart = Math.max(frontWallEnd, yStart);
            const brickYEnd = Math.min(backWallStart, yStart + brickL);
            const visibleLength = brickYEnd - brickYStart;
            
            if (visibleLength > 0.05) { // Ensure enough of the brick is visible (e.g., > 0.05 inch)
              ctx.fillRect(xStartLeft * scale, brickYStart * scale, brickW * scale, visibleLength * scale);
            }
          }
          
          // RIGHT WALL (single layer) - numBricksWidth bricks
          const xStartRight = actualLength - brickW;
          for (let row = 0; row < numBricksWidth; row++) {
            let yStart = frontWallEnd + row * (brickL + mortarGap);
            const brickYStart = Math.max(frontWallEnd, yStart);
            const brickYEnd = Math.min(backWallStart, yStart + brickL);
            const visibleLength = brickYEnd - brickYStart;
            
            if (visibleLength > 0.05) { // Ensure enough of the brick is visible
              ctx.fillRect(xStartRight * scale, brickYStart * scale, brickW * scale, visibleLength * scale);
            }
          }
          
          // Fill hollow center first
          const innerXStart = wallThickness;
          const innerYStart = frontWallEnd;
          const innerXEnd = actualLength - wallThickness;
          const innerYEnd = backWallStart;
          
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(innerXStart * scale, innerYStart * scale, (innerXEnd - innerXStart) * scale, (innerYEnd - innerYStart) * scale);

          // Draw core blocks filling the ENTIRE hollow space
          if (project.core_materials && project.core_materials.length > 0) {
            const innerLength = innerXEnd - innerXStart;
            const innerWidth = innerYEnd - innerYStart;
            
            // Get valid core materials
            const validCoreMaterials = project.core_materials.filter(item => {
              const mat = inventory.find(m => m.id === item.material_id);
              return mat && item.quantity > 0;
            });
            
            if (validCoreMaterials.length > 0 && innerLength > 0 && innerWidth > 0) {
              const firstCoreItem = validCoreMaterials[0];
              const firstCoreMaterial = inventory.find(m => m.id === firstCoreItem.material_id);
              
              if (firstCoreMaterial) {
                const blockL = firstCoreMaterial.length;
                const blockW = firstCoreMaterial.width;
                
                // Calculate how many blocks fit (NO mortar gap added to dimension for division)
                const normalCols = Math.floor(innerLength / (blockL + mortarGap));
                const normalRows = Math.floor(innerWidth / (blockW + mortarGap));
                const rotatedCols = Math.floor(innerLength / (blockW + mortarGap));
                const rotatedRows = Math.floor(innerWidth / (blockL + mortarGap));
                
                // Choose best orientation
                const useRotated = (rotatedCols * rotatedRows) > (normalCols * normalRows);
                const cols = useRotated ? rotatedCols : normalCols;
                const rows = useRotated ? rotatedRows : normalRows;
                const blockDrawL = useRotated ? blockW : blockL;
                const blockDrawW = useRotated ? blockL : blockW;
                
                // Calculate total user blocks
                const totalUserBlocks = validCoreMaterials.reduce((sum, item) => sum + item.quantity, 0);
                
                // Draw EVERY block position in the grid
                const colors = ['#8B4513', '#A0522D', '#D2691E', '#CD853F', '#DEB887', '#F4A460'];
                let blockIndex = 0;
                
                for (let row = 0; row < rows; row++) {
                  for (let col = 0; col < cols; col++) {
                    const x = innerXStart + col * (blockDrawL + mortarGap);
                    const y = innerYStart + row * (blockDrawW + mortarGap);
                    
                    // Determine which material this block belongs to
                    if (blockIndex < totalUserBlocks) {
                      let currentMaterialIndex = 0;
                      let cumulativeBlocks = 0;
                      
                      for (let i = 0; i < validCoreMaterials.length; i++) {
                        cumulativeBlocks += validCoreMaterials[i].quantity;
                        if (blockIndex < cumulativeBlocks) {
                          currentMaterialIndex = i;
                          break;
                        }
                      }
                      
                      // Draw filled block with material color
                      ctx.fillStyle = colors[currentMaterialIndex % colors.length];
                    } else {
                      // Draw empty block (not specified by user)
                      ctx.fillStyle = '#e5e7eb';
                    }
                    
                    ctx.fillRect(x * scale, y * scale, blockDrawL * scale, blockDrawW * scale);
                    
                    // Draw border for all blocks
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x * scale, y * scale, blockDrawL * scale, blockDrawW * scale);
                    
                    blockIndex++;
                  }
                }
              }
            }
          }

          // Draw borders
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3;
          ctx.strokeRect(0, 0, actualLength * scale, actualWidth * scale);
          
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;
          ctx.strokeRect(innerXStart * scale, innerYStart * scale,
                        (actualLength - 2 * wallThickness) * scale,
                        (actualWidth - 2 * wallThickness) * scale);
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

        if (selectedMaterial) {
          ctx.font = '10px sans-serif';
          ctx.fillText(`${calculations.bricksAlongLength} × ${calculations.bricksAlongWidth} bricks (1 layer)`,
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
            
            // Only draw vertical lines for bricks that start within or before the wall
            if (brickStart < actualLength * scale - 0.1) {
              // If brick starts within the wall, draw line at start position
              if (brickStart >= -0.1) {
                ctx.beginPath();
                ctx.moveTo(brickStart, y);
                ctx.lineTo(brickStart, y + brickH);
                ctx.stroke();
              }
              
              // If brick extends beyond the wall, draw line at wall edge
              if (brickEnd > actualLength * scale + 0.1) {
                ctx.beginPath();
                ctx.moveTo(actualLength * scale, y);
                ctx.lineTo(actualLength * scale, y + brickH);
                ctx.stroke();
                break; // No more bricks fit in this course
              }
            }
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
        calculated_bricks: calculations.totalWallBricksWithWaste,
        // `core_bricks` field is removed, as `project.core_materials` now holds detailed info.
        // `project.core_materials` is already part of `...project`.
        calculated_surface_area: parseFloat(calculations.surfaceArea),
        mortar_bags_needed: calculations.mortarBags,
        material_cost: calculations.wallMaterialCost,
        core_material_cost: calculations.coreMaterialCost, // This is the total cost of all core materials
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
                <div> 
                  <Label>Wall Material</Label>
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

                <div> 
                  <div className="flex justify-between items-center mb-2">
                    <Label>Core Materials (Optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fillCoreWithAI()}
                      disabled={!selectedMaterial || isAIFilling}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                    >
                      {isAIFilling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          AI Filling...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Fill with AI
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Add blocks to fill the hollow core - blocks only
                  </p>
                  <div className="space-y-3">
                    {project.core_materials.map((coreItem, index) => {
                      const coreMaterial = inventory.find(m => m.id === coreItem.material_id);
                      return (
                        <div key={index} className="flex gap-2 items-start p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex-1">
                            <Select 
                              value={coreItem.material_id} 
                              onValueChange={(value) => {
                                const newCoreMaterials = [...project.core_materials];
                                newCoreMaterials[index] = { ...newCoreMaterials[index], material_id: value };
                                setProject(prev => ({ ...prev, core_materials: newCoreMaterials }));
                              }}
                            >
                              <SelectTrigger>
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
                            {coreMaterial && (
                              <p className="text-xs text-slate-500 mt-1">
                                ${coreMaterial.cost_per_unit.toFixed(2)} per unit
                              </p>
                            )}
                          </div>
                          <div className="w-24">
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
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Core Material
                    </Button>
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
                  <h4 className="font-semibold text-blue-900 mb-2">Final Built Dimensions</h4>
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
                    <h4 className="font-medium text-rose-900 mb-2">Wall Material</h4>
                    <p className="text-sm text-rose-800">{selectedMaterial.material_name}</p>
                    <p className="text-xs text-rose-600">
                      {selectedMaterial.length}" × {selectedMaterial.width}" × {selectedMaterial.height}"
                    </p>
                    <p className="text-sm font-medium text-rose-900 mt-2">${selectedMaterial.cost_per_unit.toFixed(2)} per unit</p>
                  </div>
                )}

                {calculations && calculations.coreBreakdown && calculations.coreBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900">Core Materials</h4>
                    {calculations.coreBreakdown.map((coreItem, index) => {
                      const coreMaterial = inventory.find(m => m.id === coreItem.material_id);
                      if (!coreMaterial) return null;
                      return (
                        <div key={index} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm font-medium text-amber-900">{coreMaterial.material_name}</p>
                          <p className="text-xs text-amber-600">
                            {coreMaterial.length}" × {coreMaterial.width}" × {coreMaterial.height}"
                          </p>
                          <div className="flex justify-between mt-2 text-sm">
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
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Wall Bricks (no waste):</span>
                        <span className="font-medium">{calculations.totalWallBricks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Wall Bricks with {((project.waste_factor - 1) * 100).toFixed(0)}% Waste:</span>
                        <span className="font-medium text-blue-600">{calculations.totalWallBricksWithWaste}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
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
                        <span>Wall Material Cost:</span>
                        <span className="font-medium">${calculations.wallMaterialCost.toFixed(2)}</span>
                      </div>
                      {calculations.coreMaterialCost > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Core Material Cost:</span>
                          <span className="font-medium">${calculations.coreMaterialCost.toFixed(2)}</span>
                        </div>
                      )}
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
