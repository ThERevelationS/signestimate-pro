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

Phase 1: PRIMARY GRID WITH DYNAMIC ROTATION
• Fill entire interior with ${coreMaterials[0]?.material_name} using grid algorithm
• For each grid position, evaluate all allowed rotations:
  - Rotation A (x:0°, y:0°): Length→X, Width→Z, Height→Y
  - Rotation B (x:0°, y:90°): Width→X, Length→Z, Height→Y (swapped X-Z)
  ${orientationSettings.allowXRotation ? '  - Rotation C (x:90°, y:0°): Length→X, Width→Y, Height→Z (block on edge)\n  - Rotation D (x:90°, y:90°): Width→X, Length→Y, Height→Z' : ''}
• For each position, calculate gap to boundary/next block for each rotation
• Select rotation that MINIMIZES wasted space

Phase 2: INTELLIGENT VOID DETECTION
• After primary grid, scan entire interior for unfilled spaces
• Identify voids by checking 3D space between blocks and walls
• Categorize voids: small (<50cu.in), medium (50-200cu.in), large (>200cu.in)
• Store void coordinates: X_range [min,max], Y_range [min,max], Z_range [min,max]

Phase 3: PRECISION GAP-FILLING WITH MULTI-BLOCK STRATEGY
• For each void, find optimal filler block:
  1. Sort available blocks by cost-per-cubic-inch (lowest first)
  2. For each block candidate, test ALL allowed rotations
  3. Calculate exact fit: how much void volume does each rotation fill?
  4. Track best rotation for each block type
  5. Select block+rotation combo with highest fill efficiency
• Place filler blocks in voids with their optimal rotations
• If void remains after one filler block, recursively fill remainder with smaller blocks
• Continue until void is maximally filled or becomes too small

Phase 4: STRUCTURAL INTERLOCKING & CORNERS
• For blocks touching walls/corners, test rotations that create interlocking
• Use running bond pattern where possible (offset alternating layers)
• At corners, use smaller blocks to achieve tight fit with varied rotations
• Ensure mortar gaps are consistent at all intersections

Phase 5: HEIGHT TRANSITION OPTIMIZATION
• Analyze blocks at layer transitions (Y-level changes)
• Test X-rotations for blocks that bridge vertical gaps
• Select rotation that maximizes structural continuity

OUTPUT REQUIREMENT:
Generate EVERY block with its optimized rotation (x and y values). Prioritize multi-type usage for cost efficiency and gap-filling.

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

        // Validate and process placements with sophisticated gap-filling
        const validPlacements = response.placements.filter(p => {
            const dims = p.dimensions;
            const rotX = p.rotation.x || 0;
            const rotY = p.rotation.y || 0;
            const rotZ = p.rotation.z || 0;
            
            if (!orientationSettings.allowXRotation && Math.abs(rotX) > 0.01) return false;
            if (!orientationSettings.allowZRotation && Math.abs(rotZ) > 0.01) return false;
            
            let effectiveLength = dims.length;
            let effectiveWidth = dims.width;
            let effectiveHeight = dims.height;
            
            if (Math.abs(Math.sin(rotY)) > 0.5) {
                [effectiveLength, effectiveWidth] = [effectiveWidth, effectiveLength];
            }
            if (Math.abs(Math.sin(rotX)) > 0.5) {
                [effectiveWidth, effectiveHeight] = [effectiveHeight, effectiveWidth];
            }
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

        // Post-processing: Sophisticated gap-filling analysis
        const filledVolume = new Set();
        const GRID_SIZE = 1; // 1-inch grid for void detection
        
        // Track all voxels occupied by placed blocks
        validPlacements.forEach(p => {
            const dims = p.dimensions;
            const rotX = p.rotation.x || 0;
            const rotY = p.rotation.y || 0;
            
            let effL = dims.length, effW = dims.width, effH = dims.height;
            if (Math.abs(Math.sin(rotY)) > 0.5) [effL, effW] = [effW, effL];
            if (Math.abs(Math.sin(rotX)) > 0.5) [effW, effH] = [effH, effW];
            
            const x1 = Math.ceil((p.position.x - effL/2) / GRID_SIZE);
            const x2 = Math.floor((p.position.x + effL/2) / GRID_SIZE);
            const y1 = Math.ceil((p.position.y - effH/2) / GRID_SIZE);
            const y2 = Math.floor((p.position.y + effH/2) / GRID_SIZE);
            const z1 = Math.ceil((p.position.z - effW/2) / GRID_SIZE);
            const z2 = Math.floor((p.position.z + effW/2) / GRID_SIZE);
            
            for (let x = x1; x <= x2; x++) {
                for (let y = y1; y <= y2; y++) {
                    for (let z = z1; z <= z2; z++) {
                        filledVolume.add(`${x},${y},${z}`);
                    }
                }
            }
        });

        // Detect unfilled voids within interior space
        const voids = [];
        const ix1 = Math.ceil((-interiorLength/2) / GRID_SIZE);
        const ix2 = Math.floor((interiorLength/2) / GRID_SIZE);
        const iy1 = Math.ceil((0) / GRID_SIZE);
        const iy2 = Math.floor((interiorHeight) / GRID_SIZE);
        const iz1 = Math.ceil((-interiorWidth/2) / GRID_SIZE);
        const iz2 = Math.floor((interiorWidth/2) / GRID_SIZE);
        
        for (let x = ix1; x <= ix2; x++) {
            for (let y = iy1; y <= iy2; y++) {
                for (let z = iz1; z <= iz2; z++) {
                    if (!filledVolume.has(`${x},${y},${z}`)) {
                        voids.push({ x: x * GRID_SIZE, y: y * GRID_SIZE, z: z * GRID_SIZE });
                    }
                }
            }
        }

        // Cluster voids into contiguous regions and fill with smallest blocks
        const sortedMaterials = coreMaterials
            .filter(m => m.length && m.width && m.height && m.cost_per_unit)
            .sort((a, b) => {
                const volA = a.length * a.width * a.height;
                const volB = b.length * b.width * b.height;
                const costEffA = a.cost_per_unit / volA;
                const costEffB = b.cost_per_unit / volB;
                return costEffA - costEffB;
            });

        // Attempt to fill voids with available block materials
        const gapPlacements = [];
        const usedVoids = new Set();
        
        for (const material of sortedMaterials) {
            for (const void of voids) {
                if (usedVoids.has(`${void.x},${void.y},${void.z}`)) continue;
                
                // Try all allowed rotations for this void
                const rotations = [
                    { x: 0, y: 0 },
                    { x: 0, y: Math.PI/2 },
                    ...(orientationSettings.allowXRotation ? [{ x: Math.PI/2, y: 0 }, { x: Math.PI/2, y: Math.PI/2 }] : [])
                ];
                
                let bestFit = null;
                let bestWaste = Infinity;
                
                for (const rot of rotations) {
                    let effL = material.length, effW = material.width, effH = material.height;
                    if (Math.abs(Math.sin(rot.y)) > 0.5) [effL, effW] = [effW, effL];
                    if (Math.abs(Math.sin(rot.x)) > 0.5) [effW, effH] = [effH, effW];
                    
                    const blockX = void.x + effL/2;
                    const blockY = void.y + effH/2;
                    const blockZ = void.z + effW/2;
                    
                    // Check if block fits within boundaries
                    if (blockX - effL/2 >= -(interiorLength/2) && blockX + effL/2 <= interiorLength/2 &&
                        blockZ - effW/2 >= -(interiorWidth/2) && blockZ + effW/2 <= interiorWidth/2 &&
                        blockY + effH/2 <= interiorHeight) {
                        
                        const waste = effL + effW + effH; // Simpler waste metric
                        if (waste < bestWaste) {
                            bestWaste = waste;
                            bestFit = { pos: { x: blockX, y: blockY, z: blockZ }, rot, dims: { l: effL, w: effW, h: effH } };
                        }
                    }
                }
                
                if (bestFit) {
                    gapPlacements.push({
                        material_id: material.id,
                        position: bestFit.pos,
                        rotation: { x: bestFit.rot.x, y: bestFit.rot.y, z: 0 },
                        dimensions: { length: bestFit.dims.l, width: bestFit.dims.w, height: bestFit.dims.h }
                    });
                    
                    // Mark voxels as filled
                    const x1 = Math.ceil((bestFit.pos.x - bestFit.dims.l/2) / GRID_SIZE);
                    const x2 = Math.floor((bestFit.pos.x + bestFit.dims.l/2) / GRID_SIZE);
                    const y1 = Math.ceil((bestFit.pos.y - bestFit.dims.h/2) / GRID_SIZE);
                    const y2 = Math.floor((bestFit.pos.y + bestFit.dims.h/2) / GRID_SIZE);
                    const z1 = Math.ceil((bestFit.pos.z - bestFit.dims.w/2) / GRID_SIZE);
                    const z2 = Math.floor((bestFit.pos.z + bestFit.dims.w/2) / GRID_SIZE);
                    
                    for (let x = x1; x <= x2; x++) {
                        for (let y = y1; y <= y2; y++) {
                            for (let z = z1; z <= z2; z++) {
                                usedVoids.add(`${x},${y},${z}`);
                            }
                        }
                    }
                }
            }
        }

        const allPlacements = [...validPlacements, ...gapPlacements];
        const fillDensity = ((filledVolume.size + usedVoids.size) / (voids.length + filledVolume.size)) * 100;

        return Response.json({ 
            success: true,
            placements: allPlacements,
            filtered: response.placements.length - validPlacements.length,
            gap_fills: gapPlacements.length,
            fill_density: fillDensity.toFixed(1),
            total_voids_detected: voids.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});