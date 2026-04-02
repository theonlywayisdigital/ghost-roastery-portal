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
import {
  fetchWixProducts,
  type WixProduct,
  type WixVariant,
} from "@/lib/wix";
import {
  type NormalisedProduct,
  type NormalisedVariant,
  type ImportMappingOptions,
  parseWeightFromOptions,
  parseWeightString,
  parseGrindFromOptions,
  formatWeightUnit,
  convertToGrams,
  createNewProduct,
  updateExistingProduct,
  loadGrindTypeMap,
} from "@/lib/product-import";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { connectionId, selectedProductIds, isCoffee, weightAttributeName } = body as {
    connectionId: string;
    selectedProductIds?: string[];
    isCoffee?: boolean;
    weightAttributeName?: string | null;
  };

  const mappingOptions: ImportMappingOptions | undefined =
    isCoffee !== undefined
      ? { isCoffee, weightAttributeName: weightAttributeName ?? null }
      : undefined;

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
  const grindTypeMap = await loadGrindTypeMap(supabase, roasterId);

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
    } else if (connection.provider === "wix") {
      const wixProducts = await fetchWixProducts(connectionId);
      normalised = wixProducts.map(normaliseWixProduct);
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
          await updateExistingProduct(
            supabase,
            existing.product_id,
            product,
            roasterId,
            grindTypeMap,
            connectionId,
            existing.external_variant_ids
          );
          updated++;
        } else {
          await createNewProduct(
            supabase,
            product,
            roasterId,
            grindTypeMap,
            connectionId,
            mappingOptions
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
    option_names: p.options?.map((o) => o.name) || [],
  };
}

function normaliseShopifyVariant(
  v: ShopifyVariant,
  product: ShopifyProduct
): NormalisedVariant {
  const optionValues = [v.option1, v.option2, v.option3].filter(Boolean);
  const weightInfo = parseWeightFromOptions(optionValues as string[]);
  const grindLabel = parseGrindFromOptions(optionValues as string[]);

  let weightGrams = weightInfo?.grams ?? null;
  if (weightGrams === null && v.weight > 0) {
    weightGrams = convertToGrams(v.weight, v.weight_unit);
  }

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
    option1_name: product.options?.[0]?.name || null,
    option1_value: v.option1 || null,
    option2_name: product.options?.[1]?.name || null,
    option2_value: v.option2 || null,
    option3_name: product.options?.[2]?.name || null,
    option3_value: v.option3 || null,
  };
}

function normaliseWooProduct(p: WooProduct): NormalisedProduct {
  if (p.type === "variable" && p._variations && p._variations.length > 0) {
    // Extract attribute names from product-level attributes
    const attrNames = p.attributes?.map((a) => a.name) || [];
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
      variants: p._variations.map((v) => normaliseWooVariation(v, attrNames)),
      option_names: attrNames,
    };
  }

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

function normaliseWooVariation(v: WooVariation, attrNames: string[] = []): NormalisedVariant {
  const attrValues = v.attributes.map((a) => a.option);
  const weightInfo = parseWeightFromOptions(attrValues);
  const grindLabel = parseGrindFromOptions(attrValues);

  let weightGrams = weightInfo?.grams ?? null;
  if (weightGrams === null && v.weight) {
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
    option1_name: v.attributes?.[0]?.name || attrNames[0] || null,
    option1_value: v.attributes?.[0]?.option || null,
    option2_name: v.attributes?.[1]?.name || attrNames[1] || null,
    option2_value: v.attributes?.[1]?.option || null,
    option3_name: v.attributes?.[2]?.name || attrNames[2] || null,
    option3_value: v.attributes?.[2]?.option || null,
  };
}

function normaliseSquarespaceProduct(
  p: SquarespaceProduct
): NormalisedProduct {
  const firstVariant = p.variants?.[0];
  const priceValue = firstVariant?.pricing?.basePrice?.value;
  const price = priceValue ? parseFloat(priceValue) : null;

  // Extract attribute names from first variant's attributes
  const attrNames = firstVariant?.attributes ? Object.keys(firstVariant.attributes) : [];

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
    option_names: attrNames,
  };
}

function normaliseSquarespaceVariant(
  v: SquarespaceVariant,
  product: SquarespaceProduct
): NormalisedVariant {
  const attrValues = Object.values(v.attributes || {});
  const weightInfo = parseWeightFromOptions(attrValues);
  const grindLabel = parseGrindFromOptions(attrValues);

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

  const priceValue = v.pricing?.basePrice?.value;
  const price = priceValue ? parseFloat(priceValue) : null;

  const attrKeys = Object.keys(v.attributes || {});
  const attrVals = Object.values(v.attributes || {});

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
    option1_name: attrKeys[0] || null,
    option1_value: attrVals[0] || null,
    option2_name: attrKeys[1] || null,
    option2_value: attrVals[1] || null,
    option3_name: attrKeys[2] || null,
    option3_value: attrVals[2] || null,
  };
}

function normaliseWixProduct(p: WixProduct): NormalisedProduct {
  const firstVariant = p.variants?.[0];
  const choiceKeys = firstVariant?.choices ? Object.keys(firstVariant.choices) : [];

  return {
    external_id: String(p.id),
    name: p.name,
    description: p.description || null,
    image_url: p.media?.mainMedia?.image?.url || p.media?.items?.[0]?.image?.url || null,
    sku: p.sku || firstVariant?.sku || null,
    price: p.price?.price ?? firstVariant?.priceData?.price ?? null,
    status: p.visible ? "published" : "draft",
    track_stock: p.stock?.trackInventory ?? firstVariant?.stock?.trackInventory ?? false,
    stock_quantity: p.stock?.quantity ?? firstVariant?.stock?.quantity ?? null,
    variants: (p.variants || []).map((v) => normaliseWixVariant(v, p)),
    option_names: choiceKeys,
  };
}

function normaliseWixVariant(
  v: WixVariant,
  product: WixProduct
): NormalisedVariant {
  const choiceValues = Object.values(v.choices || {});
  const weightInfo = parseWeightFromOptions(choiceValues);
  const grindLabel = parseGrindFromOptions(choiceValues);

  let weightGrams = weightInfo?.grams ?? null;
  if (weightGrams === null && v.weight && v.weight > 0) {
    weightGrams = Math.round(v.weight * 1000);
  }

  const choiceKeys = Object.keys(v.choices || {});
  const choiceVals = Object.values(v.choices || {});

  return {
    external_id: String(v.id),
    sku: v.sku || null,
    price: v.priceData?.price ?? null,
    weight_grams: weightGrams,
    unit: weightInfo?.unit ?? formatWeightUnit(weightGrams),
    grind_label: grindLabel,
    stock_quantity: v.stock?.quantity ?? null,
    track_stock: v.stock?.trackInventory ?? false,
    image_url:
      v.media?.mainMedia?.image?.url ||
      product.media?.mainMedia?.image?.url ||
      null,
    option1_name: choiceKeys[0] || null,
    option1_value: choiceVals[0] || null,
    option2_name: choiceKeys[1] || null,
    option2_value: choiceVals[1] || null,
    option3_name: choiceKeys[2] || null,
    option3_value: choiceVals[2] || null,
  };
}
