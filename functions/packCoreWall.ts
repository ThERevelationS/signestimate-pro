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

        // Calculate available interior space (INSIDE the brick walls)
        const interiorLength = wallLength - (2 * wallThickness) - (2 * mortarGap);
        const interiorWidth = wallWidth - (2 * wallThickness) - (2 * mortarGap);
        const interiorHeight = wallHeight; // Core blocks CANNOT exceed this height
        
        // These are ABSOLUTE boundaries - blocks MUST stay inside
        const minX = -interiorLength / 2;
        const maxX = interiorLength / 2;
        const minZ = -interiorWidth / 2;
        const maxZ = interiorWidth / 2;
        const minY = 0;
        const maxY = interiorHeight;

        const prompt = `You are filling the HOLLOW INTERIOR of a brick wall with concrete blocks.

━━━ INTERIOR SPACE (where blocks go) ━━━
X-axis: ${(-interiorLength/2).toFixed(2)}" to ${(interiorLength/2).toFixed(2)}" (interior width: ${interiorLength.toFixed(2)}")
Z-axis: ${(-interiorWidth/2).toFixed(2)}" to ${(interiorWidth/2).toFixed(2)}" (interior depth: ${interiorWidth.toFixed(2)}")  
Y-axis: 0" to ${interiorHeight.toFixed(2)}" (interior height: ${interiorHeight.toFixed(2)}")

🚨 CRITICAL BOUNDARIES - BLOCKS CANNOT GO OUTSIDE THESE:
• Every block center X must be between ${(-interiorLength/2).toFixed(2)}" and ${(interiorLength/2).toFixed(2)}"
• Every block center Z must be between ${(-interiorWidth/2).toFixed(2)}" and ${(interiorWidth/2).toFixed(2)}"
• Every block top (Y + height/2) must be ≤ ${interiorHeight.toFixed(2)}"
• If a block would extend outside these boundaries, DO NOT place it

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

MULTI-BLOCK PLACEMENT STRATEGY:

Phase 1: PRIMARY GRID (largest/most cost-effective blocks)
• Use ${coreMaterials[0]?.material_name} for main coverage
• Place in regular grid pattern with standard rotation (X:0, Y:0)
• Calculate grid spacing based on primary block dimensions

Phase 2: ROTATION OPTIMIZATION
• For each position in main grid, consider Y-axis rotation (90°)
• Test if rotation reduces gaps at edges
• Rotate blocks near boundaries if they fit better

Phase 3: GAP FILLING (secondary/tertiary blocks)
• Identify remaining unfilled spaces after primary grid
• Use smaller blocks (from available materials) to fill gaps
• Prioritize lowest cost per cubic inch for gap blocks
• For each gap, try all allowed rotations on candidate blocks

Phase 4: EDGE OPTIMIZATION
• Evaluate walls and corners for partial blocks
• Use secondary materials if they fit remaining space better
• Consider X-axis rotation (standing blocks on edge) if allowed

PLACEMENT ALGORITHM:
1. Create primary grid with main block type (${coreMaterials[0]?.material_name})
2. For EACH grid position, evaluate:
   - Standard placement (y_rot=0°)
   - Y-rotated placement (y_rot=90°)
   ${orientationSettings.allowXRotation ? '   - X-rotated placement (x_rot=90°)\n   - Combined X+Y rotated placement (x_rot=90°, y_rot=90°)' : ''}
3. Select rotation that minimizes waste and stays in bounds
4. After primary grid, scan remaining space for secondary blocks
5. Fill gaps with smallest blocks from available materials

GENERATE ALL BLOCKS needed to fill the entire interior space. Use multiple block types where beneficial.

ROTATION RULES:
• Y-axis rotation (90° = 1.5708 rad): Always allowed. Rotates block around vertical axis. Swaps Length↔Width.
  - 0°: Length along X-axis, Width along Z-axis (standard)
  - 90°: Width along X-axis, Length along Z-axis (flipped)
• X-axis rotation (90° = 1.5708 rad): ${orientationSettings.allowXRotation ? 'ALLOWED - stands block on edge, swaps Width↔Height' : 'FORBIDDEN - keep at 0'}
• Z-axis rotation: FORBIDDEN - always keep at 0
• Strategy: Test different rotations to minimize gaps and maximize coverage
• For each position, try all allowed rotations and select the one that:
  1. Fits within boundaries
  2. Minimizes wasted space
  3. Has lowest cost per cubic inch

━━━ OUTPUT FORMAT ━━━
Return array of block placements in this exact format:
{"material_id": "id", "position": {"x": num, "y": num, "z": num}, "rotation": {"x": 0, "y": 0, "z": 0}, "dimensions": {"length": num, "width": num, "height": num}}

⚠️ CRITICAL FILLING REQUIREMENTS:
1. You MUST fill the ENTIRE interior space from floor to ceiling
2. Every position must have a block - NO EMPTY SPACES ALLOWED
3. Stack blocks in multiple layers (Y direction) until you reach the height limit
4. Spread blocks across full X and Z range - use all available space
5. Generate EXACTLY ${Math.floor(interiorLength / ((coreMaterials[0]?.length || 16) + mortarGap)) * Math.floor(interiorWidth / ((coreMaterials[0]?.width || 8) + mortarGap)) * Math.floor(interiorHeight / ((coreMaterials[0]?.height || 8) + mortarGap))} blocks minimum
6. Each block position (x, y, z) must be unique - no overlapping blocks
7. Boundary validation:
   - (position.x - length/2) >= ${(-interiorLength/2).toFixed(2)} AND (position.x + length/2) <= ${(interiorLength/2).toFixed(2)}
   - (position.z - width/2) >= ${(-interiorWidth/2).toFixed(2)} AND (position.z + width/2) <= ${(interiorWidth/2).toFixed(2)}
   - (position.y + height/2) <= ${interiorHeight.toFixed(2)}

🚨 LAYER STACKING IS MANDATORY: After filling the first layer completely, move to Y = ${(8 + mortarGap).toFixed(1)} and fill again. Continue until height limit.`;

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