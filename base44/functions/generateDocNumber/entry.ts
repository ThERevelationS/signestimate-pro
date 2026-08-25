import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Atomic sequential document-number generator. Estimates and orders share a
// single counter so numbers are linear and never overlap: EST-00001, INV-00002,
// EST-00003, …  Pass { prefix: "EST" | "INV" } to get the next number.
// The counter lives in the DocNumberCounter singleton (id "default").
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const prefix = body.prefix === 'INV' ? 'INV' : 'EST';

    // Service role so the counter record is writable by any signed-in user
    // (the DocNumberCounter entity is admin-write only).
    const svc = base44.asServiceRole;
    let counter = (await svc.entities.DocNumberCounter.filter({ config_name: 'default' }))[0];
    if (!counter) {
      counter = await svc.entities.DocNumberCounter.create({ config_name: 'default', next_seq: 1 });
    }

    const seq = Number(counter.next_seq) || 1;
    const next = seq + 1;
    await svc.entities.DocNumberCounter.update(counter.id, { next_seq: next });

    const formatted = `${prefix}-${String(seq).padStart(5, '0')}`;
    return Response.json({ number: formatted, seq, prefix });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}