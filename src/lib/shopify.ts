import { createServerClient } from "@/lib/supabase";

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  inventory_quantity: number;
  inventory_management: string | null;
  weight: number;
  weight_unit: string;
  image_id: number | null;
}

export interface ShopifyImage {
  id: number;
  src: string;
  position: number;
  variant_ids: number[];
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  status: string;
  tags: string;
  variants: ShopifyVariant[];
  options: { id: number; name: string; values: string[] }[];
  images: ShopifyImage[];
  image: { src: string } | null;
}

interface ShopifyClient {
  baseUrl: string;
  headers: Record<string, string>;
  connectionId: string;
  roasterId: string;
}

export async function getShopifyClient(
  connectionId: string
): Promise<ShopifyClient> {
  const supabase = createServerClient();
  const { data: conn, error } = await supabase
    .from("ecommerce_connections")
    .select("id, roaster_id, store_url, access_token")
    .eq("id", connectionId)
    .eq("provider", "shopify")
    .single();

  if (error || !conn) {
    throw new Error("Shopify connection not found");
  }

  if (!conn.access_token) {
    throw new Error("Shopify access token missing");
  }

  return {
    baseUrl: `https://${conn.store_url}/admin/api/2024-01`,
    headers: {
      "X-Shopify-Access-Token": conn.access_token,
      "Content-Type": "application/json",
    },
    connectionId: conn.id,
    roasterId: conn.roaster_id,
  };
}

/**
 * Parse Shopify Link header for pagination.
 * Format: <https://store.myshopify.com/admin/api/2024-01/products.json?page_info=xxx>; rel="next"
 */
function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

export async function fetchShopifyProducts(
  connectionId: string
): Promise<ShopifyProduct[]> {
  const client = await getShopifyClient(connectionId);
  const allProducts: ShopifyProduct[] = [];

  let url: string | null =
    `${client.baseUrl}/products.json?limit=250&status=active`;

  while (url) {
    const res = await fetch(url, { headers: client.headers });
    if (!res.ok) {
      throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.products) {
      allProducts.push(...data.products);
    }
    url = parseNextLink(res.headers.get("link"));
  }

  return allProducts;
}

export async function fetchShopifyProduct(
  connectionId: string,
  productId: string | number
): Promise<ShopifyProduct> {
  const client = await getShopifyClient(connectionId);
  const res = await fetch(`${client.baseUrl}/products/${productId}.json`, {
    headers: client.headers,
  });

  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.product;
}
