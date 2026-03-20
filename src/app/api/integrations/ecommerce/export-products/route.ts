import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { getShopifyClient } from "@/lib/shopify";
import { getWooCommerceClient } from "@/lib/woocommerce";
import { getSquarespaceClient } from "@/lib/squarespace";
import { getWixClient } from "@/lib/wix";
import { pushStockToChannels } from "@/lib/ecommerce-stock-sync";

/**
 * GET: Fetch GR products that are NOT yet mapped to the given connection.
 * Used by the Export Products modal to show which products can be exported.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");

  if (!connectionId) {
    return NextResponse.json(
      { error: "connectionId is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const roasterId = user.roaster.id;

  // Verify connection belongs to this roaster
  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select("id, provider")
    .eq("id", connectionId)
    .eq("roaster_id", roasterId)
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "Connection not found" },
      { status: 404 }
    );
  }

  // Get already-mapped product IDs for this connection
  const { data: mappings } = await supabase
    .from("product_channel_mappings")
    .select("product_id")
    .eq("connection_id", connectionId);

  const mappedProductIds = new Set(
    (mappings || []).map((m) => m.product_id)
  );

  // Fetch all roaster's retail products
  const { data: products } = await supabase
    .from("products")
    .select("id, name, image_url, retail_price, sku, status")
    .eq("roaster_id", roasterId)
    .eq("is_retail", true)
    .order("name", { ascending: true });

  // Get variant counts
  const productIds = (products || []).map((p) => p.id);
  const { data: variantCounts } = await supabase
    .from("product_variants")
    .select("product_id")
    .in("product_id", productIds.length > 0 ? productIds : ["__none__"])
    .eq("is_active", true)
    .eq("channel", "retail");

  const countMap = new Map<string, number>();
  for (const v of variantCounts || []) {
    countMap.set(v.product_id, (countMap.get(v.product_id) || 0) + 1);
  }

  // Filter out already-mapped products
  const exportable = (products || [])
    .filter((p) => !mappedProductIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      image_url: p.image_url,
      retail_price: p.retail_price,
      sku: p.sku,
      variant_count: countMap.get(p.id) || 0,
      status: p.status,
    }));

  return NextResponse.json({ products: exportable });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { connectionId, productIds } = body as {
    connectionId: string;
    productIds: string[];
  };

  if (!connectionId) {
    return NextResponse.json(
      { error: "connectionId is required" },
      { status: 400 }
    );
  }
  if (!productIds || productIds.length === 0) {
    return NextResponse.json(
      { error: "At least one productId is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const roasterId = user.roaster.id;

  // Verify connection belongs to this roaster
  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select("id, provider, roaster_id, store_url, access_token, api_secret, sync_stock")
    .eq("id", connectionId)
    .eq("roaster_id", roasterId)
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "Connection not found" },
      { status: 404 }
    );
  }

  // Check which products are already mapped to this connection
  const { data: existingMappings } = await supabase
    .from("product_channel_mappings")
    .select("product_id")
    .eq("connection_id", connectionId)
    .in("product_id", productIds);

  const alreadyMapped = new Set(
    (existingMappings || []).map((m) => m.product_id)
  );

  let exported = 0;
  const errors: string[] = [];

  for (const productId of productIds) {
    if (alreadyMapped.has(productId)) {
      errors.push(`Product already exported to this store (skipped)`);
      continue;
    }

    try {
      // Fetch product with full data
      const { data: product } = await supabase
        .from("products")
        .select(
          "id, name, description, image_url, retail_price, sku, status, weight_grams, unit, roasted_stock_id, green_bean_id"
        )
        .eq("id", productId)
        .eq("roaster_id", roasterId)
        .single();

      if (!product) {
        errors.push(`Product ${productId}: not found`);
        continue;
      }

      // Fetch variants with grind type names
      const { data: variants } = await supabase
        .from("product_variants")
        .select(
          "id, sku, retail_price, weight_grams, unit, is_active, sort_order, grind_type_id, channel, roaster_grind_types:grind_type_id (name)"
        )
        .eq("product_id", productId)
        .eq("roaster_id", roasterId)
        .eq("channel", "retail")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const activeVariants = variants || [];

      let externalProductId: string;
      let externalVariantIds: Record<string, string>;

      if (connection.provider === "shopify") {
        const result = await createShopifyProduct(
          connectionId,
          product,
          activeVariants
        );
        externalProductId = result.externalProductId;
        externalVariantIds = result.externalVariantIds;
      } else if (connection.provider === "woocommerce") {
        const result = await createWooCommerceProduct(
          connectionId,
          product,
          activeVariants
        );
        externalProductId = result.externalProductId;
        externalVariantIds = result.externalVariantIds;
      } else if (connection.provider === "squarespace") {
        const result = await createSquarespaceProduct(
          connectionId,
          product,
          activeVariants
        );
        externalProductId = result.externalProductId;
        externalVariantIds = result.externalVariantIds;
      } else if (connection.provider === "wix") {
        const result = await createWixProduct(
          connectionId,
          product,
          activeVariants
        );
        externalProductId = result.externalProductId;
        externalVariantIds = result.externalVariantIds;
      } else {
        errors.push(`${product.name}: unsupported provider ${connection.provider}`);
        continue;
      }

      // Save mapping
      const { error: mappingError } = await supabase
        .from("product_channel_mappings")
        .insert({
          roaster_id: roasterId,
          connection_id: connectionId,
          product_id: productId,
          external_product_id: externalProductId,
          external_variant_ids: externalVariantIds,
          roasted_stock_id: product.roasted_stock_id || null,
          green_bean_id: product.green_bean_id || null,
          last_synced_at: new Date().toISOString(),
          last_pushed_at: new Date().toISOString(),
        });

      if (mappingError) {
        errors.push(`${product.name}: failed to save mapping — ${mappingError.message}`);
        continue;
      }

      // Push initial stock levels if sync_stock is enabled and product is linked to roasted stock
      if (connection.sync_stock && product.roasted_stock_id) {
        try {
          await pushStockToChannels(roasterId, product.roasted_stock_id);
        } catch (stockErr) {
          console.error(
            `[export] Stock push failed for ${product.name}:`,
            stockErr
          );
          // Non-critical — product was created successfully
        }
      }

      exported++;
    } catch (err) {
      console.error(`[export] Failed to export product ${productId}:`, err);
      errors.push(
        `Product ${productId}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  // Update last_product_sync_at
  if (exported > 0) {
    await supabase
      .from("ecommerce_connections")
      .update({ last_product_sync_at: new Date().toISOString() })
      .eq("id", connectionId);
  }

  return NextResponse.json({
    exported,
    errors: errors.length > 0 ? errors : undefined,
    total: productIds.length,
  });
}

// ─── Shopify product creation ─────────────────────────────────────────

interface ExportVariant {
  id: string;
  sku: string | null;
  retail_price: number | null;
  weight_grams: number | null;
  unit: string | null;
  is_active: boolean;
  sort_order: number;
  grind_type_id: string | null;
  channel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roaster_grind_types: any;
}

function getGrindName(v: ExportVariant): string | null {
  if (!v.roaster_grind_types) return null;
  if (typeof v.roaster_grind_types === "object" && v.roaster_grind_types.name) {
    return v.roaster_grind_types.name;
  }
  return null;
}

function formatWeightLabel(grams: number | null): string {
  if (!grams) return "250g";
  if (grams >= 1000) {
    const kg = grams / 1000;
    return kg === Math.floor(kg) ? `${kg}kg` : `${grams}g`;
  }
  return `${grams}g`;
}

async function createShopifyProduct(
  connectionId: string,
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
  variants: ExportVariant[]
): Promise<{ externalProductId: string; externalVariantIds: Record<string, string> }> {
  const client = await getShopifyClient(connectionId);

  // Determine unique weight and grind options across variants
  const weightLabels = Array.from(
    new Set(variants.map((v) => v.unit || formatWeightLabel(v.weight_grams)))
  );
  const grindNames = Array.from(
    new Set(
      variants
        .map((v) => getGrindName(v))
        .filter((g): g is string => g !== null)
    )
  );

  const hasMultipleWeights = weightLabels.length > 1;
  const hasGrinds = grindNames.length > 0;

  // Build Shopify options
  const options: { name: string; values: string[] }[] = [];
  if (hasMultipleWeights || variants.length > 0) {
    options.push({
      name: "Weight",
      values: weightLabels.length > 0 ? weightLabels : [product.unit || "250g"],
    });
  }
  if (hasGrinds) {
    options.push({ name: "Grind", values: grindNames });
  }

  // Build Shopify variants
  const shopifyVariants = variants.map((v) => ({
    option1: v.unit || formatWeightLabel(v.weight_grams),
    option2: hasGrinds ? (getGrindName(v) || grindNames[0]) : undefined,
    price: (v.retail_price ?? product.retail_price ?? 0).toFixed(2),
    sku: v.sku || product.sku || undefined,
    weight: v.weight_grams ? v.weight_grams / 1000 : product.weight_grams ? product.weight_grams / 1000 : undefined,
    weight_unit: "kg",
    inventory_management: "shopify",
    requires_shipping: true,
  }));

  // If no variants, create a single default one
  if (shopifyVariants.length === 0) {
    shopifyVariants.push({
      option1: product.unit || "250g",
      option2: undefined,
      price: (product.retail_price ?? 0).toFixed(2),
      sku: product.sku || undefined,
      weight: product.weight_grams ? product.weight_grams / 1000 : undefined,
      weight_unit: "kg",
      inventory_management: "shopify",
      requires_shipping: true,
    });
  }

  const payload = {
    product: {
      title: product.name,
      body_html: product.description || "",
      status: product.status === "published" ? "active" : "draft",
      ...(options.length > 0 ? { options } : {}),
      variants: shopifyVariants,
      ...(product.image_url ? { images: [{ src: product.image_url }] } : {}),
    },
  };

  const res = await fetch(`${client.baseUrl}/products.json`, {
    method: "POST",
    headers: client.headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Shopify create failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const createdProduct = data.product;

  // Map ghost variant IDs → Shopify variant IDs
  const externalVariantIds: Record<string, string> = {};
  const createdVariants = createdProduct.variants || [];

  if (variants.length > 0) {
    // Match by position — we sent them in the same order
    for (let i = 0; i < variants.length && i < createdVariants.length; i++) {
      externalVariantIds[variants[i].id] = String(createdVariants[i].id);
    }
  } else if (createdVariants.length > 0) {
    // No GR variants — use product ID as key for the single default variant
    externalVariantIds["__default__"] = String(createdVariants[0].id);
  }

  return {
    externalProductId: String(createdProduct.id),
    externalVariantIds,
  };
}

// ─── WooCommerce product creation ────────────────────────────────────

async function createWooCommerceProduct(
  connectionId: string,
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
  variants: ExportVariant[]
): Promise<{ externalProductId: string; externalVariantIds: Record<string, string> }> {
  const client = await getWooCommerceClient(connectionId);

  // Determine unique weight and grind options
  const weightLabels = Array.from(
    new Set(variants.map((v) => v.unit || formatWeightLabel(v.weight_grams)))
  );
  const grindNames = Array.from(
    new Set(
      variants
        .map((v) => getGrindName(v))
        .filter((g): g is string => g !== null)
    )
  );

  const hasGrinds = grindNames.length > 0;
  const isVariable = variants.length > 1 || hasGrinds;

  if (!isVariable) {
    // Simple product
    const v = variants[0];
    const payload = {
      name: product.name,
      description: product.description || "",
      status: product.status === "published" ? "publish" : "draft",
      regular_price: (v?.retail_price ?? product.retail_price ?? 0).toFixed(2),
      sku: v?.sku || product.sku || undefined,
      manage_stock: true,
      stock_quantity: 0,
      weight: v?.weight_grams
        ? (v.weight_grams / 1000).toString()
        : product.weight_grams
          ? (product.weight_grams / 1000).toString()
          : undefined,
      ...(product.image_url ? { images: [{ src: product.image_url }] } : {}),
    };

    const res = await fetch(`${client.baseUrl}/products`, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`WooCommerce create failed (${res.status}): ${errBody}`);
    }

    const created = await res.json();
    const externalVariantIds: Record<string, string> = {};
    if (v) {
      externalVariantIds[v.id] = String(created.id); // simple → product ID as variant ID
    }

    return {
      externalProductId: String(created.id),
      externalVariantIds,
    };
  }

  // Variable product
  const attributes: { name: string; options: string[]; variation: boolean; visible: boolean }[] = [];
  if (weightLabels.length > 0) {
    attributes.push({
      name: "Weight",
      options: weightLabels,
      variation: true,
      visible: true,
    });
  }
  if (hasGrinds) {
    attributes.push({
      name: "Grind",
      options: grindNames,
      variation: true,
      visible: true,
    });
  }

  const productPayload = {
    name: product.name,
    type: "variable",
    description: product.description || "",
    status: product.status === "published" ? "publish" : "draft",
    attributes,
    ...(product.image_url ? { images: [{ src: product.image_url }] } : {}),
  };

  const prodRes = await fetch(`${client.baseUrl}/products`, {
    method: "POST",
    headers: client.headers,
    body: JSON.stringify(productPayload),
  });

  if (!prodRes.ok) {
    const errBody = await prodRes.text();
    throw new Error(`WooCommerce create failed (${prodRes.status}): ${errBody}`);
  }

  const createdProduct = await prodRes.json();
  const externalProductId = String(createdProduct.id);

  // Create variations
  const externalVariantIds: Record<string, string> = {};

  for (const v of variants) {
    const varAttrs: { name: string; option: string }[] = [];
    varAttrs.push({
      name: "Weight",
      option: v.unit || formatWeightLabel(v.weight_grams),
    });
    if (hasGrinds) {
      varAttrs.push({
        name: "Grind",
        option: getGrindName(v) || grindNames[0],
      });
    }

    const varPayload = {
      regular_price: (v.retail_price ?? product.retail_price ?? 0).toFixed(2),
      sku: v.sku || undefined,
      manage_stock: true,
      stock_quantity: 0,
      weight: v.weight_grams
        ? (v.weight_grams / 1000).toString()
        : undefined,
      attributes: varAttrs,
    };

    const varRes = await fetch(
      `${client.baseUrl}/products/${externalProductId}/variations`,
      {
        method: "POST",
        headers: client.headers,
        body: JSON.stringify(varPayload),
      }
    );

    if (varRes.ok) {
      const createdVar = await varRes.json();
      externalVariantIds[v.id] = String(createdVar.id);
    } else {
      const errBody = await varRes.text();
      console.error(
        `[export] WooCommerce variation creation failed:`,
        errBody
      );
    }
  }

  return { externalProductId, externalVariantIds };
}

// ─── Squarespace product creation ─────────────────────────────────────

async function createSquarespaceProduct(
  connectionId: string,
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
  variants: ExportVariant[]
): Promise<{
  externalProductId: string;
  externalVariantIds: Record<string, string>;
}> {
  const client = await getSquarespaceClient(connectionId);

  // Build variants for Squarespace
  const sqVariants = variants.map((v) => {
    const priceCents = Math.round(
      (v.retail_price ?? product.retail_price ?? 0) * 100
    );
    const grindName = getGrindName(v);
    const attributes: Record<string, string> = {};

    attributes["Weight"] = v.unit || formatWeightLabel(v.weight_grams);
    if (grindName) {
      attributes["Grind"] = grindName;
    }

    return {
      sku: v.sku || product.sku || "",
      pricing: {
        basePrice: {
          value: String(priceCents),
          currency: "GBP",
        },
      },
      stock: { quantity: 0, unlimited: false },
      attributes,
      shippingMeasurements: v.weight_grams
        ? {
            weight: {
              value: v.weight_grams / 1000,
              unit: "KILOGRAM",
            },
          }
        : undefined,
    };
  });

  // If no variants, create a single default
  if (sqVariants.length === 0) {
    const priceCents = Math.round((product.retail_price ?? 0) * 100);
    sqVariants.push({
      sku: product.sku || "",
      pricing: {
        basePrice: {
          value: String(priceCents),
          currency: "GBP",
        },
      },
      stock: { quantity: 0, unlimited: false },
      attributes: {
        Weight: product.unit || "250g",
      },
      shippingMeasurements: product.weight_grams
        ? {
            weight: {
              value: product.weight_grams / 1000,
              unit: "KILOGRAM",
            },
          }
        : undefined,
    });
  }

  const payload = {
    type: "PHYSICAL",
    name: product.name,
    description: product.description || "",
    isVisible: product.status === "published",
    variants: sqVariants,
  };

  const res = await fetch(`${client.baseUrl}/products`, {
    method: "POST",
    headers: client.headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Squarespace create failed (${res.status}): ${errBody}`);
  }

  const created = await res.json();
  const externalProductId = String(created.id);
  const externalVariantIds: Record<string, string> = {};
  const createdVariants = created.variants || [];

  if (variants.length > 0) {
    for (
      let i = 0;
      i < variants.length && i < createdVariants.length;
      i++
    ) {
      externalVariantIds[variants[i].id] = String(createdVariants[i].id);
    }
  } else if (createdVariants.length > 0) {
    externalVariantIds["__default__"] = String(createdVariants[0].id);
  }

  return { externalProductId, externalVariantIds };
}

// ─── Wix product creation ──────────────────────────────────────────────

async function createWixProduct(
  connectionId: string,
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
  variants: ExportVariant[]
): Promise<{
  externalProductId: string;
  externalVariantIds: Record<string, string>;
}> {
  const client = await getWixClient(connectionId);

  // Determine unique weight and grind options
  const grindNames = Array.from(
    new Set(
      variants
        .map((v) => getGrindName(v))
        .filter((g): g is string => g !== null)
    )
  );

  const hasGrinds = grindNames.length > 0;

  // Build product options
  const productOptions: {
    name: string;
    optionType: string;
    choices: { value: string; description: string }[];
  }[] = [];

  const weightLabels = Array.from(
    new Set(variants.map((v) => v.unit || formatWeightLabel(v.weight_grams)))
  );

  if (weightLabels.length > 0) {
    productOptions.push({
      name: "Weight",
      optionType: "drop_down",
      choices: weightLabels.map((w) => ({ value: w, description: w })),
    });
  }

  if (hasGrinds) {
    productOptions.push({
      name: "Grind",
      optionType: "drop_down",
      choices: grindNames.map((g) => ({ value: g, description: g })),
    });
  }

  // Build Wix variants
  const wixVariants = variants.map((v) => {
    const choices: Record<string, string> = {};
    choices["Weight"] = v.unit || formatWeightLabel(v.weight_grams);
    if (hasGrinds) {
      choices["Grind"] = getGrindName(v) || grindNames[0];
    }

    return {
      choices,
      priceData: {
        price: v.retail_price ?? product.retail_price ?? 0,
        currency: "GBP",
      },
      sku: v.sku || product.sku || "",
      weight: v.weight_grams
        ? v.weight_grams / 1000
        : product.weight_grams
          ? product.weight_grams / 1000
          : undefined,
      stock: { trackInventory: true, quantity: 0, inStock: false },
    };
  });

  // If no variants, create a single default
  if (wixVariants.length === 0) {
    wixVariants.push({
      choices: { Weight: product.unit || "250g" },
      priceData: {
        price: product.retail_price ?? 0,
        currency: "GBP",
      },
      sku: product.sku || "",
      weight: product.weight_grams
        ? product.weight_grams / 1000
        : undefined,
      stock: { trackInventory: true, quantity: 0, inStock: false },
    });
  }

  const payload = {
    product: {
      name: product.name,
      productType: "physical",
      description: product.description || "",
      visible: product.status === "published",
      priceData: {
        price: product.retail_price ?? 0,
        currency: "GBP",
      },
      sku: product.sku || "",
      ...(productOptions.length > 0 ? { productOptions } : {}),
      variants: wixVariants,
      ...(product.image_url
        ? {
            media: {
              items: [{ image: { url: product.image_url } }],
            },
          }
        : {}),
    },
  };

  const res = await fetch(`${client.baseUrl}/stores/v1/products`, {
    method: "POST",
    headers: client.headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Wix create failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const createdProduct = data.product;
  const externalProductId = String(createdProduct.id);
  const externalVariantIds: Record<string, string> = {};
  const createdVariants = createdProduct.variants || [];

  if (variants.length > 0) {
    for (
      let i = 0;
      i < variants.length && i < createdVariants.length;
      i++
    ) {
      externalVariantIds[variants[i].id] = String(createdVariants[i].id);
    }
  } else if (createdVariants.length > 0) {
    externalVariantIds["__default__"] = String(createdVariants[0].id);
  }

  return { externalProductId, externalVariantIds };
}
