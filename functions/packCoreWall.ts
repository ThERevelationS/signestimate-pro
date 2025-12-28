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

        const prompt = `You are a 3D masonry packing expert. Given a hollow wall interior space and available core materials, create an optimal packing plan.

INTERIOR SPACE (inches):
- Length: ${interiorLength}
- Width: ${interiorWidth}  
- Height: ${interiorHeight}
- Mortar Gap: ${mortarGap}

AVAILABLE CORE MATERIALS:
${coreMaterials.map((m, i) => `${i + 1}. ${m.material_name}
   - Dimensions: ${m.length}" L x ${m.width}" W x ${m.height}" H
   - Material ID: ${m.id}
   - Type: ${m.material_type}`).join('\n')}

PACKING RULES:
1. Fill the space as efficiently as possible from bottom to top
2. Each block can be rotated 90° on any axis (x, y, z) to fit better
3. Use running bond pattern (offset courses) for structural integrity
4. Maintain ${mortarGap}" gaps between blocks
5. Prioritize the first material (Standard Cinderblock) for the base structure
6. No block can exceed the interior height
7. Blocks should fill from the inner perimeter inward, ensuring no gaps along walls

OUTPUT FORMAT (JSON array of block placements):
[
  {
    "material_id": "...",
    "position": {"x": 0, "y": 12, "z": 0},
    "rotation": {"x": 0, "y": 0, "z": 0},
    "dimensions": {"length": 16, "width": 8, "height": 8}
  }
]

Notes:
- Position coordinates are in inches from the center (0,0,0)
- Rotation in radians (0, Math.PI/2, Math.PI, etc.)
- Y is vertical (up), X and Z are horizontal
- Optimize for minimal gaps and maximum structural integrity`;

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