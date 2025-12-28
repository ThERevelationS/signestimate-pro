import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { wallLength, wallWidth, wallHeight, wallThickness, mortarGap, coreMaterials } = await req.json();

        // Calculate available interior space
        const interiorLength = wallLength - (2 * wallThickness) - (2 * mortarGap);
        const interiorWidth = wallWidth - (2 * wallThickness) - (2 * mortarGap);
        const interiorHeight = wallHeight;

        const prompt = `You are a master mason building a STRUCTURAL CORE WALL inside a hollow brick structure.

━━━ INTERIOR SPACE DIMENSIONS ━━━
X-axis (Length): ${interiorLength.toFixed(2)}"
Z-axis (Width): ${interiorWidth.toFixed(2)}"
Y-axis (Height): ${interiorHeight.toFixed(2)}"
Mortar Joint: ${mortarGap}" between all blocks

━━━ AVAILABLE CONCRETE BLOCKS ━━━
${coreMaterials.map((m, i) => `${i + 1}. ${m.material_name} [ID: ${m.id}]
   Dimensions: ${m.length}"L × ${m.width}"W × ${m.height}"H
   Cost: $${m.cost_per_unit.toFixed(2)}/unit`).join('\n')}

━━━ CONSTRUCTION METHODOLOGY ━━━

STEP 1: MATERIAL SELECTION STRATEGY
• Prioritize first material (usually Standard Cinderblock) for 90%+ of structure
• Use smaller/alternate blocks ONLY for tight corners or height adjustments
• Choose blocks that minimize waste: prefer blocks that divide evenly into space dimensions
• Calculate efficiency: (blocks_used × block_volume) / interior_volume should be >85%

STEP 2: ORIENTATION & ROTATION RULES
• Standard orientation: Length along X-axis, Width along Z-axis, Height along Y-axis (rotation: {x:0, y:0, z:0})
• For narrow spaces: Rotate 90° around Y-axis if block width < space requirement (rotation: {x:0, y:1.5708, z:0})
• NEVER rotate around X or Z axes (blocks must remain horizontal)
• Each course must use consistent orientation for structural integrity

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

STEP 5: HEIGHT MANAGEMENT
• Max courses = floor((interiorHeight + mortarGap) / (block_height + mortarGap))
• Each course Y-position = course_number × (block_height + mortarGap) + (block_height/2)
• If top course would exceed height, STOP at previous course
• NO blocks can protrude above interiorHeight limit

STEP 6: CALCULATION PRECISION
For standard course layout:
• Blocks in X: floor((interiorLength + mortarGap) / (primary_block_length + mortarGap))
• Blocks in Z: floor((interiorWidth + mortarGap) / (primary_block_width + mortarGap))
• Center first block at calculated start position
• Space subsequent blocks with exact (block_dimension + mortarGap) increments

━━━ MINIMIZE WASTE ━━━
• Calculate remaining space after standard blocks: if remainder >6", consider half-blocks or alternate sizes
• Cost optimization: fewer large blocks beats many small blocks (less labor, less mortar)
• Structural priority: full blocks at edges/corners, fillers only in interior if needed

━━━ OUTPUT REQUIREMENTS ━━━
Return JSON array with EVERY block placement:
{
  "material_id": "block_id_from_list",
  "position": {"x": 0.0, "y": 8.0, "z": 0.0}, // inches from center origin
  "rotation": {"x": 0, "y": 0, "z": 0}, // radians (0 or 1.5708 for 90° Y-rotation only)
  "dimensions": {"length": 16, "width": 8, "height": 8} // actual block dims used
}

Build a structurally sound, cost-efficient masonry core wall following proper running bond technique.`;

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

        return Response.json({ 
            success: true,
            placements: response.placements 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});