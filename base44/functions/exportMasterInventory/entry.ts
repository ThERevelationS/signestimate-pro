import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const EXPORT_SECRET = 'UAipl41wZM1L33OeEYqWtJt7JKN7ER12rvhB1_JEy14';
const ALLOWED_ENTITIES = new Set([
  'DimensionalLetterMaterial',
  'VinylInventory',
  'SignLightingInventory',
  'SignHardwareInventory',
  'LaborServiceInventory',
  'SignPartsSuppliesInventory',
  'FoundationInventory',
  'Inventory',
  'ChannelLetterInstallInventory',
  'ChannelLetterInstallEquipment',
]);

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.secret !== EXPORT_SECRET) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const entityName = String(body?.entity || '');
    if (!ALLOWED_ENTITIES.has(entityName)) {
      return Response.json({ success: false, error: 'Unsupported entity' }, { status: 400 });
    }

    const limit = Math.min(Math.max(Number(body?.limit) || 500, 1), 500);
    const skip = Math.max(Number(body?.skip) || 0, 0);
    const base44 = createClientFromRequest(req);
    const rows = await base44.asServiceRole.entities[entityName].list(null, limit, skip);

    return Response.json({
      success: true,
      entity: entityName,
      skip,
      limit,
      count: Array.isArray(rows) ? rows.length : 0,
      rows: Array.isArray(rows) ? rows : [],
    });
  } catch (error) {
    console.error('exportMasterInventory error:', error);
    return Response.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
});