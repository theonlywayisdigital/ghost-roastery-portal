import { createServerClient } from "@/lib/supabase";

/**
 * Recalculate committed_stock_kg on roasted_stock based on all active standing orders.
 * Call this after creating, updating, or deleting a standing order.
 */
export async function updateCommittedStock(
  supabase: ReturnType<typeof createServerClient>,
  roasterId: string
) {
  // Fetch all active standing orders for this roaster
  const { data: orders } = await supabase
    .from("standing_orders")
    .select("items")
    .eq("roaster_id", roasterId)
    .eq("status", "active");

  if (!orders || orders.length === 0) {
    // Reset all committed stock to 0
    await supabase
      .from("roasted_stock")
      .update({ committed_stock_kg: 0 })
      .eq("roaster_id", roasterId);
    return;
  }

  // Collect all product IDs and variant IDs from items
  const productIdSet = new Set<string>();
  const variantIdSet = new Set<string>();
  for (const so of orders) {
    const items = so.items as { productId: string; variantId?: string }[];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      productIdSet.add(item.productId);
      if (item.variantId) variantIdSet.add(item.variantId);
    }
  }

  const productIds = Array.from(productIdSet);
  if (productIds.length === 0) {
    await supabase
      .from("roasted_stock")
      .update({ committed_stock_kg: 0 })
      .eq("roaster_id", roasterId);
    return;
  }

  // Fetch product data
  const { data: products } = await supabase
    .from("products")
    .select("id, roasted_stock_id, weight_grams, is_blend")
    .eq("roaster_id", roasterId)
    .in("id", productIds);

  const productMap = new Map(
    (products || []).map((p) => [p.id, p])
  );

  // Fetch blend components
  const blendProductIds = (products || [])
    .filter((p) => p.is_blend)
    .map((p) => p.id);
  const blendComponentMap: Record<
    string,
    { roasted_stock_id: string; percentage: number }[]
  > = {};
  if (blendProductIds.length > 0) {
    const { data: components } = await supabase
      .from("blend_components")
      .select("product_id, roasted_stock_id, percentage")
      .in("product_id", blendProductIds);
    if (components) {
      for (const c of components) {
        if (!blendComponentMap[c.product_id])
          blendComponentMap[c.product_id] = [];
        blendComponentMap[c.product_id].push({
          roasted_stock_id: c.roasted_stock_id,
          percentage: Number(c.percentage),
        });
      }
    }
  }

  // Fetch variant weights
  let variantWeightMap: Record<string, number> = {};
  if (variantIdSet.size > 0) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, weight_grams")
      .in("id", Array.from(variantIdSet));
    if (variants) {
      variantWeightMap = Object.fromEntries(
        variants.map((v) => [v.id, v.weight_grams || 0])
      );
    }
  }

  // Aggregate committed KG per roasted stock
  const committedByStock: Record<string, number> = {};
  for (const so of orders) {
    const items = so.items as {
      productId: string;
      variantId?: string;
      quantity: number;
    }[];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const weightGrams = item.variantId
        ? variantWeightMap[item.variantId] || product.weight_grams || 0
        : product.weight_grams || 0;
      const kg = (weightGrams / 1000) * item.quantity;

      if (product.is_blend && blendComponentMap[product.id]) {
        for (const comp of blendComponentMap[product.id]) {
          const compKg = kg * (comp.percentage / 100);
          committedByStock[comp.roasted_stock_id] =
            (committedByStock[comp.roasted_stock_id] || 0) + compKg;
        }
      } else if (product.roasted_stock_id) {
        committedByStock[product.roasted_stock_id] =
          (committedByStock[product.roasted_stock_id] || 0) + kg;
      }
    }
  }

  // Reset all to 0 first
  await supabase
    .from("roasted_stock")
    .update({ committed_stock_kg: 0 })
    .eq("roaster_id", roasterId);

  // Update specific stock items
  for (const [stockId, kg] of Object.entries(committedByStock)) {
    await supabase
      .from("roasted_stock")
      .update({ committed_stock_kg: Math.round(kg * 1000) / 1000 })
      .eq("id", stockId);
  }
}

/**
 * Advance next_delivery_date based on frequency after a successful generation.
 */
export function getNextDeliveryDate(
  currentDate: string,
  frequency: string
): string {
  const d = new Date(currentDate);
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "fortnightly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}
