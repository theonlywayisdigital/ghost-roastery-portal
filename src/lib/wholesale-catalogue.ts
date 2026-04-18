import { createServerClient } from "@/lib/supabase";

/**
 * Filter products by per-buyer access rules.
 *
 * Products with NO rows in product_buyer_access are visible to all approved buyers.
 * Products WITH rows are only visible if the buyer's wholesale_access_id is listed.
 */
export async function filterProductsByBuyerAccess<
  T extends { id: string },
>(
  products: T[],
  roasterId: string,
  wholesaleAccessId: string,
): Promise<T[]> {
  if (!products.length) return products;

  const supabase = createServerClient();
  const { data: accessRows } = await supabase
    .from("product_buyer_access")
    .select("product_id, wholesale_access_id")
    .eq("roaster_id", roasterId);

  if (!accessRows?.length) return products;

  // Build a set of product IDs that have any access restrictions
  const restrictedProducts = new Set<string>();
  // Build a set of product IDs this buyer is allowed to see
  const buyerAllowed = new Set<string>();

  for (const row of accessRows) {
    restrictedProducts.add(row.product_id);
    if (row.wholesale_access_id === wholesaleAccessId) {
      buyerAllowed.add(row.product_id);
    }
  }

  return products.filter((p) => {
    if (!restrictedProducts.has(p.id)) return true; // No restrictions — visible to all
    return buyerAllowed.has(p.id); // Restricted — only if buyer is listed
  });
}

/**
 * Apply per-buyer custom pricing to product variants.
 *
 * For each variant, if product_buyer_pricing has a row for this buyer,
 * the variant's wholesale_price is replaced with the custom_price.
 */
export async function applyBuyerPricing<
  T extends {
    id: string;
    product_variants?: { id: string; wholesale_price: number | null }[];
  },
>(
  products: T[],
  roasterId: string,
  wholesaleAccessId: string,
): Promise<T[]> {
  if (!products.length) return products;

  const supabase = createServerClient();
  const { data: pricingRows } = await supabase
    .from("product_buyer_pricing")
    .select("variant_id, custom_price")
    .eq("roaster_id", roasterId)
    .eq("wholesale_access_id", wholesaleAccessId);

  if (!pricingRows?.length) return products;

  const priceMap = new Map<string, number>();
  for (const row of pricingRows) {
    priceMap.set(row.variant_id, Number(row.custom_price));
  }

  return products.map((p) => {
    if (!p.product_variants?.length) return p;
    return {
      ...p,
      product_variants: p.product_variants.map((v) => {
        const customPrice = priceMap.get(v.id);
        if (customPrice !== undefined) {
          return { ...v, wholesale_price: customPrice };
        }
        return v;
      }),
    };
  });
}
