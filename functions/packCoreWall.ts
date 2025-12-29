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

        const prompt = `You are a master mason building a STRUCTURAL CORE WALL inside a hollow brick structure.

🚨 CRITICAL REQUIREMENT: You MUST fill the ENTIRE interior space completely from EDGE TO EDGE. Generate hundreds of block placements to achieve FULL coverage.

━━━ INTERIOR SPACE DIMENSIONS ━━━
X-axis (Length): ${interiorLength.toFixed(2)}" [FROM ${(-interiorLength/2).toFixed(2)}" TO ${(interiorLength/2).toFixed(2)}"]
Z-axis (Width): ${interiorWidth.toFixed(2)}" [FROM ${(-interiorWidth/2).toFixed(2)}" TO ${(interiorWidth/2).toFixed(2)}"]
Y-axis (Height): ${interiorHeight.toFixed(2)}" [FROM 0" TO ${interiorHeight.toFixed(2)}"]
Mortar Gap: ${mortarGap}" between blocks

⚠️ DO NOT place all blocks at center (0,0)! You must spread blocks across the ENTIRE X and Z range!

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

STEP 6: COMPLETE SPACE FILLING - CRITICAL INSTRUCTIONS
YOU MUST CREATE A COMPLETE 3D GRID OF BLOCKS FILLING THE ENTIRE SPACE!

Example calculation for primary block (16"L × 8"W × 8"H):
• X-direction blocks per course: floor(${interiorLength.toFixed(2)} / (16 + ${mortarGap})) = ${Math.floor(interiorLength / (16 + mortarGap))} blocks
• Z-direction blocks per course: floor(${interiorWidth.toFixed(2)} / (8 + ${mortarGap})) = ${Math.floor(interiorWidth / (8 + mortarGap))} blocks  
• Total courses (height): floor(${interiorHeight.toFixed(2)} / (8 + ${mortarGap})) = ${Math.floor(interiorHeight / (8 + mortarGap))} courses
• MINIMUM BLOCKS NEEDED: ${Math.floor(interiorLength / (16 + mortarGap))} × ${Math.floor(interiorWidth / (8 + mortarGap))} × ${Math.floor(interiorHeight / (8 + mortarGap))} = ${Math.floor(interiorLength / (16 + mortarGap)) * Math.floor(interiorWidth / (8 + mortarGap)) * Math.floor(interiorHeight / (8 + mortarGap))} blocks minimum!

PLACEMENT ALGORITHM - FOLLOW EXACTLY:
For course = 0 to ${Math.floor(interiorHeight / (8 + mortarGap))}:
  Y_position = course × (8 + ${mortarGap}) + 4
  
  For X_index = 0 to ${Math.floor(interiorLength / (16 + mortarGap)) - 1}:
    X_position = ${(-interiorLength/2).toFixed(2)} + 8 + (X_index × (16 + ${mortarGap}))
    
    For Z_index = 0 to ${Math.floor(interiorWidth / (8 + mortarGap)) - 1}:
      Z_position = ${(-interiorWidth/2).toFixed(2)} + 4 + (Z_index × (8 + ${mortarGap}))
      
      Place block at {x: X_position, y: Y_position, z: Z_position}

This creates ${Math.floor(interiorLength / (16 + mortarGap)) * Math.floor(interiorWidth / (8 + mortarGap)) * Math.floor(interiorHeight / (8 + mortarGap))} blocks covering the ENTIRE space!

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

⚠️ CRITICAL ERRORS TO AVOID:
1. DO NOT place all blocks at center (X=0, Z=0) - spread them across FULL X and Z ranges!
2. DO NOT stop after 10-20 blocks - you need ${Math.floor(interiorLength / (16 + mortarGap)) * Math.floor(interiorWidth / (8 + mortarGap)) * Math.floor(interiorHeight / (8 + mortarGap))}+ blocks!
3. DO NOT leave empty spaces - fill from X=${(-interiorLength/2).toFixed(2)}" to X=${(interiorLength/2).toFixed(2)}" AND Z=${(-interiorWidth/2).toFixed(2)}" to Z=${(interiorWidth/2).toFixed(2)}"!

GENERATE A COMPLETE 3D GRID filling the entire ${interiorLength.toFixed(2)}" × ${interiorWidth.toFixed(2)}" × ${interiorHeight.toFixed(2)}" volume.`;

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