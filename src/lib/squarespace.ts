import { createServerClient } from "@/lib/supabase";

export interface SquarespaceVariant {
  id: string;
  sku: string;
  pricing: {
    basePrice: { value: string; currency: string };
    salePrice?: { value: string; currency: string } | null;
    onSale: boolean;
  };
  stock: { quantity: number; unlimited: boolean };
  attributes: Record<string, string>; // e.g. { "Weight": "250g", "Grind": "Whole Bean" }
  shippingMeasurements?: {
    weight?: { value: number; unit: string };
  } | null;
  image?: { id: string; url: string } | null;
}

export interface SquarespaceImage {
  id: string;
  url: string;
  orderIndex: number;
}

export interface SquarespaceProduct {
  id: string;
  name: string;
  description: string;
  url: string;
  type: string; // "PHYSICAL" | "DIGITAL" | "SERVICE"
  isVisible: boolean;
  tags: string[];
  variants: SquarespaceVariant[];
  images: SquarespaceImage[];
}

interface SquarespaceClient {
  baseUrl: string;
  headers: Record<string, string>;
  connectionId: string;
  roasterId: string;
}

export async function getSquarespaceClient(
  connectionId: string
): Promise<SquarespaceClient> {
  const supabase = createServerClient();
  const { data: conn, error } = await supabase
    .from("ecommerce_connections")
    .select("id, roaster_id, store_url, access_token")
    .eq("id", connectionId)
    .eq("provider", "squarespace")
    .single();

  if (error || !conn) {
    throw new Error("Squarespace connection not found");
  }

  if (!conn.access_token) {
    throw new Error("Squarespace API key missing");
  }

  return {
    baseUrl: "https://api.squarespace.com/1.0/commerce",
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      "Content-Type": "application/json",
      "User-Agent": "GhostRoastery/1.0",
    },
    connectionId: conn.id,
    roasterId: conn.roaster_id,
  };
}

/**
 * Fetch all products from Squarespace using cursor-based pagination.
 */
export async function fetchSquarespaceProducts(
  connectionId: string
): Promise<SquarespaceProduct[]> {
  const client = await getSquarespaceClient(connectionId);
  const allProducts: SquarespaceProduct[] = [];

  let cursor: string | null = null;

  while (true) {
    const fetchUrl: string = cursor
      ? `${client.baseUrl}/products?cursor=${encodeURIComponent(cursor)}`
      : `${client.baseUrl}/products`;

    const res: Response = await fetch(fetchUrl, { headers: client.headers });
    if (!res.ok) {
      throw new Error(
        `Squarespace API error: ${res.status} ${res.statusText}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    if (data.products) {
      allProducts.push(...data.products);
    }

    // Squarespace uses cursor-based pagination
    if (data.pagination?.hasNextPage && data.pagination.nextPageCursor) {
      cursor = data.pagination.nextPageCursor;
    } else {
      break;
    }
  }

  return allProducts;
}

/**
 * Fetch a single product by ID.
 */
export async function fetchSquarespaceProduct(
  connectionId: string,
  productId: string
): Promise<SquarespaceProduct> {
  const client = await getSquarespaceClient(connectionId);
  const res = await fetch(`${client.baseUrl}/products/${productId}`, {
    headers: client.headers,
  });

  if (!res.ok) {
    throw new Error(
      `Squarespace API error: ${res.status} ${res.statusText}`
    );
  }

  return await res.json();
}
