import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            wallLength, 
            wallWidth, 
            wallHeight, 
            wallThickness, 
            mortarGap, 
            coreMaterials,
            orientationSettings = {
                allowXRotation: false,
                allowZRotation: false,
                preferHorizontal: true
            }
        } = await req.json();

        // Calculate available interior space
        const interiorLength = wallLength - (2 * wallThickness) - (2 * mortarGap);
        const interiorWidth = wallWidth - (2 * wallThickness) - (2 * mortarGap);
        const interiorHeight = wallHeight; // Core CANNOT exceed this height

        const prompt = `TASK: Fill a rectangular box with concrete blocks in a 3D grid pattern.

━━━ BOX DIMENSIONS ━━━
X-axis: ${(-interiorLength/2).toFixed(2)}" to +${(interiorLength/2).toFixed(2)}" (width: ${interiorLength.toFixed(2)}")
Z-axis: ${(-interiorWidth/2).toFixed(2)}" to +${(interiorWidth/2).toFixed(2)}" (depth: ${interiorWidth.toFixed(2)}")  
Y-axis: 0" to ${interiorHeight.toFixed(2)}" (height: ${interiorHeight.toFixed(2)}")

🚨 CRITICAL HEIGHT LIMIT: Block tops CANNOT exceed Y=${interiorHeight.toFixed(2)}"

━━━ AVAILABLE BLOCKS ━━━
${coreMaterials.map((m, i) => `${i + 1}. ${m.material_name} [ID: ${m.id}] - ${m.length}"L × ${m.width}"W × ${m.height}"H`).join('\n')}

━━━ EXACT PLACEMENT INSTRUCTIONS ━━━

Use the PRIMARY block (first in list) for the main grid. Calculate positions using these formulas:

BLOCK DIMENSIONS: L=${coreMaterials[0]?.length || 16}", W=${coreMaterials[0]?.width || 8}", H=${coreMaterials[0]?.height || 8}"
MORTAR GAP: ${mortarGap}"

GRID CALCULATIONS:
• Blocks per row (X): ${Math.floor(interiorLength / ((coreMaterials[0]?.length || 16) + mortarGap))}
• Blocks per column (Z): ${Math.floor(interiorWidth / ((coreMaterials[0]?.width || 8) + mortarGap))}  
• Number of layers (Y): ${Math.floor(interiorHeight / ((coreMaterials[0]?.height || 8) + mortarGap))}
• TOTAL BLOCKS: ${Math.floor(interiorLength / ((coreMaterials[0]?.length || 16) + mortarGap)) * Math.floor(interiorWidth / ((coreMaterials[0]?.width || 8) + mortarGap)) * Math.floor(interiorHeight / ((coreMaterials[0]?.height || 8) + mortarGap))}

PLACEMENT FORMULA (generate block at each grid position):
For layer = 0 to ${Math.floor(interiorHeight / ((coreMaterials[0]?.height || 8) + mortarGap)) - 1}:
  Y = layer × (${(coreMaterials[0]?.height || 8)} + ${mortarGap}) + ${((coreMaterials[0]?.height || 8) / 2).toFixed(1)}
  
  For row = 0 to ${Math.floor(interiorLength / ((coreMaterials[0]?.length || 16) + mortarGap)) - 1}:
    X = ${(-interiorLength/2 + (coreMaterials[0]?.length || 16)/2).toFixed(2)} + (row × ${((coreMaterials[0]?.length || 16) + mortarGap).toFixed(2)})
    
    For col = 0 to ${Math.floor(interiorWidth / ((coreMaterials[0]?.width || 8) + mortarGap)) - 1}:
      Z = ${(-interiorWidth/2 + (coreMaterials[0]?.width || 8)/2).toFixed(2)} + (col × ${((coreMaterials[0]?.width || 8) + mortarGap).toFixed(2)})
      
      IF (Y + ${((coreMaterials[0]?.height || 8) / 2).toFixed(1)}) <= ${interiorHeight.toFixed(2)}:
        OUTPUT: {"material_id": "${coreMaterials[0]?.id}", "position": {"x": X, "y": Y, "z": Z}, "rotation": {"x": 0, "y": 0, "z": 0}, "dimensions": {"length": ${coreMaterials[0]?.length || 16}, "width": ${coreMaterials[0]?.width || 8}, "height": ${coreMaterials[0]?.height || 8}}}

ROTATION RULES:
• Y-rotation (0 or 1.5708): Always allowed
• X-rotation: ${orientationSettings.allowXRotation ? 'Allowed' : 'FORBIDDEN - keep at 0'}
• Z-rotation: ${orientationSettings.allowZRotation ? 'Allowed' : 'FORBIDDEN - keep at 0'}
${orientationSettings.preferHorizontal ? '• Prefer horizontal (rotation all 0)' : '• Prefer vertical when possible'}

━━━ OUTPUT FORMAT ━━━
Return array of block placements in this exact format:
{"material_id": "id", "position": {"x": num, "y": num, "z": num}, "rotation": {"x": 0, "y": 0, "z": 0}, "dimensions": {"length": num, "width": num, "height": num}}

⚠️ REQUIREMENTS:
1. Generate AT LEAST ${Math.floor(interiorLength / ((coreMaterials[0]?.length || 16) + mortarGap)) * Math.floor(interiorWidth / ((coreMaterials[0]?.width || 8) + mortarGap)) * Math.floor(interiorHeight / ((coreMaterials[0]?.height || 8) + mortarGap))} blocks
2. X values must span from ${(-interiorLength/2 + (coreMaterials[0]?.length || 16)/2).toFixed(2)}" to ${(interiorLength/2 - (coreMaterials[0]?.length || 16)/2).toFixed(2)}"
3. Z values must span from ${(-interiorWidth/2 + (coreMaterials[0]?.width || 8)/2).toFixed(2)}" to ${(interiorWidth/2 - (coreMaterials[0]?.width || 8)/2).toFixed(2)}"
4. Stack blocks as high as possible, but Y + (height/2) MUST be ≤ ${interiorHeight.toFixed(2)}"
5. Create a COMPLETE GRID - not just a single column at X=0, Z=0!`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    placements: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                material_id: { type: "string" },
                                position: {
                                    type: "object",
                                    properties: {
                                        x: { type: "number" },
                                        y: { type: "number" },
                                        z: { type: "number" }
                                    }
                                },
                                rotation: {
                                    type: "object",
                                    properties: {
                                        x: { type: "number" },
                                        y: { type: "number" },
                                        z: { type: "number" }
                                    }
                                },
                                dimensions: {
                                    type: "object",
                                    properties: {
                                        length: { type: "number" },
                                        width: { type: "number" },
                                        height: { type: "number" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Validate that all blocks stay within interior boundaries and respect rotation rules
        const validPlacements = response.placements.filter(p => {
            const dims = p.dimensions;
            const rotX = p.rotation.x || 0;
            const rotY = p.rotation.y || 0;
            const rotZ = p.rotation.z || 0;
            
            // Enforce rotation restrictions
            if (!orientationSettings.allowXRotation && Math.abs(rotX) > 0.01) return false;
            if (!orientationSettings.allowZRotation && Math.abs(rotZ) > 0.01) return false;
            
            // Calculate effective dimensions accounting for all rotations
            let effectiveLength = dims.length;
            let effectiveWidth = dims.width;
            let effectiveHeight = dims.height;
            
            // Y-rotation swaps length/width
            if (Math.abs(Math.sin(rotY)) > 0.5) {
                [effectiveLength, effectiveWidth] = [effectiveWidth, effectiveLength];
            }
            
            // X-rotation swaps width/height  
            if (Math.abs(Math.sin(rotX)) > 0.5) {
                [effectiveWidth, effectiveHeight] = [effectiveHeight, effectiveWidth];
            }
            
            // Z-rotation swaps length/height
            if (Math.abs(Math.sin(rotZ)) > 0.5) {
                [effectiveLength, effectiveHeight] = [effectiveHeight, effectiveLength];
            }
            
            const topOfBlock = p.position.y + (effectiveHeight / 2);
            const minX = p.position.x - (effectiveLength / 2);
            const maxX = p.position.x + (effectiveLength / 2);
            const minZ = p.position.z - (effectiveWidth / 2);
            const maxZ = p.position.z + (effectiveWidth / 2);
            
            return topOfBlock <= interiorHeight &&
                   minX >= -(interiorLength/2) &&
                   maxX <= (interiorLength/2) &&
                   minZ >= -(interiorWidth/2) &&
                   maxZ <= (interiorWidth/2);
        });

        return Response.json({ 
            success: true,
            placements: validPlacements,
            filtered: response.placements.length - validPlacements.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});