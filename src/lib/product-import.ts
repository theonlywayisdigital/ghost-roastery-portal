// ═══════════════════════════════════════════════════════════════
// Shared product import logic — used by ecommerce import & CSV import
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseClient = any;

// ─── Normalised Types ────────────────────────────────────────

export interface NormalisedProduct {
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
  // CSV-specific fields (optional, not used by ecommerce import)
  category?: string;
  origin?: string;
  tasting_notes?: string;
  brand?: string;
  gtin?: string;
  vat_rate?: number;
  meta_description?: string;
  is_retail?: boolean;
  is_wholesale?: boolean;
  minimum_wholesale_quantity?: number;
  // Stock mapping (optional, set during import wizard stock step)
  roasted_stock_id?: string | null;
  green_bean_id?: string | null;
  is_blend?: boolean;
  blend_components?: { roasted_stock_id: string; percentage: number }[];
}

export interface NormalisedVariant {
  external_id: string;
  sku: string | null;
  price: number | null;
  wholesale_price?: number | null;
  weight_grams: number | null;
  unit: string | null;
  grind_label: string | null;
  stock_quantity: number | null;
  track_stock: boolean;
  image_url: string | null;
  option1_name?: string | null;
  option1_value?: string | null;
  option2_name?: string | null;
  option2_value?: string | null;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  total: number;
}

// ─── Weight / Grind Parsing ──────────────────────────────────

export const WEIGHT_PATTERNS = [
  { pattern: /(\d+(?:\.\d+)?)\s*kg/i, multiplier: 1000 },
  { pattern: /(\d+(?:\.\d+)?)\s*g(?:rams?)?/i, multiplier: 1 },
  { pattern: /(\d+(?:\.\d+)?)\s*oz/i, multiplier: 28.3495 },
  { pattern: /(\d+(?:\.\d+)?)\s*lb/i, multiplier: 453.592 },
];

export const GRIND_KEYWORDS = [
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

export function parseWeightFromOptions(
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

export function parseWeightString(
  weight: string
): { grams: number; unit: string } | null {
  const num = parseFloat(weight);
  if (isNaN(num) || num <= 0) return null;
  const grams = num > 50 ? Math.round(num) : Math.round(num * 1000);
  return { grams, unit: formatWeightUnit(grams) };
}

export function parseGrindFromOptions(options: string[]): string | null {
  for (const opt of options) {
    const lower = opt.toLowerCase().trim();
    for (const keyword of GRIND_KEYWORDS) {
      if (lower.includes(keyword)) {
        return opt.trim();
      }
    }
  }
  return null;
}

export function formatWeightUnit(grams: number | null): string {
  if (grams === null) return "250g";
  if (grams >= 1000) {
    const kg = grams / 1000;
    return kg === Math.floor(kg) ? `${kg}kg` : `${grams}g`;
  }
  return `${grams}g`;
}

export function convertToGrams(weight: number, unit: string): number {
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

// ─── Grind Type Management ───────────────────────────────────

export async function getOrCreateGrindType(
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

// ─── Load Roaster's Grind Types ──────────────────────────────

export async function loadGrindTypeMap(
  supabase: SupabaseClient,
  roasterId: string
): Promise<Map<string, string>> {
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
  return grindTypeMap;
}

// ─── Image Import ───────────────────────────────────────────

const IMAGE_BUCKET = "product-images";

/**
 * Fetch an external image URL, upload it to Supabase storage,
 * and create a product_images row. Updates products.image_url
 * with the new Supabase public URL for backward compatibility.
 */
async function importProductImage(
  supabase: SupabaseClient,
  productId: string,
  roasterId: string,
  externalUrl: string
): Promise<void> {
  try {
    const res = await fetch(externalUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return;

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());

    // Skip if too large (5MB) or not an image
    if (buffer.byteLength > 5 * 1024 * 1024) return;
    if (!contentType.startsWith("image/")) return;

    // Derive extension from content-type
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext = extMap[contentType] || "jpg";
    const storagePath = `${roasterId}/${Date.now()}-imported.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: false });

    if (uploadError) {
      console.error("[import] Image upload failed:", uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    // Create product_images row
    await supabase.from("product_images").insert({
      product_id: productId,
      roaster_id: roasterId,
      storage_path: storagePath,
      url: publicUrl,
      sort_order: 0,
      is_primary: true,
    });

    // Update products.image_url to the Supabase URL
    await supabase
      .from("products")
      .update({ image_url: publicUrl })
      .eq("id", productId);
  } catch (err) {
    // Non-critical — product is still imported, just without a local image copy
    console.error("[import] Image import failed:", err);
  }
}

// ─── Product Creation ────────────────────────────────────────

export async function createNewProduct(
  supabase: SupabaseClient,
  product: NormalisedProduct,
  roasterId: string,
  grindTypeMap: Map<string, string>,
  connectionId?: string
) {
  const plainDescription = product.description
    ? product.description.replace(/<[^>]*>/g, "").trim()
    : null;

  const firstVariant = product.variants[0];

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
      is_retail: product.is_retail ?? true,
      is_wholesale: product.is_wholesale ?? false,
      track_stock: product.track_stock,
      retail_stock_count: product.stock_quantity,
      category: product.category || "coffee",
      ...(product.origin && { origin: product.origin }),
      ...(product.tasting_notes && { tasting_notes: product.tasting_notes }),
      ...(product.brand && { brand: product.brand }),
      ...(product.gtin && { gtin: product.gtin }),
      ...(product.vat_rate != null && { vat_rate: product.vat_rate }),
      ...(product.meta_description && { meta_description: product.meta_description }),
      ...(product.minimum_wholesale_quantity != null && {
        minimum_wholesale_quantity: product.minimum_wholesale_quantity,
      }),
      // Stock mapping
      roasted_stock_id: (!product.is_blend && product.roasted_stock_id) || null,
      green_bean_id: product.green_bean_id || null,
      is_blend: product.is_blend ?? false,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create product: ${error?.message}`);
  }

  // Insert blend components if this is a blend product
  if (product.is_blend && product.blend_components && product.blend_components.length > 0) {
    const componentRows = product.blend_components.map((bc) => ({
      product_id: created.id,
      roasted_stock_id: bc.roasted_stock_id,
      percentage: bc.percentage,
    }));
    await supabase.from("blend_components").insert(componentRows);
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
          ...(v.wholesale_price != null && { wholesale_price: v.wholesale_price }),
          retail_stock_count: v.stock_quantity,
          track_stock: v.track_stock,
          is_active: true,
          channel: product.is_wholesale ? "wholesale" : "retail",
        })
        .select("id")
        .single();

      if (insertedVariant) {
        externalVariantMap[insertedVariant.id] = v.external_id;
      }
    }
  }

  // Import product image to Supabase storage + product_images table
  if (product.image_url) {
    await importProductImage(supabase, created.id, roasterId, product.image_url);
  }

  // Create ecommerce mapping if connectionId provided
  if (connectionId) {
    await supabase.from("product_channel_mappings").insert({
      roaster_id: roasterId,
      connection_id: connectionId,
      product_id: created.id,
      external_product_id: product.external_id,
      external_variant_ids: externalVariantMap,
      last_synced_at: new Date().toISOString(),
    });
  }

  return created.id;
}

// ─── Product Update ──────────────────────────────────────────

export async function updateExistingProduct(
  supabase: SupabaseClient,
  productId: string,
  product: NormalisedProduct,
  roasterId: string,
  grindTypeMap: Map<string, string>,
  connectionId?: string,
  existingVariantMap?: Record<string, string>
) {
  const plainDescription = product.description
    ? product.description.replace(/<[^>]*>/g, "").trim()
    : null;

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
  if (existingVariantMap) {
    for (const [ghostId, extId] of Object.entries(existingVariantMap)) {
      extToGhost.set(extId, ghostId);
    }
  }

  const updatedVariantMap = { ...(existingVariantMap || {}) };

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
          ...(v.wholesale_price != null && { wholesale_price: v.wholesale_price }),
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

  // Import product image if no product_images rows exist yet
  if (product.image_url) {
    const { count } = await supabase
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);

    if ((count || 0) === 0) {
      await importProductImage(supabase, productId, roasterId, product.image_url);
    }
  }

  // Update ecommerce mapping if connectionId provided
  if (connectionId) {
    await supabase
      .from("product_channel_mappings")
      .update({
        external_variant_ids: updatedVariantMap,
        last_synced_at: new Date().toISOString(),
      })
      .eq("connection_id", connectionId)
      .eq("product_id", productId);
  }
}
