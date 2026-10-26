import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Vision fallback for the Vinyl Estimator's artwork uploader: reads an uploaded
// artwork file and returns its printable bounding box in inches.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json().catch(() => ({}));
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        "Look at this artwork file. Return the width and height of the printable artwork " +
        "bounding box in INCHES. If the file shows real-world dimensions or has a known " +
        "common size, use that. Otherwise estimate from proportions. Always positive numbers.",
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          width_inches: { type: "number" },
          height_inches: { type: "number" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          reasoning: { type: "string" }
        },
        required: ["width_inches", "height_inches"]
      }
    });

    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}