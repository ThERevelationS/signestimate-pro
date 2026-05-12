import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Refreshes the current average gasoline AND diesel prices for the Cincinnati, OH area
 * (where shop "417 Northland Blvd" is located) and stores them in the Settings entity
 * under keys:
 *   - install_fuel_price_per_gallon          (gasoline, legacy key kept for back-compat)
 *   - install_gasoline_price_per_gallon      (gasoline, explicit)
 *   - install_diesel_price_per_gallon        (diesel)
 *
 * Triggered daily by a scheduled automation. Admin-only when called directly.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: "What are today's current average regular unleaded GASOLINE and DIESEL prices per gallon in Cincinnati, Ohio (45246 area, near 417 Northland Blvd)? Use AAA Gas Prices, GasBuddy, or similar sources. Return only numeric values in USD as decimals (e.g. 3.45).",
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          gasoline_price_per_gallon: { type: "number", description: "Current average regular gasoline price in USD per gallon" },
          diesel_price_per_gallon: { type: "number", description: "Current average diesel price in USD per gallon" },
          source: { type: "string", description: "Where this price came from (AAA, GasBuddy, etc.)" },
          as_of_date: { type: "string", description: "Date the price was reported (YYYY-MM-DD)" }
        },
        required: ["gasoline_price_per_gallon", "diesel_price_per_gallon"]
      }
    });

    const gas = parseFloat(result?.gasoline_price_per_gallon);
    const diesel = parseFloat(result?.diesel_price_per_gallon);

    const valid = (p) => p && !isNaN(p) && p >= 1 && p <= 15;
    if (!valid(gas) || !valid(diesel)) {
      console.error("Invalid prices returned from LLM:", result);
      return Response.json({ error: "Could not fetch valid fuel prices", llm_result: result }, { status: 502 });
    }

    const stamp = `Auto-refreshed daily. Last updated: ${new Date().toISOString()}. Source: ${result?.source || 'web'}.`;

    const upsert = async (name, value, description) => {
      const existing = await base44.asServiceRole.entities.Settings.filter({ setting_name: name });
      const data = {
        setting_name: name,
        setting_value: value.toFixed(3),
        setting_type: 'number',
        category: 'install_shop_travel',
        description,
      };
      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.Settings.update(existing[0].id, data);
      } else {
        await base44.asServiceRole.entities.Settings.create(data);
      }
    };

    await Promise.all([
      upsert('install_gasoline_price_per_gallon', gas, `Gasoline. ${stamp}`),
      upsert('install_diesel_price_per_gallon', diesel, `Diesel. ${stamp}`),
      // Back-compat with the original single-fuel key
      upsert('install_fuel_price_per_gallon', gas, `Gasoline (legacy key). ${stamp}`),
    ]);

    return Response.json({
      success: true,
      gasoline_price_per_gallon: gas,
      diesel_price_per_gallon: diesel,
      source: result?.source,
      as_of_date: result?.as_of_date,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("refreshFuelPrice error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});