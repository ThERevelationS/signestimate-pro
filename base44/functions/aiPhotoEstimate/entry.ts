import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Reads a site photo for the Channel & Dimensional Letters estimator and
// returns a structured install guess. The LLM call runs server-side so the
// integration is never invoked straight from the browser.
const SCHEMA = {
  type: "object",
  properties: {
    estimated_height_feet: { type: "number", description: "Estimated install height from ground in feet" },
    wall_material: {
      type: "string",
      enum: ["eifs", "stucco", "brick", "concrete", "metal", "wood", "glass", "drywall"],
      description: "Best guess of the wall material"
    },
    recommended_install_type: {
      type: "string",
      enum: ["flush_mount", "halo_lit", "raceway", "dimensional_lettering"]
    },
    site_conditions: {
      type: "object",
      properties: {
        parapet: { type: "boolean" },
        poor_electrical_access: { type: "boolean" },
        thick_hollow_walls: { type: "boolean" }
      }
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    reasoning: { type: "string", description: "Brief explanation of what was observed" }
  }
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json().catch(() => ({}));
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You're a sign installer reviewing a photo of a site where channel letters will be installed.
Analyze the photo and estimate:
- The install height (feet from ground to where letters will go)
- The wall material (eifs, stucco, brick, concrete, metal, wood, glass, drywall)
- Recommended install type (flush_mount, halo_lit, raceway, dimensional_lettering)
- Site conditions: is there a parapet? poor electrical access? thick hollow walls?
- Your confidence level (low/medium/high)

Be specific and practical — these will be used in an estimate.`,
      file_urls: [file_url],
      response_json_schema: SCHEMA
    });

    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}