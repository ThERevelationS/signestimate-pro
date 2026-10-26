import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Turns rough job notes and/or sign mockups into structured channel-letter
// installation line items for the installer's estimate.
const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          installation_type: {
            type: "string",
            enum: ["flush_mount", "halo_lit", "raceway", "dimensional_lettering"]
          },
          qty_letters: { type: "number" },
          letter_size: {
            type: "string",
            enum: ["extra_small", "small", "medium", "large", "extra_large", "extra_extra_large"]
          },
          letter_height_inches: { type: "number" },
          installation_height_feet: { type: "number" },
          raceway_length_feet: { type: "number" },
          wall_material: { type: "string", enum: ["eifs", "stucco", "brick", "concrete", "metal", "wood", "glass", "drywall"] },
          parapet: { type: "boolean" },
          poor_electrical_access: { type: "boolean" },
          thick_hollow_walls: { type: "boolean" },
          escort_required: { type: "boolean" },
          badging_checkin: { type: "boolean" },
          after_hours_weekend: { type: "boolean" },
          set_hours_installation: { type: "boolean" },
          poor_site_access: { type: "boolean" }
        },
        required: ["installation_type", "qty_letters"]
      }
    },
    notes: { type: "string" }
  }
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rawText, mockup_urls } = await req.json().catch(() => ({}));
    const text = typeof rawText === 'string' ? rawText.trim() : '';
    const urls = Array.isArray(mockup_urls) ? mockup_urls.filter((u) => typeof u === 'string' && u) : [];
    const hasText = text.length > 0;
    const hasImages = urls.length > 0;

    if (!hasText && !hasImages) {
      return Response.json({ error: 'rawText or mockup_urls required' }, { status: 400 });
    }

    const imageInstructions = hasImages ? `
You've also been provided with ${urls.length === 1 ? "a sign mockup image" : `${urls.length} sign mockup images`}. Carefully analyze:
- Count the actual letters/characters in each mockup (don't include spaces in count)
- Estimate letter height proportions if a height isn't stated
- Identify if the sign appears to be flush-mounted, halo-lit (backlit glow), raceway-mounted (visible horizontal mounting bar behind letters), or dimensional (flat cut, non-illuminated)
- Note wall material if visible (EIFS, brick, stucco, glass, metal, etc.)
- Flag any visible site conditions (parapet wall, height obstacles, signs of difficult access)
- If multiple distinct signs appear, create a separate line item for each
${hasText ? "Use the written notes below as the primary source of truth; the image fills in gaps." : "Generate items based on what you observe in the image(s)."}` : "";

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sign-installation estimator. Parse the input into structured installation line items.
${imageInstructions}

Map installation_type:
- "flush mount" or "face-lit" → flush_mount
- "halo lit" / "backlit" / "reverse channel" → halo_lit
- "raceway mounted" or "raceway" → raceway
- "dimensional" / "flat cut" / "pvc letters" → dimensional_lettering

Map letter_size from letter_height_inches:
- ≤6" → extra_small
- 7–12" → small
- 13–24" → medium
- 25–36" → large
- 37–60" → extra_large
- >60" → extra_extra_large

Defaults if unspecified: installation_height_feet=12, wall_material="eifs", letter_height_inches=24.
Set condition booleans (parapet, after_hours_weekend, escort_required, badging_checkin, poor_electrical_access, poor_site_access, set_hours_installation, thick_hollow_walls) to true ONLY if clearly mentioned or visible. For raceway items also set raceway_length_feet.

${hasText ? `JOB DESCRIPTION / NOTES:
${text}` : "(No written notes — rely entirely on the mockup image(s).)"}`,
      ...(hasImages ? { file_urls: urls } : {}),
      response_json_schema: SCHEMA
    });

    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}