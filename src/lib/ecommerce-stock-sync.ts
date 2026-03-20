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
        } else if (conn.provider === "squarespace") {
          await pushStockToSquarespace(
            conn,
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

// ─── Product sync outbound ────────────────────────────────────────────

/**
 * Push product data (title, description, images, variants, prices)
 * to all connected ecommerce channels for a given GR product.
 *
 * Call after product update to keep Shopify/WooCommerce listings in sync.
 * Updates last_pushed_at on each mapping to prevent inbound webhook loops.
 */
export async function pushProductToChannels(
  roasterId: string,
  productId: string
): Promise<void> {
  const supabase = createServerClient();

  // Fetch GR product data
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, description, image_url, retail_price, sku, status, weight_grams, unit"
    )
    .eq("id", productId)
    .eq("roaster_id", roasterId)
    .single();

  if (!product) return;

  // Fetch GR variants
  const { data: variants } = await supabase
    .from("product_variants")
    .select(
      "id, sku, retail_price, weight_grams, unit, is_active, sort_order"
    )
    .eq("product_id", productId)
    .eq("roaster_id", roasterId)
    .order("sort_order", { ascending: true });

  // Fetch all channel mappings for this product
  const { data: mappings } = await supabase
    .from("product_channel_mappings")
    .select(
      `
      id,
      connection_id,
      external_product_id,
      external_variant_ids,
      ecommerce_connections:connection_id (
        id, provider, store_url, access_token, api_secret, is_active
      )
    `
    )
    .eq("roaster_id", roasterId)
    .eq("product_id", productId);

  if (!mappings || mappings.length === 0) return;

  const now = new Date().toISOString();

  for (const mapping of mappings) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = mapping.ecommerce_connections as any;
    if (!conn || !conn.is_active) continue;

    const externalVariantMap =
      (mapping.external_variant_ids as Record<string, string>) || {};

    try {
      if (conn.provider === "shopify") {
        await pushProductToShopify(
          conn,
          mapping.external_product_id,
          product,
          variants || [],
          externalVariantMap
        );
      } else if (conn.provider === "woocommerce") {
        await pushProductToWooCommerce(
          conn,
          mapping.external_product_id,
          product,
          variants || [],
          externalVariantMap
        );
      } else if (conn.provider === "squarespace") {
        await pushProductToSquarespace(
          conn,
          mapping.external_product_id,
          product,
          variants || [],
          externalVariantMap
        );
      }

      // Update last_pushed_at for sync loop prevention
      await supabase
        .from("product_channel_mappings")
        .update({ last_pushed_at: now })
        .eq("id", mapping.id);
    } catch (err) {
      console.error(
        `[product-sync] Failed to push product to ${conn.provider} (${mapping.external_product_id}):`,
        err
      );
    }
  }
}

// ─── Shopify product push ─────────────────────────────────────────────

async function pushProductToShopify(
  conn: { store_url: string; access_token: string },
  externalProductId: string,
  product: {
    name: string;
    description: string | null;
    image_url: string | null;
    retail_price: number | null;
    sku: string | null;
    status: string;
    weight_grams: number | null;
    unit: string | null;
  },
  variants: {
    id: string;
    sku: string | null;
    retail_price: number | null;
    weight_grams: number | null;
    unit: string | null;
    is_active: boolean;
  }[],
  externalVariantMap: Record<string, string>
): Promise<void> {
  // Build Shopify variant updates
  const shopifyVariants: Record<string, unknown>[] = [];
  for (const [ghostId, extId] of Object.entries(externalVariantMap)) {
    const v = variants.find((vr) => vr.id === ghostId);
    if (!v) continue;
    shopifyVariants.push({
      id: parseInt(extId),
      price: v.retail_price?.toFixed(2) ?? product.retail_price?.toFixed(2) ?? "0.00",
      sku: v.sku || product.sku || undefined,
      weight: v.weight_grams ? v.weight_grams / 1000 : product.weight_grams ? product.weight_grams / 1000 : undefined,
      weight_unit: "kg",
    });
  }

  const payload: Record<string, unknown> = {
    product: {
      id: parseInt(externalProductId),
      title: product.name,
      body_html: product.description || "",
      status: product.status === "published" ? "active" : "draft",
      ...(shopifyVariants.length > 0 ? { variants: shopifyVariants } : {}),
      ...(product.image_url ? { images: [{ src: product.image_url }] } : {}),
    },
  };

  await fetch(
    `https://${conn.store_url}/admin/api/2024-01/products/${externalProductId}.json`,
    {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": conn.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
}

// ─── WooCommerce product push ─────────────────────────────────────────

async function pushProductToWooCommerce(
  conn: { store_url: string; access_token: string; api_secret: string },
  externalProductId: string,
  product: {
    name: string;
    description: string | null;
    image_url: string | null;
    retail_price: number | null;
    sku: string | null;
    status: string;
    weight_grams: number | null;
    unit: string | null;
  },
  variants: {
    id: string;
    sku: string | null;
    retail_price: number | null;
    weight_grams: number | null;
    unit: string | null;
    is_active: boolean;
  }[],
  externalVariantMap: Record<string, string>
): Promise<void> {
  const authHeader = Buffer.from(
    `${conn.access_token}:${conn.api_secret}`
  ).toString("base64");

  const headers = {
    Authorization: `Basic ${authHeader}`,
    "Content-Type": "application/json",
  };

  // Update main product
  const productPayload: Record<string, unknown> = {
    name: product.name,
    description: product.description || "",
    status: product.status === "published" ? "publish" : "draft",
    regular_price: product.retail_price?.toFixed(2) ?? undefined,
    sku: product.sku || undefined,
    weight: product.weight_grams ? (product.weight_grams / 1000).toString() : undefined,
    ...(product.image_url ? { images: [{ src: product.image_url }] } : {}),
  };

  await fetch(
    `https://${conn.store_url}/wp-json/wc/v3/products/${externalProductId}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(productPayload),
    }
  );

  // Update variations
  for (const [ghostId, extId] of Object.entries(externalVariantMap)) {
    const v = variants.find((vr) => vr.id === ghostId);
    if (!v || extId === externalProductId) continue; // Skip if simple product

    const varPayload: Record<string, unknown> = {
      regular_price: v.retail_price?.toFixed(2) ?? product.retail_price?.toFixed(2) ?? undefined,
      sku: v.sku || undefined,
      weight: v.weight_grams ? (v.weight_grams / 1000).toString() : undefined,
      status: v.is_active ? "publish" : "private",
    };

    await fetch(
      `https://${conn.store_url}/wp-json/wc/v3/products/${externalProductId}/variations/${extId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(varPayload),
      }
    );
  }
}

// ─── Inbound product sync ─────────────────────────────────────────────

/**
 * Handle an inbound product update from an external store.
 * Updates GR product fields (name, description, image, price, sku, status)
 * and variant data. Does NOT overwrite wholesale pricing, roasted_stock_id,
 * green_bean_id, or other GR-only fields.
 *
 * Returns true if the update was processed, false if skipped (sync loop).
 */
export async function handleInboundProductUpdate(
  connectionId: string,
  externalProductId: string,
  productData: {
    name?: string;
    description?: string;
    image_url?: string;
    status?: string;
  },
  variantUpdates?: {
    external_variant_id: string;
    price?: number;
    sku?: string;
  }[]
): Promise<boolean> {
  const supabase = createServerClient();

  // Find the mapping
  const { data: mapping } = await supabase
    .from("product_channel_mappings")
    .select("id, product_id, external_variant_ids, last_pushed_at, roaster_id")
    .eq("connection_id", connectionId)
    .eq("external_product_id", externalProductId)
    .maybeSingle();

  if (!mapping) return false; // Not a mapped product

  // Sync loop prevention: skip if we pushed outbound within last 30 seconds
  if (mapping.last_pushed_at) {
    const pushedAt = new Date(mapping.last_pushed_at).getTime();
    const now = Date.now();
    if (now - pushedAt < 30_000) {
      console.log(
        `[product-sync] Skipping inbound update for ${externalProductId} — our outbound push was ${Math.round((now - pushedAt) / 1000)}s ago`
      );
      return false;
    }
  }

  // Update GR product (safe fields only — no wholesale pricing, stock links)
  const updatePayload: Record<string, unknown> = {};
  if (productData.name) updatePayload.name = productData.name;
  if (productData.description !== undefined) updatePayload.description = productData.description;
  if (productData.image_url) updatePayload.image_url = productData.image_url;
  if (productData.status) {
    // Normalize external status to GR status
    const normalized = productData.status.toLowerCase();
    if (normalized === "active" || normalized === "publish" || normalized === "published") {
      updatePayload.status = "published";
    } else if (normalized === "draft" || normalized === "pending") {
      updatePayload.status = "draft";
    } else if (normalized === "archived" || normalized === "private") {
      updatePayload.status = "archived";
    }
  }

  if (Object.keys(updatePayload).length > 0) {
    await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", mapping.product_id)
      .eq("roaster_id", mapping.roaster_id);
  }

  // Update variant prices/SKUs (retail_price only, not wholesale)
  if (variantUpdates && variantUpdates.length > 0) {
    const externalVariantMap =
      (mapping.external_variant_ids as Record<string, string>) || {};

    // Reverse map: external_variant_id → ghost_variant_id
    const reverseMap = new Map<string, string>();
    for (const [ghostId, extId] of Object.entries(externalVariantMap)) {
      reverseMap.set(extId, ghostId);
    }

    for (const vu of variantUpdates) {
      const ghostVariantId = reverseMap.get(vu.external_variant_id);
      if (!ghostVariantId) continue;

      const variantUpdate: Record<string, unknown> = {};
      if (vu.price !== undefined) variantUpdate.retail_price = vu.price;
      if (vu.sku !== undefined) variantUpdate.sku = vu.sku;

      if (Object.keys(variantUpdate).length > 0) {
        await supabase
          .from("product_variants")
          .update(variantUpdate)
          .eq("id", ghostVariantId)
          .eq("roaster_id", mapping.roaster_id);
      }
    }
  }

  // Update last_synced_at on the mapping
  await supabase
    .from("product_channel_mappings")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", mapping.id);

  return true;
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

// ─── Squarespace stock push ──────────────────────────────────────

async function pushStockToSquarespace(
  conn: { access_token: string },
  variantId: string,
  quantity: number
): Promise<void> {
  // Squarespace uses the inventory endpoint to update stock
  await fetch(
    `https://api.squarespace.com/1.0/commerce/inventory/${variantId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        "Content-Type": "application/json",
        "User-Agent": "GhostRoastery/1.0",
      },
      body: JSON.stringify({
        quantity,
        isUnlimited: false,
      }),
    }
  );
}

// ─── Squarespace product push ─────────────────────────────────────

async function pushProductToSquarespace(
  conn: { access_token: string },
  externalProductId: string,
  product: {
    name: string;
    description: string | null;
    image_url: string | null;
    retail_price: number | null;
    sku: string | null;
    status: string;
    weight_grams: number | null;
    unit: string | null;
  },
  variants: {
    id: string;
    sku: string | null;
    retail_price: number | null;
    weight_grams: number | null;
    unit: string | null;
    is_active: boolean;
  }[],
  externalVariantMap: Record<string, string>
): Promise<void> {
  const headers = {
    Authorization: `Bearer ${conn.access_token}`,
    "Content-Type": "application/json",
    "User-Agent": "GhostRoastery/1.0",
  };

  // Update product info
  const productPayload: Record<string, unknown> = {
    name: product.name,
    description: product.description || "",
    isVisible: product.status === "published",
  };

  await fetch(
    `https://api.squarespace.com/1.0/commerce/products/${externalProductId}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(productPayload),
    }
  );

  // Update variants
  for (const [ghostId, extId] of Object.entries(externalVariantMap)) {
    const v = variants.find((vr) => vr.id === ghostId);
    if (!v) continue;

    const priceCents = Math.round(
      (v.retail_price ?? product.retail_price ?? 0) * 100
    );

    const varPayload: Record<string, unknown> = {
      pricing: {
        basePrice: {
          value: String(priceCents),
          currency: "GBP",
        },
      },
      sku: v.sku || product.sku || undefined,
    };

    await fetch(
      `https://api.squarespace.com/1.0/commerce/products/${externalProductId}/variants/${extId}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(varPayload),
      }
    );
  }
}
