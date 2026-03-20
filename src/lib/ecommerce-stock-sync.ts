import { createServerClient } from "@/lib/supabase";

/**
 * Push updated stock quantities to all connected ecommerce channels
 * for products linked to a given roasted stock record.
 *
 * Call this after any stock change (order deduction, cancellation return,
 * manual adjustment, roast addition) to keep all channels in sync.
 */
export async function pushStockToChannels(
  roasterId: string,
  roastedStockId: string
): Promise<void> {
  const supabase = createServerClient();

  // Get current stock level
  const { data: stock } = await supabase
    .from("roasted_stock")
    .select("current_stock_kg")
    .eq("id", roastedStockId)
    .single();

  if (!stock) return;

  const stockKg = stock.current_stock_kg || 0;

  // Find all channel mappings linked to this roasted stock
  const { data: mappings } = await supabase
    .from("product_channel_mappings")
    .select(
      `
      id,
      connection_id,
      external_product_id,
      external_variant_ids,
      product_id,
      ecommerce_connections:connection_id (
        id, provider, store_url, access_token, api_secret, is_active, sync_stock
      )
    `
    )
    .eq("roaster_id", roasterId)
    .eq("roasted_stock_id", roastedStockId);

  if (!mappings || mappings.length === 0) return;

  // Get variant weight info for calculating unit quantities
  const productIds = Array.from(
    new Set(mappings.map((m) => m.product_id))
  );

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id, weight_grams, retail_stock_count, track_stock")
    .in("product_id", productIds);

  for (const mapping of mappings) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = mapping.ecommerce_connections as any;
    if (!conn || !conn.is_active || !conn.sync_stock) continue;

    const externalVariantMap =
      (mapping.external_variant_ids as Record<string, string>) || {};

    // For each ghost variant → external variant, calculate available units
    for (const [ghostVariantId, externalVariantId] of Object.entries(
      externalVariantMap
    )) {
      const variant = variants?.find((v) => v.id === ghostVariantId);
      if (!variant) continue;

      const weightGrams = variant.weight_grams || 250;
      const availableUnits = Math.floor((stockKg * 1000) / weightGrams);

      try {
        if (conn.provider === "shopify") {
          await pushStockToShopify(
            conn,
            externalVariantId,
            availableUnits
          );
        } else if (conn.provider === "woocommerce") {
          await pushStockToWooCommerce(
            conn,
            mapping.external_product_id,
            externalVariantId,
            availableUnits
          );
        }
      } catch (err) {
        console.error(
          `[stock-sync] Failed to push stock to ${conn.provider} (variant ${externalVariantId}):`,
          err
        );
      }
    }
  }

  // Update last_stock_sync_at on connections
  const connectionIds = Array.from(
    new Set(
      mappings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((m) => (m.ecommerce_connections as any)?.sync_stock)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m) => (m.ecommerce_connections as any)?.id)
        .filter(Boolean)
    )
  );

  if (connectionIds.length > 0) {
    await supabase
      .from("ecommerce_connections")
      .update({ last_stock_sync_at: new Date().toISOString() })
      .in("id", connectionIds);
  }
}

// ─── Shopify stock push ──────────────────────────────────────────────

async function pushStockToShopify(
  conn: { store_url: string; access_token: string },
  variantId: string,
  quantity: number
): Promise<void> {
  // First, get the inventory_item_id for this variant
  const variantRes = await fetch(
    `https://${conn.store_url}/admin/api/2024-01/variants/${variantId}.json`,
    {
      headers: {
        "X-Shopify-Access-Token": conn.access_token,
      },
    }
  );

  if (!variantRes.ok) return;
  const variantData = await variantRes.json();
  const inventoryItemId = variantData.variant?.inventory_item_id;
  if (!inventoryItemId) return;

  // Get the location ID (use first active location)
  const locRes = await fetch(
    `https://${conn.store_url}/admin/api/2024-01/locations.json`,
    {
      headers: {
        "X-Shopify-Access-Token": conn.access_token,
      },
    }
  );

  if (!locRes.ok) return;
  const locData = await locRes.json();
  const locationId = locData.locations?.[0]?.id;
  if (!locationId) return;

  // Set inventory level
  await fetch(
    `https://${conn.store_url}/admin/api/2024-01/inventory_levels/set.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": conn.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: quantity,
      }),
    }
  );
}

// ─── WooCommerce stock push ──────────────────────────────────────────

async function pushStockToWooCommerce(
  conn: { store_url: string; access_token: string; api_secret: string },
  externalProductId: string,
  externalVariantId: string,
  quantity: number
): Promise<void> {
  const authHeader = Buffer.from(
    `${conn.access_token}:${conn.api_secret}`
  ).toString("base64");

  // If variant ID equals product ID, it's a simple product
  if (externalVariantId === externalProductId) {
    await fetch(
      `https://${conn.store_url}/wp-json/wc/v3/products/${externalProductId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stock_quantity: quantity,
          manage_stock: true,
        }),
      }
    );
  } else {
    await fetch(
      `https://${conn.store_url}/wp-json/wc/v3/products/${externalProductId}/variations/${externalVariantId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stock_quantity: quantity,
          manage_stock: true,
        }),
      }
    );
  }
}
