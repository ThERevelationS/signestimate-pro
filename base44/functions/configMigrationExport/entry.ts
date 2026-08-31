import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const MIGRATION_SECRET = 'rewhbP4aG6nyjgLpxFIuqv5NRZggfzkj6FeSn9s_pvI';

function stripSystemFields(row: any) {
  const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...data } = row || {};
  return data;
}

async function listAll(entity: any) {
  const out: any[] = [];
  const limit = 500;
  let skip = 0;
  while (true) {
    const batch = await entity.list(null, limit, skip);
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < limit) break;
    skip += batch.length;
  }
  return out;
}

function latestBy(rows: any[], keyFn: (row: any) => string) {
  const sorted = [...rows].sort((a, b) => {
    const ad = String(a?.updated_date || a?.created_date || '');
    const bd = String(b?.updated_date || b?.created_date || '');
    if (ad !== bd) return bd.localeCompare(ad);
    return String(b?.id || '').localeCompare(String(a?.id || ''));
  });
  const seen = new Set<string>();
  const out: any[] = [];
  for (const row of sorted) {
    const key = keyFn(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(stripSystemFields(row));
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.secret !== MIGRATION_SECRET) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    const dataset = String(body?.dataset || '');

    if (dataset === 'settings') {
      const raw = await listAll(base44.asServiceRole.entities.Settings);
      const rows = latestBy(raw, (r) => String(r?.setting_name || '').trim());
      return Response.json({ success: true, dataset, raw_count: raw.length, unique_count: rows.length, rows });
    }

    if (dataset === 'maintenance_action_rates') {
      const raw = await listAll(base44.asServiceRole.entities.MaintenanceActionRate);
      const rows = latestBy(raw, (r) => `${String(r?.sign_type || '').trim()}|${String(r?.action || '').trim()}`);
      return Response.json({ success: true, dataset, raw_count: raw.length, unique_count: rows.length, rows });
    }

    return Response.json({ success: false, error: 'Unsupported dataset' }, { status: 400 });
  } catch (error) {
    console.error('configMigrationExport error:', error);
    return Response.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
});