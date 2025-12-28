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

        const prompt = `You are a structural masonry expert. Build a SOLID STRUCTURAL MASONRY WALL to fill the interior hollow space of an existing brick wall.

HOLLOW INTERIOR DIMENSIONS (in inches):
- Interior Length (X-axis): ${interiorLength.toFixed(2)}"
- Interior Width (Z-axis): ${interiorWidth.toFixed(2)}"  
- Interior Height (Y-axis): ${interiorHeight.toFixed(2)}"
- Mortar Gap: ${mortarGap}"

AVAILABLE CONCRETE BLOCKS:
${coreMaterials.map((m, i) => `${i + 1}. ${m.material_name}
   - Length: ${m.length}", Width: ${m.width}", Height: ${m.height}"
   - ID: ${m.id}`).join('\n')}

STRUCTURAL REQUIREMENTS:
1. Build a STRUCTURAL MASONRY WALL inside this hollow space
2. Stack blocks in horizontal COURSES (layers) from bottom to top
3. Use RUNNING BOND pattern - offset each course by half a block length for interlocking strength
4. Blocks in each course should be laid flat (length × width horizontal, height vertical)
5. Fill ENTIRE interior space from wall to wall, floor to ceiling
6. Maintain ${mortarGap}" mortar gaps between all blocks
7. CRITICAL: Blocks cannot exceed the interior height of ${interiorHeight.toFixed(2)}"
8. Prioritize "Standard Cinderblock" (first material) as the primary building block

CALCULATION FORMULA:
For each course (Y-level):
- Course Y-position = (course_number × (block_height + mortar_gap)) + (block_height / 2)
- Blocks per course in X-direction: floor((interiorLength + mortar_gap) / (block_length + mortar_gap))
- Blocks per course in Z-direction: floor((interiorWidth + mortar_gap) / (block_width + mortar_gap))
- Even courses: No offset, start at X = -(interiorLength/2) + (block_length/2)
- Odd courses: Offset by (block_length/2), start at X = -(interiorLength/2) + block_length

OUTPUT: Return a complete 3D array of block placements that creates a solid, interlocking masonry wall.
Each block placement must include:
- material_id: Which block material to use
- position: {x, y, z} coordinates in inches (origin at center)
- rotation: {x, y, z} in radians (typically all 0 for standard stacking)
- dimensions: {length, width, height} of the actual block used

Build the complete wall structure with proper running bond offset between courses.`;

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