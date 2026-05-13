// Pure utility functions for applying tier markups + volume discounts to project costs.
// Does NOT mutate project entities — produces a marked-up summary breakdown.

/**
 * Get a tier's markup multiplier for a given category_key.
 * Falls back to 1.0 (no markup) if not configured.
 */
export function getMarkup(tier, categoryKey) {
  if (!tier || !tier.markups) return 1.0;
  const v = tier.markups[categoryKey];
  return typeof v === 'number' && v > 0 ? v : 1.0;
}

/**
 * Parse volume discount brackets from Settings records.
 * Returns array of {min, pct} sorted high-to-low so we can pick the highest qualifying bracket.
 */
export function parseVolumeDiscountBrackets(settings) {
  const get = (name) => {
    const s = settings.find(x => x.setting_name === name);
    return s ? parseFloat(s.setting_value) : null;
  };
  const brackets = [];
  for (let i = 1; i <= 4; i++) {
    const min = get(`volume_discount_bracket_${i}_min`);
    const pct = get(`volume_discount_bracket_${i}_pct`);
    if (min !== null && pct !== null) brackets.push({ min, pct });
  }
  return brackets.sort((a, b) => b.min - a.min);
}

/**
 * Parse the list of category keys eligible for volume discount.
 */
export function parseVolumeDiscountCategories(settings) {
  const s = settings.find(x => x.setting_name === 'volume_discount_applies_to');
  if (!s) return [];
  return s.setting_value.split(',').map(x => x.trim()).filter(Boolean);
}

/**
 * Given an eligible subtotal, find the highest qualifying volume discount %.
 */
export function getVolumeDiscountPct(eligibleSubtotal, brackets) {
  for (const b of brackets) {
    if (eligibleSubtotal >= b.min) return b.pct;
  }
  return 0;
}

/**
 * Apply tier markup + volume discount to a list of cost lines.
 *
 * @param {Array<{label, cost, category_key, module}>} lines
 * @param {Object} tier - MarkupTier record
 * @param {Object} settings - { brackets, eligibleCategoryKeys }
 * @returns {Object} { lines: [...withMarkupApplied], totals: {...} }
 */
export function applyMarkups(lines, tier, settings) {
  const { brackets = [], eligibleCategoryKeys = [] } = settings || {};

  // First pass: compute marked-up cost per line (no volume discount yet)
  const marked = lines.map(line => {
    const cost = Number(line.cost) || 0;
    const markup = getMarkup(tier, line.category_key);
    const markedCost = cost * markup;
    return {
      ...line,
      cost,
      markup_multiplier: markup,
      marked_up_cost: markedCost,
    };
  });

  // Compute eligible subtotal for volume discount
  const eligibleSubtotal = marked
    .filter(l => eligibleCategoryKeys.includes(l.category_key))
    .reduce((sum, l) => sum + l.marked_up_cost, 0);

  const volumeDiscountPct = getVolumeDiscountPct(eligibleSubtotal, brackets);
  const volumeDiscountFactor = 1 - (volumeDiscountPct / 100);

  // Second pass: apply volume discount only to eligible lines
  const finalLines = marked.map(line => {
    const isEligible = eligibleCategoryKeys.includes(line.category_key);
    const final = isEligible ? line.marked_up_cost * volumeDiscountFactor : line.marked_up_cost;
    return {
      ...line,
      volume_discount_applied: isEligible ? volumeDiscountPct : 0,
      final_cost: final,
    };
  });

  const rawSubtotal = finalLines.reduce((s, l) => s + l.cost, 0);
  const markedSubtotal = finalLines.reduce((s, l) => s + l.marked_up_cost, 0);
  const grandTotal = finalLines.reduce((s, l) => s + l.final_cost, 0);

  return {
    lines: finalLines,
    totals: {
      raw_subtotal: rawSubtotal,
      marked_subtotal: markedSubtotal,
      eligible_subtotal: eligibleSubtotal,
      volume_discount_pct: volumeDiscountPct,
      grand_total: grandTotal,
    },
  };
}