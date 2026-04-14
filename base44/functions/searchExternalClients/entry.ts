import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.enable_ccs_database_lookup) {
      return Response.json({ error: 'Unauthorized: CCS database lookup not enabled for this user' }, { status: 401 });
    }

    const { search } = await req.json();
    if (!search || search.length < 2) return Response.json({ results: [] });

    const externalClient = createClient({
      appId: "68dfcc5e57bbbc35387da97c",
      headers: {
        "api_key": "570bd85bbd4248b396864e2c628a6028"
      }
    });

    // Searching "SalesPipeline" entity. If it fails, fallback to empty results.
    let records = [];
    try {
        records = await externalClient.entities.SalesPipeline.list();
    } catch (e) {
        console.error("Error fetching from SalesPipeline:", e);
        try {
            // Try another common name just in case
            records = await externalClient.entities.Project.list();
        } catch (e2) {
            console.error("Error fetching from Project:", e2);
        }
    }

    const lowerSearch = search.toLowerCase();
    const results = records.filter(r => {
      const clientName = (r.client_name || r.client || r.name || '').toLowerCase();
      const projectName = (r.project_name || r.description || '').toLowerCase();
      return clientName.includes(lowerSearch) || projectName.includes(lowerSearch);
    }).slice(0, 10).map(r => ({
      client_name: r.client_name || r.client || r.name || '',
      project_name: r.project_name || r.description || '',
      estimate_number: r.estimate_number || r.id || '',
      hyperlink: r.reference_link || r.hyperlink || r.link || ''
    }));

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});