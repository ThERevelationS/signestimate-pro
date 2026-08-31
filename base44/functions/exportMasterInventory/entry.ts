import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const MIGRATION_SECRET = 'Z9s6uQ1fJ8vN4xB2mK7cH3rT5pL0wD_e';
const CATALOGS = [
  'FoundationInventory',
  'ChannelLetterInstallInventory',
  'ChannelLetterInstallEquipment',
];

async function listAll(entity: any) {
  const rows: any[] = [];
  const limit = 500;
  let skip = 0;
  while (true) {
    const batch = await entity.list(null, limit, skip);
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < limit) break;
    skip += batch.length;
  }
  return rows;
}

function clean(row: any) {
  const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...data } = row || {};
  return { source_id: id, data };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.secret !== MIGRATION_SECRET) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const base44 = createClientFromRequest(req);
    const entities: Record<string, any[]> = {};
    for (const name of CATALOGS) {
      entities[name] = (await listAll(base44.asServiceRole.entities[name])).map(clean);
    }
    return Response.json({
      success: true,
      counts: Object.fromEntries(Object.entries(entities).map(([k, v]) => [k, v.length])),
      entities,
    });
  } catch (error) {
    console.error('reference export error:', error);
    return Response.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
});
