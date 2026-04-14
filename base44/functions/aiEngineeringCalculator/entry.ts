import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const prompt = `You are an expert structural engineer specializing in the sign industry. 
Based on the following criteria, calculate estimated wind loads, and recommend foundation sizes and pole sizes. 
Criteria provided by the user:
- Sign Size: ${body.signSize || 'Not provided'}
- Height to bottom of sign: ${body.heightToBottom || 'Not provided'}
- Soil Type: ${body.soilType || 'Not provided'}
- Sign Weight: ${body.weight || 'Not provided'}
- Required Pole Size: ${body.requiredPoleSize || 'Not provided'}
- Foundation Type Wanted: ${body.foundationType || 'Not provided'}
- Qty of Poles: ${body.qtyPoles || 'Not provided'}
- Additional Info: ${body.additionalInfo || 'None'}

Provide an EXTREMELY CONCISE, highly professional breakdown. Provide ONLY the recommended foundation size, pole size, estimated wind loads, and recommended concrete mix type/strength in a short, 4-bullet list. DO NOT write any introductory or concluding sentences. DO NOT explain the math. KEEP IT UNDER 50 WORDS TOTAL.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      model: 'claude_sonnet_4_6',
      file_urls: body.documentUrl ? [body.documentUrl] : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          recommendation: { type: "string", description: "The concise, 3-bullet list recommendation" },
          foundation_type: { type: "string", enum: ["spread_foot", "pillar"] },
          length_inches: { type: "number" },
          width_inches: { type: "number" },
          depth_inches: { type: "number" },
          diameter: { type: "number" }
        }
      }
    });

    return Response.json({ recommendation: result.recommendation || result?.response?.recommendation || JSON.stringify(result), ai_engineering_data: result.response || result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});