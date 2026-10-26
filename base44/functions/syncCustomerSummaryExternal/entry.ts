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
    // CCS search function. This field is admin-assigned only (it is write-locked
    // on the User entity), so a user cannot grant it to themselves. Other users
    // still get their local CustomerSummary (the frontend creates it first).
    if (!user.enable_ccs_database_lookup) {
      return Response.json({ ok: false, skipped: 'ccs_lookup_disabled' });
    }

    const { client_name, summary_id, linked_project, estimate_number } = await req.json();
    if (!client_name || !summary_id) {
      return Response.json({ ok: false, error: 'client_name and summary_id required' }, { status: 400 });
    }

    // Authorize the specific record, not just the caller: the user-scoped client
    // applies the entity's RLS, so only the summary's owner (or an admin) gets a
    // record back. The external write is keyed on the stored client_name rather
    // than the request body, so a caller cannot forge or overwrite another
    // client's record in the shared external database.
    let localSummary = null;
    try {
      localSummary = await base44.entities.CustomerSummary.get(summary_id);
    } catch (e) {
      localSummary = null;
    }
    if (!localSummary) {
      return Response.json({ ok: false, error: 'Forbidden: summary not owned by caller' }, { status: 403 });
    }

    const verifiedClientName = (localSummary.client_name || '').trim() || client_name;

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
        { client_name: verifiedClientName },
        '-updated_date',
        5
      );
    } catch (e) {
      console.warn('External CustomerSummary lookup failed:', e?.message || e);
      return Response.json({ ok: false, skipped: 'external_lookup_failed', detail: e?.message });
    }

    const payload = {
      summary_name: verifiedClientName,
      client_name: verifiedClientName,
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