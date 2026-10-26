import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Parses a rough client request into structured channel-letter purchase line
// items (the "AI scope writer" in the letters purchase tab).
const SCHEMA = {
  type: "object",
  properties: {
    letter_purchases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          letter_type: {
            type: "string",
            enum: ["raceway", "channel_raceway_mounted", "channel_flush_mounted", "channel_halo_lit", "capsule_logo_pillbox", "dimensional_letters"]
          },
          description: { type: "string" },
          qty: { type: "number" },
          size_value: { type: "number", description: "Vertical inches for channel letters, linear feet for raceway, sq ft for capsule/dimensional" },
          install_height_feet: { type: "number" },
          wall_material: { type: "string", enum: ["eifs", "stucco", "brick", "concrete", "metal", "wood", "glass", "drywall"] }
        },
        required: ["letter_type", "qty"]
      }
    },
    notes: { type: "string", description: "Brief summary of what was inferred and any assumptions made" }
  }
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rawText } = await req.json().catch(() => ({}));
    const text = typeof rawText === 'string' ? rawText.trim() : '';
    if (!text) return Response.json({ error: 'rawText required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sign-shop estimator. Parse the following rough client request into structured channel letter purchase line items.

Map letter types as follows:
- "flush mount" or "face-lit" → channel_flush_mounted
- "halo lit" or "backlit" or "reverse channel" → channel_halo_lit
- "raceway mounted" → channel_raceway_mounted
- just "raceway" (no letters) → raceway
- "dimensional" or "flat cut" or "pvc letters" → dimensional_letters
- "logo" or "capsule" or "pillbox" → capsule_logo_pillbox

For size_value: use vertical inches for channel letters (e.g. "24 inch letters" → 24), linear feet for raceway, square feet for capsule/dimensional.
Default install_height_feet to 12 if not mentioned. Default wall_material to "eifs" if not mentioned.

CLIENT REQUEST:
${text}`,
      response_json_schema: SCHEMA
    });

    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}