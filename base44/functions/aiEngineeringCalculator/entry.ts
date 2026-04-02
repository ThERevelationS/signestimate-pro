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

Provide a VERY CONCISE, highly professional breakdown of the recommended foundation size, pole size, and estimated wind loads. MAXIMUM 3-4 SENTENCES or a short bulleted list. Do not explain the math or write long paragraphs. Do not use markdown headers.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      model: 'claude_sonnet_4_6',
    });

    return Response.json({ recommendation: result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});