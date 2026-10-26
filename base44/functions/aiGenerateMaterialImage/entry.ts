import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Generates a product photo for a named installation material or hardware item
// on the Channel & Dimensional Letters materials list.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_name } = await req.json().catch(() => ({}));
    const name = typeof item_name === 'string' ? item_name.trim() : '';
    if (!name) return Response.json({ error: 'item_name required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt: `Photograph of "${name}" — a signage installation material or hardware item used by professional sign installers. Product is centered in the frame, full item clearly visible, neutral light background, professional product photography, sharp focus, no people, no text overlay.`
    });

    return Response.json({ url: result?.url || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}