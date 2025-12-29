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

        const prompt = `You are filling a rectangular box with concrete blocks. You MUST create a complete 3D grid of blocks.

━━━ SPACE TO FILL ━━━
X-axis: ${(-interiorLength/2).toFixed(2)}" to ${(interiorLength/2).toFixed(2)}" (total: ${interiorLength.toFixed(2)}")
Z-axis: ${(-interiorWidth/2).toFixed(2)}" to ${(interiorWidth/2).toFixed(2)}" (total: ${interiorWidth.toFixed(2)}")
Y-axis: 0" to ${interiorHeight.toFixed(2)}" (total: ${interiorHeight.toFixed(2)}")
Gap between blocks: ${mortarGap}"

🚨 CRITICAL: You MUST place blocks at MANY different X and Z positions, not just at X=0, Z=0!

━━━ AVAILABLE CONCRETE BLOCKS ━━━
${coreMaterials.map((m, i) => `${i + 1}. ${m.material_name} [ID: ${m.id}]
   Dimensions: ${m.length}"L × ${m.width}"W × ${m.height}"H
   Cost: $${m.cost_per_unit.toFixed(2)}/unit`).join('\n')}

━━━ CONSTRUCTION METHODOLOGY ━━━

STEP 1: MATERIAL SELECTION STRATEGY
• PRIMARY GOAL: Fill 100% of the interior space - NO GAPS ALLOWED
• Prioritize first material (usually Standard Cinderblock) for 90%+ of structure
• Use smaller/alternate blocks to fill remaining gaps and edges
• Calculate efficiency: (blocks_used × block_volume) / interior_volume must be >90%
• DO NOT STOP until the entire floor area is covered in every course

STEP 2: ORIENTATION & ROTATION RULES
• Standard orientation: Length along X-axis, Width along Z-axis, Height along Y-axis (rotation: {x:0, y:0, z:0})
• Y-axis rotation (horizontal spin): Always allowed for fitting blocks (rotation: {x:0, y:1.5708, z:0})
${orientationSettings.allowXRotation ? '• X-axis rotation: ALLOWED - blocks can stand on edge (rotation: {x:1.5708, y:0, z:0})' : '• X-axis rotation: DISABLED - blocks must remain flat'}
${orientationSettings.allowZRotation ? '• Z-axis rotation: ALLOWED - blocks can be tilted (rotation: {x:0, y:0, z:1.5708})' : '• Z-axis rotation: DISABLED - blocks must remain flat'}
${orientationSettings.preferHorizontal ? '• PREFERENCE: Horizontal orientation (standard flat placement) - use vertical only when necessary for gap filling' : '• PREFERENCE: Vertical orientation when possible - maximize height per block'}
• Each course should use consistent orientation for structural integrity where possible

STEP 3: RUNNING BOND PATTERN (CRITICAL)
Course 0 (Even): Start X at -(interiorLength/2) + (block_length/2)
Course 1 (Odd):  Offset by half-block: Start X at -(interiorLength/2) + block_length
Course 2 (Even): Return to original alignment
• This creates interlocking pattern preventing vertical cracks
• Offset ensures no continuous vertical joints through wall

STEP 4: CORNER INTERLOCKING
• At corners, blocks from perpendicular courses must overlap by ≥4"
• If primary block doesn't fit corner perfectly, select smaller block for that position
• Corner blocks should alternate orientation between courses
• Ensure mortar gap spacing at all corner intersections

STEP 5: HEIGHT MANAGEMENT (CRITICAL CONSTRAINT)
• ABSOLUTE MAX HEIGHT: ${interiorHeight.toFixed(2)}" - NO BLOCK CAN EXCEED THIS
• Max courses = floor((interiorHeight + mortarGap) / (block_height + mortarGap))
• Each course Y-position = course_number × (block_height + mortarGap) + (block_height/2)
• Before placing each course, verify: (Y-position + block_height/2) ≤ ${interiorHeight.toFixed(2)}"
• If top course would make blocks exceed ${interiorHeight.toFixed(2)}", STOP at previous course
• The top of the highest block MUST be ≤ ${interiorHeight.toFixed(2)}" (the wall material height)

STEP 3: BLOCK PLACEMENT GRID - FOLLOW THIS ALGORITHM EXACTLY

Using primary block (typically 16"L × 8"W × 8"H):

CALCULATE GRID SIZE:
- Blocks in X direction: ${Math.floor(interiorLength / (16 + mortarGap))}
- Blocks in Z direction: ${Math.floor(interiorWidth / (8 + mortarGap))}
- Courses (Y direction): ${Math.floor(interiorHeight / (8 + mortarGap))}
- TOTAL BLOCKS TO GENERATE: ${Math.floor(interiorLength / (16 + mortarGap)) * Math.floor(interiorWidth / (8 + mortarGap)) * Math.floor(interiorHeight / (8 + mortarGap))}

NESTED LOOP STRUCTURE:
for course_num in range(0, ${Math.floor(interiorHeight / (8 + mortarGap))}):
    y_pos = course_num * (8 + ${mortarGap}) + 4.0
    
    for x_index in range(0, ${Math.floor(interiorLength / (16 + mortarGap))}):
        x_pos = ${(-interiorLength/2 + 8).toFixed(2)} + (x_index * ${(16 + mortarGap).toFixed(2)})
        
        for z_index in range(0, ${Math.floor(interiorWidth / (8 + mortarGap))}):
            z_pos = ${(-interiorWidth/2 + 4).toFixed(2)} + (z_index * ${(8 + mortarGap).toFixed(2)})
            
            CREATE BLOCK: {
              "position": {"x": x_pos, "y": y_pos, "z": z_pos},
              "rotation": {"x": 0, "y": 0, "z": 0},
              "dimensions": {"length": 16, "width": 8, "height": 8}
            }

EXAMPLE BLOCKS YOU MUST GENERATE:
Block 1: X=${(-interiorLength/2 + 8).toFixed(2)}, Y=4.0, Z=${(-interiorWidth/2 + 4).toFixed(2)}
Block 2: X=${(-interiorLength/2 + 8 + 16 + mortarGap).toFixed(2)}, Y=4.0, Z=${(-interiorWidth/2 + 4).toFixed(2)}
Block 3: X=${(-interiorLength/2 + 8).toFixed(2)}, Y=4.0, Z=${(-interiorWidth/2 + 4 + 8 + mortarGap).toFixed(2)}
...continue for ALL ${Math.floor(interiorLength / (16 + mortarGap)) * Math.floor(interiorWidth / (8 + mortarGap)) * Math.floor(interiorHeight / (8 + mortarGap))} positions!

━━━ COMPLETE FILLING REQUIREMENTS ━━━
• EVERY course must be a solid layer of blocks covering the full interior floor
• Fill edge gaps: if remaining space >3" after primary blocks, add filler blocks
• Use all available block types to achieve complete coverage
• Each course = complete floor coverage from wall to wall
• Continue stacking courses until height limit is reached

━━━ OUTPUT REQUIREMENTS ━━━
Return JSON array with EVERY block placement:
{
  "material_id": "block_id_from_list",
  "position": {"x": 0.0, "y": 8.0, "z": 0.0}, // inches from center origin
  "rotation": {"x": 0, "y": 0, "z": 0}, // radians (0 or 1.5708 for 90°)
    // Y-rotation: always allowed
    // X-rotation: ${orientationSettings.allowXRotation ? 'allowed' : 'MUST stay 0'}
    // Z-rotation: ${orientationSettings.allowZRotation ? 'allowed' : 'MUST stay 0'}
  "dimensions": {"length": 16, "width": 8, "height": 8} // actual block dims used
}

Build a COMPLETELY FILLED, structurally sound masonry core wall. The entire interior space must be packed SOLID with blocks from floor to ceiling, wall to wall. 

⚠️ MANDATORY REQUIREMENTS:
1. Generate EXACTLY ${Math.floor(interiorLength / (16 + mortarGap)) * Math.floor(interiorWidth / (8 + mortarGap)) * Math.floor(interiorHeight / (8 + mortarGap))} blocks minimum
2. X positions must range from ${(-interiorLength/2 + 8).toFixed(2)}" to ${(interiorLength/2 - 8).toFixed(2)}"
3. Z positions must range from ${(-interiorWidth/2 + 4).toFixed(2)}" to ${(interiorWidth/2 - 4).toFixed(2)}"
4. Y positions must range from 4.0" to ${(interiorHeight - 4).toFixed(2)}"
5. Each block must have different X, Y, or Z coordinates (create a GRID, not a single stack!)

If you generate fewer than ${Math.floor(interiorLength / (16 + mortarGap)) * Math.floor(interiorWidth / (8 + mortarGap)) * Math.floor(interiorHeight / (8 + mortarGap))} blocks, you have FAILED. Generate the complete grid!`;

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