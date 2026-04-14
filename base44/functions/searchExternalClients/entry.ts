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
      serviceToken: "570bd85bbd4248b396864e2c628a6028"
    });

    let records = [];
    try {
        records = await externalClient.asServiceRole.entities.WorkOrder.list('-created_date', 100);
    } catch (e) {
        console.error("Error fetching from WorkOrder:", e);
        return Response.json({ error: e.message });
    }

    const searchLower = search.toLowerCase();
    const filtered = records.filter(r => {
        return Object.values(r).some(v => 
            typeof v === 'string' && v.toLowerCase().includes(searchLower)
        );
    });

    // Deduplicate results
    const uniqueResults = [];
    const seen = new Set();

    for (const r of filtered) {
        const clientName = r.client_name || r.customer_name || r.company_name || r.name || r.requestor_name || r.vendor || '';
        const projectName = r.project_name || r.description || r.title || r.job_name || '';
        const estimateNumber = r.estimate_number || r.work_order_id || r.id || '';
        
        const key = `${clientName}-${projectName}-${estimateNumber}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueResults.push({
                client_name: clientName,
                project_name: projectName,
                estimate_number: estimateNumber,
                hyperlink: r.hyperlink || ''
            });
            if (uniqueResults.length >= 15) break;
        }
    }

    return Response.json({ results: uniqueResults });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});