import { createServerClient } from "@/lib/supabase";

export interface WooVariation {
  id: number;
  sku: string;
  price: string;
  regular_price: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  status: string;
  attributes: { id: number; name: string; option: string }[];
  image: { src: string } | null;
  weight: string;
}

export interface WooImage {
  id: number;
  src: string;
  position: number;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  type: string; // "simple" | "variable" | "grouped" | "external"
  status: string; // "publish" | "draft" | "pending" | "private"
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  weight: string;
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  images: WooImage[];
  attributes: {
    id: number;
    name: string;
    options: string[];
    variation: boolean;
  }[];
  variations: number[]; // IDs only — need separate fetch
  _variations?: WooVariation[]; // Populated by fetchWooCommerceProducts
}

interface WooClient {
  baseUrl: string;
  headers: Record<string, string>;
  connectionId: string;
  roasterId: string;
}

export async function getWooCommerceClient(
  connectionId: string
): Promise<WooClient> {
  const supabase = createServerClient();
  const { data: conn, error } = await supabase
    .from("ecommerce_connections")
    .select("id, roaster_id, store_url, access_token, api_secret")
    .eq("id", connectionId)
    .eq("provider", "woocommerce")
    .single();

  if (error || !conn) {
    throw new Error("WooCommerce connection not found");
  }

  if (!conn.access_token || !conn.api_secret) {
    throw new Error("WooCommerce credentials missing");
  }

  const authHeader = Buffer.from(
    `${conn.access_token}:${conn.api_secret}`
  ).toString("base64");

  return {
    baseUrl: `https://${conn.store_url}/wp-json/wc/v3`,
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    connectionId: conn.id,
    roasterId: conn.roaster_id,
  };
}

export async function fetchWooCommerceProducts(
  connectionId: string
): Promise<WooProduct[]> {
  const client = await getWooCommerceClient(connectionId);
  const allProducts: WooProduct[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${client.baseUrl}/products?page=${page}&per_page=${perPage}&status=publish`,
      { headers: client.headers }
    );
    if (!res.ok) {
      throw new Error(`WooCommerce API error: ${res.status} ${res.statusText}`);
    }
    const products: WooProduct[] = await res.json();
    if (products.length === 0) break;
    allProducts.push(...products);
    if (products.length < perPage) break;
    page++;
  }

  // Fetch variations for variable products
  for (const product of allProducts) {
    if (
      product.type === "variable" &&
      product.variations &&
      product.variations.length > 0
    ) {
      product._variations = await fetchWooVariations(client, product.id);
    }
  }

  return allProducts;
}

async function fetchWooVariations(
  client: WooClient,
  productId: number
): Promise<WooVariation[]> {
  const allVariations: WooVariation[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${client.baseUrl}/products/${productId}/variations?page=${page}&per_page=${perPage}`,
      { headers: client.headers }
    );
    if (!res.ok) break;
    const variations: WooVariation[] = await res.json();
    if (variations.length === 0) break;
    allVariations.push(...variations);
    if (variations.length < perPage) break;
    page++;
  }

  return allVariations;
}

export async function fetchWooCommerceProduct(
  connectionId: string,
  productId: string | number
): Promise<WooProduct> {
  const client = await getWooCommerceClient(connectionId);
  const res = await fetch(`${client.baseUrl}/products/${productId}`, {
    headers: client.headers,
  });

  if (!res.ok) {
    throw new Error(`WooCommerce API error: ${res.status} ${res.statusText}`);
  }

  const product: WooProduct = await res.json();

  // Fetch variations for variable products
  if (
    product.type === "variable" &&
    product.variations &&
    product.variations.length > 0
  ) {
    product._variations = await fetchWooVariations(client, product.id);
  }

  return product;
}
