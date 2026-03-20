import { createServerClient } from "@/lib/supabase";

export interface WixVariant {
  id: string;
  sku: string;
  priceData: {
    price: number;
    currency: string;
    discountedPrice?: number;
  };
  weight?: number; // kg
  stock: {
    trackInventory: boolean;
    quantity: number;
    inStock: boolean;
  };
  choices: Record<string, string>; // e.g. { "Weight": "250g", "Grind": "Whole Bean" }
  media?: { mainMedia?: { image?: { url: string } } };
}

export interface WixImage {
  url: string;
  width: number;
  height: number;
}

export interface WixProduct {
  id: string;
  name: string;
  description: string;
  slug: string;
  productType: string; // "physical" | "digital"
  visible: boolean;
  ribbon?: string;
  brand?: string;
  media: {
    mainMedia?: { image?: WixImage };
    items?: { image?: WixImage }[];
  };
  variants: WixVariant[];
  productOptions?: {
    name: string;
    optionType: string;
    choices: { value: string; description: string }[];
  }[];
  stock: {
    trackInventory: boolean;
    quantity?: number;
    inStock: boolean;
  };
  price: {
    price: number;
    currency: string;
    discountedPrice?: number;
  };
  sku?: string;
}

interface WixClient {
  baseUrl: string;
  headers: Record<string, string>;
  connectionId: string;
  roasterId: string;
}

/**
 * Get a Wix API client for a given connection.
 * Automatically refreshes the access token if it has expired (5 min lifetime).
 */
export async function getWixClient(
  connectionId: string
): Promise<WixClient> {
  const supabase = createServerClient();
  const { data: conn, error } = await supabase
    .from("ecommerce_connections")
    .select("id, roaster_id, store_url, access_token, api_secret, settings")
    .eq("id", connectionId)
    .eq("provider", "wix")
    .single();

  if (error || !conn) {
    throw new Error("Wix connection not found");
  }

  if (!conn.access_token) {
    throw new Error("Wix access token missing");
  }

  // Check if access token needs refresh (stored token_expires_at in settings)
  const settings = (conn.settings as Record<string, unknown>) || {};
  const tokenExpiresAt = settings.token_expires_at
    ? new Date(settings.token_expires_at as string).getTime()
    : 0;
  const now = Date.now();

  let accessToken = conn.access_token;

  // Refresh if token expires within 60 seconds
  if (tokenExpiresAt > 0 && now > tokenExpiresAt - 60_000) {
    const refreshToken = conn.api_secret; // We store refresh_token in api_secret
    if (!refreshToken) {
      throw new Error("Wix refresh token missing — please reconnect");
    }

    const clientSecret = process.env.WIX_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error("WIX_CLIENT_SECRET not configured");
    }

    const tokenRes = await fetch("https://www.wixapis.com/oauth/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: process.env.WIX_CLIENT_ID,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(
        `Wix token refresh failed: ${tokenRes.status} ${tokenRes.statusText}`
      );
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;

    // Update stored tokens
    const newExpiresAt = new Date(
      Date.now() + (tokenData.expires_in || 300) * 1000
    ).toISOString();

    await supabase
      .from("ecommerce_connections")
      .update({
        access_token: accessToken,
        api_secret: tokenData.refresh_token || refreshToken,
        settings: {
          ...settings,
          token_expires_at: newExpiresAt,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);
  }

  return {
    baseUrl: "https://www.wixapis.com",
    headers: {
      Authorization: accessToken,
      "Content-Type": "application/json",
    },
    connectionId: conn.id,
    roasterId: conn.roaster_id,
  };
}

/**
 * Fetch all products from Wix using offset-based pagination.
 * Note: The query endpoint does NOT return variant data — individual
 * product fetches are needed for variants.
 */
export async function fetchWixProducts(
  connectionId: string
): Promise<WixProduct[]> {
  const client = await getWixClient(connectionId);
  const allProducts: WixProduct[] = [];

  let offset = 0;
  const limit = 100;

  while (true) {
    const res: Response = await fetch(
      `${client.baseUrl}/stores/v1/products/query`,
      {
        method: "POST",
        headers: client.headers,
        body: JSON.stringify({
          query: {
            paging: { limit, offset },
          },
          includeVariants: true,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Wix API error: ${res.status} ${res.statusText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const products = data.products || [];

    if (products.length === 0) break;

    // For each product, fetch full data to get variants
    for (const p of products) {
      try {
        const fullProduct = await fetchWixProduct(connectionId, p.id, client);
        allProducts.push(fullProduct);
      } catch {
        // If individual fetch fails, use the query data (no variants)
        allProducts.push(p);
      }
    }

    if (products.length < limit) break;
    offset += limit;
  }

  return allProducts;
}

/**
 * Fetch a single product by ID (includes variant data).
 */
export async function fetchWixProduct(
  connectionId: string,
  productId: string,
  existingClient?: WixClient
): Promise<WixProduct> {
  const client = existingClient || (await getWixClient(connectionId));
  const res = await fetch(
    `${client.baseUrl}/stores/v1/products/${productId}`,
    { headers: client.headers }
  );

  if (!res.ok) {
    throw new Error(`Wix API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.product;
}
