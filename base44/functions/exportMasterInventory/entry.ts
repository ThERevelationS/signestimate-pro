import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const MIGRATION_SECRET = '8hM4pRz_6Akv1cQYt7u2JXnL5sB0eF9dK3wV';
const PROJECT_ENTITIES = [
  'Project',
  'FoundationProject',
  'ChannelLetterInstallation',
  'VinylProject',
  'CNCProject',
  'LaserProject',
  'MetalProject',
  'BrickStoneProject',
  'MaintenanceProject',
  'AllInOneEstimate',
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
  const {
    id,
    created_date,
    updated_date,
    created_by_id,
    created_by,
    is_sample,
    ...data
  } = row || {};
  return {
    source_id: id,
    source_created_date: created_date || null,
    source_updated_date: updated_date || null,
    data,
  };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.secret !== MIGRATION_SECRET) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    const out: Record<string, any[]> = {};
    for (const entityName of PROJECT_ENTITIES) {
      const rows = await listAll(base44.asServiceRole.entities[entityName]);
      out[entityName] = rows.map(clean);
    }

    const counts = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]));
    return Response.json({ success: true, counts, entities: out });
  } catch (error) {
    console.error('legacy history export error:', error);
    return Response.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
});
