import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Refreshes the current average regular gas price for the Cincinnati, OH area
 * (where shop "417 Northland Blvd" is located) and stores it in the Settings entity
 * under key "install_fuel_price_per_gallon".
 *
 * Triggered daily by a scheduled automation. Admin-only when called directly.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    // Allow scheduled automation (no user context) OR an admin user
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Use InvokeLLM with web search to fetch today's average gas price
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: "What is today's current average regular unleaded gasoline price per gallon in Cincinnati, Ohio (45246 area, near 417 Northland Blvd)? Use AAA Gas Prices, GasBuddy, or similar sources. Return only the numeric value in USD as a decimal (e.g. 3.45).",
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          price_per_gallon: { type: "number", description: "Current average regular gas price in USD per gallon" },
          source: { type: "string", description: "Where this price came from (AAA, GasBuddy, etc.)" },
          as_of_date: { type: "string", description: "Date the price was reported (YYYY-MM-DD)" }
        },
        required: ["price_per_gallon"]
      }
    });

    const price = parseFloat(result?.price_per_gallon);
    if (!price || isNaN(price) || price < 1 || price > 15) {
      console.error("Invalid price returned from LLM:", result);
      return Response.json({ error: "Could not fetch a valid fuel price", llm_result: result }, { status: 502 });
    }

    // Upsert into Settings entity
    const existing = await base44.asServiceRole.entities.Settings.filter({ setting_name: 'install_fuel_price_per_gallon' });
    const data = {
      setting_name: 'install_fuel_price_per_gallon',
      setting_value: price.toFixed(3),
      setting_type: 'number',
      category: 'install_shop_travel',
      description: `Auto-refreshed daily. Last updated: ${new Date().toISOString()}. Source: ${result?.source || 'web'}.`
    };

    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.Settings.update(existing[0].id, data);
    } else {
      await base44.asServiceRole.entities.Settings.create(data);
    }

    return Response.json({
      success: true,
      price_per_gallon: price,
      source: result?.source,
      as_of_date: result?.as_of_date,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("refreshFuelPrice error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});