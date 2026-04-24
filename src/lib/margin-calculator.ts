/**
 * Margin Calculator — Pure functions for markup-based pricing.
 *
 * Formula chain:
 *   roastedCostPerKg = greenCostPerKg / (1 - weightLossPct / 100)
 *   variantCost      = roastedCostPerKg * (weightGrams / 1000)
 *   retailPrice      = mround(variantCost * multiplier, retailRounding)
 *   wholesalePrice   = mround(retailPrice * (1 - wholesaleDiscountPct / 100), wholesaleRounding)
 */

// ── Types ──

export interface MarginSettings {
  markup_multiplier: number;        // e.g. 3.5
  wholesale_discount_pct: number;   // e.g. 35
  retail_rounding: number;          // e.g. 0.05
  wholesale_rounding: number;       // e.g. 0.05
  default_weight_loss_pct: number;  // fallback loss %
}

export interface BlendComponentInput {
  green_cost_per_kg: number | null;
  weight_loss_pct: number | null;
  percentage: number; // 0–100
}

export interface VariantCostInput {
  weight_grams: number;
  roasted_cost_per_kg: number;
}

export interface MarginSuggestion {
  variant_cost: number;
  suggested_retail: number;
  suggested_wholesale: number;
  retail_margin_pct: number;
  wholesale_margin_pct: number;
}

// ── Pure Functions ──

/**
 * MROUND: round to the nearest increment.
 * If increment <= 0.01, returns exact pence (2 decimal places).
 */
export function mround(value: number, increment: number): number {
  if (increment <= 0.01) {
    return Math.round(value * 100) / 100;
  }
  return Math.round(value / increment) * increment;
}

/**
 * Roasted cost per kg from green cost and weight loss.
 * roastedCostPerKg = greenCostPerKg / (1 - weightLossPct / 100)
 */
export function computeRoastedCostPerKg(
  greenCostPerKg: number,
  weightLossPct: number
): number {
  const factor = 1 - weightLossPct / 100;
  if (factor <= 0) return 0;
  return greenCostPerKg / factor;
}

/**
 * Blended roasted cost per kg for multi-origin blends.
 * Weighted average of each component's roasted cost, by blend percentage.
 */
export function computeBlendedCostPerKg(
  components: BlendComponentInput[],
  defaultWeightLossPct: number
): number | null {
  if (components.length === 0) return null;

  let totalCost = 0;
  let totalPct = 0;

  for (const c of components) {
    if (c.green_cost_per_kg == null || c.green_cost_per_kg <= 0) return null;
    const loss = c.weight_loss_pct ?? defaultWeightLossPct;
    const roastedCost = computeRoastedCostPerKg(c.green_cost_per_kg, loss);
    totalCost += roastedCost * (c.percentage / 100);
    totalPct += c.percentage;
  }

  if (totalPct <= 0) return null;
  // Normalise if percentages don't sum to 100
  return totalCost * (100 / totalPct);
}

/**
 * Cost for a single variant based on weight and roasted cost per kg.
 */
export function computeVariantCost(input: VariantCostInput): number {
  return input.roasted_cost_per_kg * (input.weight_grams / 1000);
}

/**
 * Full margin suggestion for a variant.
 */
export function computeMarginSuggestion(
  variantCost: number,
  settings: MarginSettings,
  multiplierOverride?: number | null
): MarginSuggestion {
  const multiplier = multiplierOverride ?? settings.markup_multiplier;

  const rawRetail = variantCost * multiplier;
  const suggested_retail = mround(rawRetail, settings.retail_rounding);

  const rawWholesale = suggested_retail * (1 - settings.wholesale_discount_pct / 100);
  const suggested_wholesale = mround(rawWholesale, settings.wholesale_rounding);

  const retail_margin_pct =
    suggested_retail > 0
      ? ((suggested_retail - variantCost) / suggested_retail) * 100
      : 0;

  const wholesale_margin_pct =
    suggested_wholesale > 0
      ? ((suggested_wholesale - variantCost) / suggested_wholesale) * 100
      : 0;

  return {
    variant_cost: Math.round(variantCost * 100) / 100,
    suggested_retail,
    suggested_wholesale,
    retail_margin_pct: Math.round(retail_margin_pct * 10) / 10,
    wholesale_margin_pct: Math.round(wholesale_margin_pct * 10) / 10,
  };
}

/**
 * Format a currency amount using the roaster's currency code.
 * Falls back to GBP if no currency provided.
 */
export function formatCurrency(amount: number, currency?: string | null): string {
  const code = currency || "GBP";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unknown currency codes
    return `${code} ${amount.toFixed(2)}`;
  }
}
