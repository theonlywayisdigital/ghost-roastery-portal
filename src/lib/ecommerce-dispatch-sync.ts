import { createServerClient } from "@/lib/supabase";

/**
 * Push dispatch/fulfilment status to the external ecommerce platform when
 * a storefront or wholesale order is marked as dispatched.
 *
 * Looks up the order's external_order_id + external_source, finds the
 * matching ecommerce_connection, and calls the platform-specific fulfilment API.
 *
 * Supported platforms:
 * - Shopify: POST fulfillments with tracking info
 * - WooCommerce: PUT order status to "completed" with tracking note
 * - Wix: POST fulfillment with tracking info
 * - Squarespace: POST shipment with tracking info
 */
export async function pushDispatchToChannels(orderId: string): Promise<void> {
  const supabase = createServerClient();

  // Fetch the order with external mapping and tracking info
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, roaster_id, external_order_id, external_source, tracking_number, tracking_carrier"
    )
    .eq("id", orderId)
    .single();

  if (!order || !order.external_order_id || !order.external_source) {
    // Not an externally-sourced order — nothing to push
    return;
  }

  // Find the matching ecommerce connection
  const { data: connections } = await supabase
    .from("ecommerce_connections")
    .select("id, provider, store_url, access_token, api_secret, is_active, settings")
    .eq("roaster_id", order.roaster_id)
    .eq("provider", order.external_source)
    .eq("is_active", true);

  if (!connections || connections.length === 0) return;

  // Use the first active connection for this provider
  const conn = connections[0];

  try {
    if (conn.provider === "shopify") {
      await pushDispatchToShopify(
        conn,
        order.external_order_id,
        order.tracking_number,
        order.tracking_carrier
      );
    } else if (conn.provider === "woocommerce") {
      await pushDispatchToWooCommerce(
        conn,
        order.external_order_id,
        order.tracking_number,
        order.tracking_carrier
      );
    } else if (conn.provider === "wix") {
      await pushDispatchToWix(
        conn,
        order.external_order_id,
        order.tracking_number,
        order.tracking_carrier
      );
    } else if (conn.provider === "squarespace") {
      await pushDispatchToSquarespace(
        conn,
        order.external_order_id,
        order.tracking_number,
        order.tracking_carrier
      );
    }
  } catch (err) {
    console.error(
      `[dispatch-sync] Failed to push dispatch to ${conn.provider} (order ${order.external_order_id}):`,
      err
    );
  }
}

// ─── Shopify fulfilment push ──────────────────────────────────────────
//
// Creates a fulfilment on the Shopify order with tracking info.
// Requires read_orders + write_orders scopes (already granted).
//
// Steps:
// 1. Fetch the order to get fulfilment_orders (REST API 2024-01)
// 2. Create a fulfilment via POST /admin/api/2024-01/fulfillments.json

async function pushDispatchToShopify(
  conn: { store_url: string; access_token: string },
  externalOrderId: string,
  trackingNumber: string | null,
  trackingCarrier: string | null
): Promise<void> {
  const baseUrl = `https://${conn.store_url}/admin/api/2024-01`;
  const headers = {
    "X-Shopify-Access-Token": conn.access_token,
    "Content-Type": "application/json",
  };

  // Fetch fulfillment orders for this order
  const foRes = await fetch(
    `${baseUrl}/orders/${externalOrderId}/fulfillment_orders.json`,
    { headers }
  );

  if (!foRes.ok) {
    console.error(
      `[dispatch-sync] Shopify fulfillment_orders fetch failed (${foRes.status})`
    );
    return;
  }

  const foData = await foRes.json();
  const fulfillmentOrders = foData.fulfillment_orders || [];

  // Collect open fulfillment order line items
  const lineItemsByFulfillmentOrder: {
    fulfillment_order_id: number;
    fulfillment_order_line_items: { id: number; quantity: number }[];
  }[] = [];

  for (const fo of fulfillmentOrders) {
    if (fo.status === "closed" || fo.status === "cancelled") continue;
    const lineItems = (fo.line_items || []).map(
      (li: { id: number; fulfillable_quantity: number }) => ({
        id: li.id,
        quantity: li.fulfillable_quantity,
      })
    );
    if (lineItems.length > 0) {
      lineItemsByFulfillmentOrder.push({
        fulfillment_order_id: fo.id,
        fulfillment_order_line_items: lineItems,
      });
    }
  }

  if (lineItemsByFulfillmentOrder.length === 0) {
    console.log(
      `[dispatch-sync] Shopify order ${externalOrderId} has no fulfillable items`
    );
    return;
  }

  // Map our carrier names to Shopify tracking company names
  const carrierMap: Record<string, string> = {
    "Royal Mail": "Royal Mail",
    DPD: "DPD UK",
    DHL: "DHL Express",
    Evri: "Evri",
    UPS: "UPS",
    FedEx: "FedEx",
    Parcelforce: "Parcelforce",
  };

  const trackingCompany = trackingCarrier
    ? carrierMap[trackingCarrier] || trackingCarrier
    : undefined;

  const fulfillmentPayload: Record<string, unknown> = {
    fulfillment: {
      line_items_by_fulfillment_order: lineItemsByFulfillmentOrder,
      notify_customer: false, // We send our own dispatch email
      ...(trackingNumber || trackingCompany
        ? {
            tracking_info: {
              ...(trackingNumber ? { number: trackingNumber } : {}),
              ...(trackingCompany ? { company: trackingCompany } : {}),
            },
          }
        : {}),
    },
  };

  const fulfillRes = await fetch(`${baseUrl}/fulfillments.json`, {
    method: "POST",
    headers,
    body: JSON.stringify(fulfillmentPayload),
  });

  if (!fulfillRes.ok) {
    const errText = await fulfillRes.text();
    console.error(
      `[dispatch-sync] Shopify fulfillment create failed (${fulfillRes.status}):`,
      errText
    );
  } else {
    console.log(
      `[dispatch-sync] Shopify order ${externalOrderId} fulfilled on ${conn.store_url}`
    );
  }
}

// ─── WooCommerce fulfilment push ──────────────────────────────────────
//
// Updates the WooCommerce order status to "completed" and adds a note
// with tracking information.

async function pushDispatchToWooCommerce(
  conn: { store_url: string; access_token: string; api_secret: string },
  externalOrderId: string,
  trackingNumber: string | null,
  trackingCarrier: string | null
): Promise<void> {
  const baseUrl = `https://${conn.store_url}/wp-json/wc/v3`;
  const authHeader = Buffer.from(
    `${conn.access_token}:${conn.api_secret}`
  ).toString("base64");
  const headers = {
    Authorization: `Basic ${authHeader}`,
    "Content-Type": "application/json",
  };

  // Update order status to completed
  const updateRes = await fetch(
    `${baseUrl}/orders/${externalOrderId}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ status: "completed" }),
    }
  );

  if (!updateRes.ok) {
    console.error(
      `[dispatch-sync] WooCommerce order status update failed (${updateRes.status})`
    );
    return;
  }

  // Add tracking info as an order note
  if (trackingNumber || trackingCarrier) {
    const noteContent = [
      "Order dispatched by Roastery Platform.",
      trackingCarrier ? `Carrier: ${trackingCarrier}` : null,
      trackingNumber ? `Tracking: ${trackingNumber}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    await fetch(`${baseUrl}/orders/${externalOrderId}/notes`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        note: noteContent,
        customer_note: true,
      }),
    });
  }

  console.log(
    `[dispatch-sync] WooCommerce order ${externalOrderId} marked completed on ${conn.store_url}`
  );
}

// ─── Wix fulfilment push ─────────────────────────────────────────────
//
// Creates a fulfilment on the Wix order via the eCommerce Fulfillments API.
// The Wix access token may need refreshing — if the initial request fails
// with 401 we attempt a token refresh using the stored refresh token.

async function pushDispatchToWix(
  conn: {
    store_url: string;
    access_token: string;
    api_secret: string;
    settings: Record<string, unknown> | null;
  },
  externalOrderId: string,
  trackingNumber: string | null,
  trackingCarrier: string | null
): Promise<void> {
  let token = conn.access_token;

  // Wix access tokens expire after 5 minutes — try to refresh if needed
  const tokenExpiresAt = (conn.settings as Record<string, string> | null)
    ?.token_expires_at;
  if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
    const refreshed = await refreshWixToken(conn.api_secret);
    if (refreshed) {
      token = refreshed.accessToken;
      // Update the stored token (fire-and-forget)
      const supabase = createServerClient();
      supabase
        .from("ecommerce_connections")
        .update({
          access_token: refreshed.accessToken,
          settings: {
            ...(conn.settings as Record<string, unknown>),
            token_expires_at: refreshed.expiresAt,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("provider", "wix")
        .eq("store_url", conn.store_url)
        .then(({ error }) => {
          if (error)
            console.error("[dispatch-sync] Wix token update failed:", error);
        });
    }
  }

  // First, fetch the order to get line items for the fulfillment
  const orderRes = await fetch(
    `https://www.wixapis.com/stores/v2/orders/${externalOrderId}`,
    {
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    }
  );

  if (!orderRes.ok) {
    console.error(
      `[dispatch-sync] Wix order fetch failed (${orderRes.status})`
    );
    return;
  }

  const orderData = await orderRes.json();
  const lineItems = (orderData.order?.lineItems || []).map(
    (li: { index: number; quantity: number }) => ({
      index: li.index,
      quantity: li.quantity,
    })
  );

  // Create fulfillment
  const fulfillmentPayload: Record<string, unknown> = {
    fulfillment: {
      lineItems,
      ...(trackingNumber
        ? {
            trackingInfo: {
              trackingNumber,
              shippingProvider: trackingCarrier || "Other",
            },
          }
        : {}),
    },
  };

  const fulfillRes = await fetch(
    `https://www.wixapis.com/stores/v2/orders/${externalOrderId}/fulfillments`,
    {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fulfillmentPayload),
    }
  );

  if (!fulfillRes.ok) {
    const errText = await fulfillRes.text();
    console.error(
      `[dispatch-sync] Wix fulfillment create failed (${fulfillRes.status}):`,
      errText
    );
  } else {
    console.log(
      `[dispatch-sync] Wix order ${externalOrderId} fulfilled`
    );
  }
}

async function refreshWixToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: string } | null> {
  const clientId = process.env.WIX_CLIENT_ID;
  const clientSecret = process.env.WIX_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://www.wixapis.com/oauth/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(
        Date.now() + (data.expires_in || 300) * 1000
      ).toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── Squarespace fulfilment push ──────────────────────────────────────
//
// Creates a shipment on the Squarespace order via the Commerce API.
// POST /1.0/commerce/orders/{orderId}/fulfillments

async function pushDispatchToSquarespace(
  conn: { access_token: string },
  externalOrderId: string,
  trackingNumber: string | null,
  trackingCarrier: string | null
): Promise<void> {
  const shipmentPayload: Record<string, unknown> = {
    shouldSendNotification: false, // We send our own email
    shipments: [
      {
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(trackingCarrier ? { carrierName: trackingCarrier } : {}),
        shipDate: new Date().toISOString(),
      },
    ],
  };

  const res = await fetch(
    `https://api.squarespace.com/1.0/commerce/orders/${externalOrderId}/fulfillments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        "Content-Type": "application/json",
        "User-Agent": "GhostRoastery/1.0",
      },
      body: JSON.stringify(shipmentPayload),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error(
      `[dispatch-sync] Squarespace fulfillment failed (${res.status}):`,
      errText
    );
  } else {
    console.log(
      `[dispatch-sync] Squarespace order ${externalOrderId} fulfilled`
    );
  }
}
