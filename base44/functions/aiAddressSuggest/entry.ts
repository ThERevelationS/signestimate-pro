import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Fast address autocomplete for the site-address fields in the estimators.
const SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          full_address: { type: "string", description: "Complete formatted address: street, city, state, zip" },
          label: { type: "string", description: "Short display label (street + city)" }
        },
        required: ["full_address"]
      }
    }
  }
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query } = await req.json().catch(() => ({}));
    const q = typeof query === 'string' ? query.trim() : '';
    if (q.length < 4) return Response.json({ suggestions: [] });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Return up to 5 plausible US street-address autocomplete completions for: "${q}".
Each must look like a real mailing address (street number + street, city, state abbr, ZIP).
Prefer well-known streets/cities. Be FAST — do not search the web. JSON only.`,
      response_json_schema: SCHEMA,
      model: "gemini_3_flash"
    });

    return Response.json({ suggestions: result?.suggestions || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}