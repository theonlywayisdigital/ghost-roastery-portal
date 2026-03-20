import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
  type ShopifyVariant,
} from "@/lib/shopify";
import {
  fetchWooCommerceProducts,
  type WooProduct,
  type WooVariation,
} from "@/lib/woocommerce";
import {
  fetchSquarespaceProducts,
  type SquarespaceProduct,
  type SquarespaceVariant,
} from "@/lib/squarespace";

interface NormalisedProduct {
  external_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sku: string | null;
  price: number | null;
  status: string;
  track_stock: boolean;
  stock_quantity: number | null;
  variants: NormalisedVariant[];
}

interface NormalisedVariant {
  external_id: string;
  sku: string | null;
  price: number | null;
  weight_grams: number | null;
  unit: string | null;
  grind_label: string | null;
  stock_quantity: number | null;
  track_stock: boolean;
  image_url: string | null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { connectionId, selectedProductIds } = body as {
    connectionId: string;
    selectedProductIds?: string[];
  };

  if (!connectionId) {
    return NextResponse.json(
      { error: "connectionId is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Verify connection belongs to this roaster
  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select("id, provider, roaster_id")
    .eq("id", connectionId)
    .eq("roaster_id", user.roaster.id)
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "Connection not found" },
      { status: 404 }
    );
  }

  const roasterId = user.roaster.id;

  // Fetch existing mappings
  const { data: existingMappings } = await supabase
    .from("product_channel_mappings")
    .select("external_product_id, product_id, external_variant_ids")
    .eq("connection_id", connectionId);

  const mappedExternalIds = new Map<
    string,
    { product_id: string; external_variant_ids: Record<string, string> }
  >();
  if (existingMappings) {
    for (const m of existingMappings) {
      mappedExternalIds.set(m.external_product_id, {
        product_id: m.product_id,
        external_variant_ids:
          (m.external_variant_ids as Record<string, string>) || {},
      });
    }
  }

  // Fetch roaster's existing grind types
  const { data: existingGrinds } = await supabase
    .from("roaster_grind_types")
    .select("id, name")
    .eq("roaster_id", roasterId);

  const grindTypeMap = new Map<string, string>();
  if (existingGrinds) {
    for (const g of existingGrinds) {
      grindTypeMap.set(g.name.toLowerCase().trim(), g.id);
    }
  }

  try {
    // Fetch products from external store
    let normalised: NormalisedProduct[] = [];

    if (connection.provider === "shopify") {
      const shopifyProducts = await fetchShopifyProducts(connectionId);
      normalised = shopifyProducts.map(normaliseShopifyProduct);
    } else if (connection.provider === "woocommerce") {
      const wooProducts = await fetchWooCommerceProducts(connectionId);
      normalised = wooProducts.map(normaliseWooProduct);
    } else if (connection.provider === "squarespace") {
      const sqProducts = await fetchSquarespaceProducts(connectionId);
      normalised = sqProducts.map(normaliseSquarespaceProduct);
    }

    // Filter to selected products if specified
    if (selectedProductIds && selectedProductIds.length > 0) {
      const selectedSet = new Set(selectedProductIds);
      normalised = normalised.filter((p) => selectedSet.has(p.external_id));
    }

    // Check product limit
    const newProducts = normalised.filter(
      (p) => !mappedExternalIds.has(p.external_id)
    );
    if (newProducts.length > 0) {
      const limitCheck = await checkLimit(
        roasterId,
        "products",
        newProducts.length
      );
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: limitCheck.message, upgrade_required: true },
          { status: 403 }
        );
      }
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of normalised) {
      try {
        const existing = mappedExternalIds.get(product.external_id);

        if (existing) {
          // Update existing product
          await updateExistingProduct(
            supabase,
            existing.product_id,
            product,
            roasterId,
            connectionId,
            existing.external_variant_ids,
            grindTypeMap
          );
          updated++;
        } else {
          // Create new product
          await createNewProduct(
            supabase,
            product,
            roasterId,
            connectionId,
            grindTypeMap
          );
          imported++;
        }
      } catch (err) {
        console.error(
          `[ecommerce] Failed to import product ${product.external_id}:`,
          err
        );
        errors.push(
          `${product.name}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        skipped++;
      }
    }

    // Update last_product_sync_at
    await supabase
      .from("ecommerce_connections")
      .update({ last_product_sync_at: new Date().toISOString() })
      .eq("id", connectionId);

    return NextResponse.json({
      imported,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      total: normalised.length,
    });
  } catch (err) {
    console.error("[ecommerce] Import error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to import products",
      },
      { status: 500 }
    );
  }
}

// ─── Normalisation ───────────────────────────────────────────────────

function normaliseShopifyProduct(p: ShopifyProduct): NormalisedProduct {
  return {
    external_id: String(p.id),
    name: p.title,
    description: p.body_html || null,
    image_url: p.image?.src || p.images?.[0]?.src || null,
    sku: p.variants?.[0]?.sku || null,
    price: p.variants?.[0]?.price ? parseFloat(p.variants[0].price) : null,
    status: p.status === "active" ? "published" : "draft",
    track_stock: p.variants?.some((v) => v.inventory_management === "shopify") ?? false,
    stock_quantity: p.variants?.[0]?.inventory_quantity ?? null,
    variants: (p.variants || []).map((v) =>
      normaliseShopifyVariant(v, p)
    ),
  };
}

function normaliseShopifyVariant(
  v: ShopifyVariant,
  product: ShopifyProduct
): NormalisedVariant {
  // Try to parse weight from option values (e.g. "250g", "1kg")
  const optionValues = [v.option1, v.option2, v.option3].filter(Boolean);
  const weightInfo = parseWeightFromOptions(optionValues as string[]);
  const grindLabel = parseGrindFromOptions(optionValues as string[]);

  // If no parsed weight, use the variant's Shopify weight
  let weightGrams = weightInfo?.grams ?? null;
  if (weightGrams === null && v.weight > 0) {
    weightGrams = convertToGrams(v.weight, v.weight_unit);
  }

  // Find variant image
  const variantImage = v.image_id
    ? product.images?.find((img) => img.id === v.image_id)?.src
    : null;

  return {
    external_id: String(v.id),
    sku: v.sku || null,
    price: v.price ? parseFloat(v.price) : null,
    weight_grams: weightGrams,
    unit: weightInfo?.unit ?? formatWeightUnit(weightGrams),
    grind_label: grindLabel,
    stock_quantity: v.inventory_quantity ?? null,
    track_stock: v.inventory_management === "shopify",
    image_url: variantImage || null,
  };
}

function normaliseWooProduct(p: WooProduct): NormalisedProduct {
  if (p.type === "variable" && p._variations && p._variations.length > 0) {
    return {
      external_id: String(p.id),
      name: p.name,
      description: p.description || p.short_description || null,
      image_url: p.images?.[0]?.src || null,
      sku: p.sku || null,
      price: p.price ? parseFloat(p.price) : null,
      status: p.status === "publish" ? "published" : "draft",
      track_stock: p._variations.some((v) => v.manage_stock),
      stock_quantity: p.stock_quantity,
      variants: p._variations.map((v) => normaliseWooVariation(v)),
    };
  }

  // Simple product — create a single variant
  const weightInfo = p.weight ? parseWeightString(p.weight) : null;

  return {
    external_id: String(p.id),
    name: p.name,
    description: p.description || p.short_description || null,
    image_url: p.images?.[0]?.src || null,
    sku: p.sku || null,
    price: p.price ? parseFloat(p.price) : null,
    status: p.status === "publish" ? "published" : "draft",
    track_stock: p.manage_stock,
    stock_quantity: p.stock_quantity,
    variants: [
      {
        external_id: String(p.id),
        sku: p.sku || null,
        price: p.price ? parseFloat(p.price) : null,
        weight_grams: weightInfo?.grams ?? null,
        unit: weightInfo?.unit ?? null,
        grind_label: null,
        stock_quantity: p.stock_quantity,
        track_stock: p.manage_stock,
        image_url: p.images?.[0]?.src || null,
      },
    ],
  };
}

function normaliseWooVariation(v: WooVariation): NormalisedVariant {
  // Check attributes for weight and grind
  const attrValues = v.attributes.map((a) => a.option);
  const weightInfo = parseWeightFromOptions(attrValues);
  const grindLabel = parseGrindFromOptions(attrValues);

  // If no weight from attributes, try the variation's weight field
  let weightGrams = weightInfo?.grams ?? null;
  if (weightGrams === null && v.weight) {
    // WooCommerce weight is in the store's unit (usually kg or g)
    const parsed = parseWeightString(v.weight);
    if (parsed) weightGrams = parsed.grams;
  }

  return {
    external_id: String(v.id),
    sku: v.sku || null,
    price: v.price ? parseFloat(v.price) : (v.regular_price ? parseFloat(v.regular_price) : null),
    weight_grams: weightGrams,
    unit: weightInfo?.unit ?? formatWeightUnit(weightGrams),
    grind_label: grindLabel,
    stock_quantity: v.stock_quantity,
    track_stock: v.manage_stock,
    image_url: v.image?.src || null,
  };
}

function normaliseSquarespaceProduct(
  p: SquarespaceProduct
): NormalisedProduct {
  const firstVariant = p.variants?.[0];
  // Squarespace prices are in cents
  const priceCents = firstVariant?.pricing?.basePrice?.value;
  const price = priceCents ? parseFloat(priceCents) / 100 : null;

  return {
    external_id: String(p.id),
    name: p.name,
    description: p.description || null,
    image_url: p.images?.[0]?.url || null,
    sku: firstVariant?.sku || null,
    price,
    status: p.isVisible ? "published" : "draft",
    track_stock: firstVariant ? !firstVariant.stock.unlimited : false,
    stock_quantity: firstVariant?.stock?.quantity ?? null,
    variants: (p.variants || []).map((v) =>
      normaliseSquarespaceVariant(v, p)
    ),
  };
}

function normaliseSquarespaceVariant(
  v: SquarespaceVariant,
  product: SquarespaceProduct
): NormalisedVariant {
  // Parse weight and grind from variant attributes
  const attrValues = Object.values(v.attributes || {});
  const weightInfo = parseWeightFromOptions(attrValues);
  const grindLabel = parseGrindFromOptions(attrValues);

  // If no weight from attributes, try the shipping weight
  let weightGrams = weightInfo?.grams ?? null;
  if (
    weightGrams === null &&
    v.shippingMeasurements?.weight?.value
  ) {
    weightGrams = convertToGrams(
      v.shippingMeasurements.weight.value,
      v.shippingMeasurements.weight.unit || "KILOGRAM"
    );
  }

  // Squarespace prices are in cents
  const priceCents = v.pricing?.basePrice?.value;
  const price = priceCents ? parseFloat(priceCents) / 100 : null;

  return {
    external_id: String(v.id),
    sku: v.sku || null,
    price,
    weight_grams: weightGrams,
    unit: weightInfo?.unit ?? formatWeightUnit(weightGrams),
    grind_label: grindLabel,
    stock_quantity: v.stock?.quantity ?? null,
    track_stock: !v.stock?.unlimited,
    image_url: v.image?.url || product.images?.[0]?.url || null,
  };
}

// ─── Weight / Grind Parsing ──────────────────────────────────────────

const WEIGHT_PATTERNS = [
  { pattern: /(\d+(?:\.\d+)?)\s*kg/i, multiplier: 1000 },
  { pattern: /(\d+(?:\.\d+)?)\s*g(?:rams?)?/i, multiplier: 1 },
  { pattern: /(\d+(?:\.\d+)?)\s*oz/i, multiplier: 28.3495 },
  { pattern: /(\d+(?:\.\d+)?)\s*lb/i, multiplier: 453.592 },
];

const GRIND_KEYWORDS = [
  "whole bean",
  "whole beans",
  "ground",
  "coarse",
  "fine",
  "medium",
  "espresso",
  "filter",
  "french press",
  "aeropress",
  "moka pot",
  "pour over",
  "cafetiere",
  "omni",
];

function parseWeightFromOptions(
  options: string[]
): { grams: number; unit: string } | null {
  for (const opt of options) {
    for (const { pattern, multiplier } of WEIGHT_PATTERNS) {
      const match = opt.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        const grams = Math.round(value * multiplier);
        return { grams, unit: formatWeightUnit(grams) };
      }
    }
  }
  // Fallback: bare number (e.g. "250") — assume grams if in coffee weight range
  for (const opt of options) {
    const trimmed = opt.trim();
    if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      if (num >= 50 && num <= 5000) {
        const grams = Math.round(num);
        return { grams, unit: formatWeightUnit(grams) };
      }
    }
  }
  return null;
}

function parseWeightString(
  weight: string
): { grams: number; unit: string } | null {
  // WooCommerce weight is typically just a number in the store's unit setting
  // We'll assume grams if value > 10, kg if <= 10
  const num = parseFloat(weight);
  if (isNaN(num) || num <= 0) return null;
  const grams = num > 50 ? Math.round(num) : Math.round(num * 1000);
  return { grams, unit: formatWeightUnit(grams) };
}

function parseGrindFromOptions(options: string[]): string | null {
  for (const opt of options) {
    const lower = opt.toLowerCase().trim();
    for (const keyword of GRIND_KEYWORDS) {
      if (lower.includes(keyword)) {
        // Return original casing, title-cased
        return opt.trim();
      }
    }
  }
  return null;
}

function formatWeightUnit(grams: number | null): string {
  if (grams === null) return "250g";
  if (grams >= 1000) {
    const kg = grams / 1000;
    return kg === Math.floor(kg) ? `${kg}kg` : `${grams}g`;
  }
  return `${grams}g`;
}

function convertToGrams(weight: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case "kg":
    case "kilogram":
      return Math.round(weight * 1000);
    case "g":
    case "gram":
      return Math.round(weight);
    case "oz":
    case "ounce":
      return Math.round(weight * 28.3495);
    case "lb":
    case "pound":
      return Math.round(weight * 453.592);
    default:
      return Math.round(weight);
  }
}

// ─── Product Creation / Update ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

async function getOrCreateGrindType(
  supabase: SupabaseClient,
  roasterId: string,
  grindLabel: string,
  grindTypeMap: Map<string, string>
): Promise<string> {
  const key = grindLabel.toLowerCase().trim();
  const existing = grindTypeMap.get(key);
  if (existing) return existing;

  const { data } = await supabase
    .from("roaster_grind_types")
    .insert({
      roaster_id: roasterId,
      name: grindLabel.trim(),
    })
    .select("id")
    .single();

  if (data) {
    grindTypeMap.set(key, data.id);
    return data.id;
  }

  throw new Error(`Failed to create grind type: ${grindLabel}`);
}

async function createNewProduct(
  supabase: SupabaseClient,
  product: NormalisedProduct,
  roasterId: string,
  connectionId: string,
  grindTypeMap: Map<string, string>
) {
  // Strip HTML from description
  const plainDescription = product.description
    ? product.description.replace(/<[^>]*>/g, "").trim()
    : null;

  const firstVariant = product.variants[0];

  // Create the product
  const { data: created, error } = await supabase
    .from("products")
    .insert({
      roaster_id: roasterId,
      name: product.name,
      description: plainDescription,
      image_url: product.image_url,
      sku: product.sku,
      retail_price: product.price,
      price: product.price || 0,
      unit: firstVariant?.unit || "250g",
      weight_grams: firstVariant?.weight_grams || null,
      status: product.status,
      is_retail: true,
      is_wholesale: false,
      track_stock: product.track_stock,
      retail_stock_count: product.stock_quantity,
      category: "coffee",
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create product: ${error?.message}`);
  }

  // Create variants
  const externalVariantMap: Record<string, string> = {};

  if (product.variants.length > 0) {
    for (const v of product.variants) {
      let grindTypeId: string | null = null;
      if (v.grind_label) {
        grindTypeId = await getOrCreateGrindType(
          supabase,
          roasterId,
          v.grind_label,
          grindTypeMap
        );
      }

      const { data: insertedVariant } = await supabase
        .from("product_variants")
        .insert({
          product_id: created.id,
          roaster_id: roasterId,
          weight_grams: v.weight_grams,
          unit: v.unit,
          grind_type_id: grindTypeId,
          sku: v.sku,
          retail_price: v.price,
          retail_stock_count: v.stock_quantity,
          track_stock: v.track_stock,
          is_active: true,
          channel: "retail",
        })
        .select("id")
        .single();

      if (insertedVariant) {
        externalVariantMap[insertedVariant.id] = v.external_id;
      }
    }
  }

  // Create mapping
  await supabase.from("product_channel_mappings").insert({
    roaster_id: roasterId,
    connection_id: connectionId,
    product_id: created.id,
    external_product_id: product.external_id,
    external_variant_ids: externalVariantMap,
    last_synced_at: new Date().toISOString(),
  });
}

async function updateExistingProduct(
  supabase: SupabaseClient,
  productId: string,
  product: NormalisedProduct,
  roasterId: string,
  connectionId: string,
  existingVariantMap: Record<string, string>,
  grindTypeMap: Map<string, string>
) {
  const plainDescription = product.description
    ? product.description.replace(/<[^>]*>/g, "").trim()
    : null;

  // Update the product
  await supabase
    .from("products")
    .update({
      name: product.name,
      description: plainDescription,
      image_url: product.image_url,
      retail_price: product.price,
      status: product.status,
      track_stock: product.track_stock,
      retail_stock_count: product.stock_quantity,
    })
    .eq("id", productId);

  // Build reverse map: external_variant_id → ghost_variant_id
  const extToGhost = new Map<string, string>();
  for (const [ghostId, extId] of Object.entries(existingVariantMap)) {
    extToGhost.set(extId, ghostId);
  }

  const updatedVariantMap = { ...existingVariantMap };

  for (const v of product.variants) {
    const existingGhostId = extToGhost.get(v.external_id);

    let grindTypeId: string | null = null;
    if (v.grind_label) {
      grindTypeId = await getOrCreateGrindType(
        supabase,
        roasterId,
        v.grind_label,
        grindTypeMap
      );
    }

    if (existingGhostId) {
      // Update existing variant
      await supabase
        .from("product_variants")
        .update({
          retail_price: v.price,
          retail_stock_count: v.stock_quantity,
          track_stock: v.track_stock,
          weight_grams: v.weight_grams,
          unit: v.unit,
          grind_type_id: grindTypeId,
          sku: v.sku,
        })
        .eq("id", existingGhostId);
    } else {
      // Create new variant
      const { data: insertedVariant } = await supabase
        .from("product_variants")
        .insert({
          product_id: productId,
          roaster_id: roasterId,
          weight_grams: v.weight_grams,
          unit: v.unit,
          grind_type_id: grindTypeId,
          sku: v.sku,
          retail_price: v.price,
          retail_stock_count: v.stock_quantity,
          track_stock: v.track_stock,
          is_active: true,
          channel: "retail",
        })
        .select("id")
        .single();

      if (insertedVariant) {
        updatedVariantMap[insertedVariant.id] = v.external_id;
      }
    }
  }

  // Update mapping with new variant map
  await supabase
    .from("product_channel_mappings")
    .update({
      external_variant_ids: updatedVariantMap,
      last_synced_at: new Date().toISOString(),
    })
    .eq("connection_id", connectionId)
    .eq("product_id", productId);
}
