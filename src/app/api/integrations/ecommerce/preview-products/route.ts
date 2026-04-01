import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { fetchShopifyProducts, type ShopifyProduct } from "@/lib/shopify";
import {
  fetchWooCommerceProducts,
  type WooProduct,
} from "@/lib/woocommerce";
import {
  fetchSquarespaceProducts,
  type SquarespaceProduct,
} from "@/lib/squarespace";
import { fetchWixProducts, type WixProduct } from "@/lib/wix";

export interface PreviewProduct {
  external_id: string;
  name: string;
  image_url: string | null;
  price: string | null;
  sku: string | null;
  variant_count: number;
  status: string;
  already_imported: boolean;
  mapped_product_id: string | null;
}

export async function GET(request: Request) {
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

  // Fetch existing mappings for this connection
  const { data: existingMappings } = await supabase
    .from("product_channel_mappings")
    .select("external_product_id, product_id")
    .eq("connection_id", connectionId);

  const mappedExternalIds = new Map<string, string>();
  if (existingMappings) {
    for (const m of existingMappings) {
      mappedExternalIds.set(m.external_product_id, m.product_id);
    }
  }

  try {
    let products: PreviewProduct[] = [];

    if (connection.provider === "shopify") {
      const shopifyProducts = await fetchShopifyProducts(connectionId);
      products = shopifyProducts.map((p: ShopifyProduct) =>
        normaliseShopifyPreview(p, mappedExternalIds)
      );
    } else if (connection.provider === "woocommerce") {
      const wooProducts = await fetchWooCommerceProducts(connectionId);
      products = wooProducts.map((p: WooProduct) =>
        normaliseWooPreview(p, mappedExternalIds)
      );
    } else if (connection.provider === "squarespace") {
      const sqProducts = await fetchSquarespaceProducts(connectionId);
      products = sqProducts.map((p: SquarespaceProduct) =>
        normaliseSquarespacePreview(p, mappedExternalIds)
      );
    } else if (connection.provider === "wix") {
      const wixProducts = await fetchWixProducts(connectionId);
      products = wixProducts.map((p: WixProduct) =>
        normaliseWixPreview(p, mappedExternalIds)
      );
    }

    return NextResponse.json({ products, total: products.length });
  } catch (err) {
    console.error("[ecommerce] Preview products error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to fetch products",
      },
      { status: 500 }
    );
  }
}

function normaliseShopifyPreview(
  p: ShopifyProduct,
  mappedExternalIds: Map<string, string>
): PreviewProduct {
  const extId = String(p.id);
  return {
    external_id: extId,
    name: p.title,
    image_url: p.image?.src || p.images?.[0]?.src || null,
    price: p.variants?.[0]?.price || null,
    sku: p.variants?.[0]?.sku || null,
    variant_count: p.variants?.length || 0,
    status: p.status,
    already_imported: mappedExternalIds.has(extId),
    mapped_product_id: mappedExternalIds.get(extId) || null,
  };
}

function normaliseWooPreview(
  p: WooProduct,
  mappedExternalIds: Map<string, string>
): PreviewProduct {
  const extId = String(p.id);
  const variantCount =
    p.type === "variable"
      ? p._variations?.length || p.variations?.length || 0
      : 1;
  return {
    external_id: extId,
    name: p.name,
    image_url: p.images?.[0]?.src || null,
    price: p.price || p.regular_price || null,
    sku: p.sku || null,
    variant_count: variantCount,
    status: p.status,
    already_imported: mappedExternalIds.has(extId),
    mapped_product_id: mappedExternalIds.get(extId) || null,
  };
}

function normaliseSquarespacePreview(
  p: SquarespaceProduct,
  mappedExternalIds: Map<string, string>
): PreviewProduct {
  const extId = String(p.id);
  const firstVariant = p.variants?.[0];
  const priceValue = firstVariant?.pricing?.basePrice?.value;
  const priceStr = priceValue
    ? parseFloat(priceValue).toFixed(2)
    : null;

  return {
    external_id: extId,
    name: p.name,
    image_url: p.images?.[0]?.url || null,
    price: priceStr,
    sku: firstVariant?.sku || null,
    variant_count: p.variants?.length || 0,
    status: p.isVisible ? "active" : "draft",
    already_imported: mappedExternalIds.has(extId),
    mapped_product_id: mappedExternalIds.get(extId) || null,
  };
}

function normaliseWixPreview(
  p: WixProduct,
  mappedExternalIds: Map<string, string>
): PreviewProduct {
  const extId = String(p.id);
  return {
    external_id: extId,
    name: p.name,
    image_url: p.media?.mainMedia?.image?.url || null,
    price: p.price?.price != null ? p.price.price.toFixed(2) : null,
    sku: p.sku || p.variants?.[0]?.sku || null,
    variant_count: p.variants?.length || 0,
    status: p.visible ? "active" : "draft",
    already_imported: mappedExternalIds.has(extId),
    mapped_product_id: mappedExternalIds.get(extId) || null,
  };
}
