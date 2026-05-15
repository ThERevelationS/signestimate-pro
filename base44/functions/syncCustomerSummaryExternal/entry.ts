// Push a CustomerSummary update to the external CCS database so the other
// system can read/update the client. Best-effort — failures are returned
// as { ok:false } and the frontend swallows them.
//
// Uses the same external Base44 app the CCS lookup uses (searchExternalClients).

import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only push when the user has the CCS lookup enabled — same gate as the
    // CCS search function. Other users still get their local CustomerSummary
    // (the frontend creates it before calling this).
    if (!user.enable_ccs_database_lookup) {
      return Response.json({ ok: false, skipped: 'ccs_lookup_disabled' });
    }

    const { client_name, summary_id, linked_project, estimate_number } = await req.json();
    if (!client_name) {
      return Response.json({ ok: false, error: 'client_name required' }, { status: 400 });
    }

    const externalClient = createClient({
      appId: "68dfcc5e57bbbc35387da97c",
      serviceToken: "570bd85bbd4248b396864e2c628a6028"
    });

    // Try to find an existing customer-summary record in the external DB
    // keyed by client_name. If the external entity doesn't exist or the
    // shape differs, we just log and exit cleanly so the local save still wins.
    let existing = [];
    try {
      existing = await externalClient.asServiceRole.entities.CustomerSummary.filter(
        { client_name },
        '-updated_date',
        5
      );
    } catch (e) {
      console.warn('External CustomerSummary lookup failed:', e?.message || e);
      return Response.json({ ok: false, skipped: 'external_lookup_failed', detail: e?.message });
    }

    const payload = {
      summary_name: client_name,
      client_name,
      estimate_number: estimate_number || '',
      source_summary_id: summary_id,
      last_linked_project: linked_project || null,
      last_synced_at: new Date().toISOString(),
    };

    try {
      if (existing && existing.length > 0) {
        await externalClient.asServiceRole.entities.CustomerSummary.update(existing[0].id, payload);
        return Response.json({ ok: true, mode: 'updated', external_id: existing[0].id });
      }
      const created = await externalClient.asServiceRole.entities.CustomerSummary.create(payload);
      return Response.json({ ok: true, mode: 'created', external_id: created?.id });
    } catch (e) {
      console.warn('External CustomerSummary write failed:', e?.message || e);
      return Response.json({ ok: false, skipped: 'external_write_failed', detail: e?.message });
    }
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});