Deno.serve(() =>
  Response.json(
    { success: false, error: "Master Inventory migration is complete; this temporary export endpoint is disabled." },
    { status: 410 }
  )
);
