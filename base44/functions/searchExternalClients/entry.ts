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

    // Make it safe for regex characters
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let records = [];
    try {
        records = await externalClient.asServiceRole.entities.WorkOrder.filter(
            { client_name: { $regex: escapedSearch, $options: "i" } },
            '-created_date', 
            15
        );
    } catch (e) {
        console.error("Error fetching from WorkOrder:", e);
        return Response.json({ error: e.message });
    }

    // Deduplicate results
    const uniqueResults = [];
    const seen = new Set();

    for (const r of records) {
        let clientName = r.client_name || '';
        let projectName = '';
        
        // Some records have the format "Client Name - Project Name"
        if (clientName.includes(' - ')) {
            const parts = clientName.split(' - ');
            clientName = parts[0].trim();
            projectName = parts.slice(1).join(' - ').trim();
        }

        const estimateNumber = r.corbridge_invoice_number || '';
        
        const key = `${clientName}-${projectName}-${estimateNumber}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueResults.push({
                client_name: clientName,
                project_name: projectName,
                estimate_number: estimateNumber,
                hyperlink: r.google_drive_folder_url || r.corbridge_link || r.hyperlink || ''
            });
            if (uniqueResults.length >= 15) break;
        }
    }

    return Response.json({ results: uniqueResults });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});