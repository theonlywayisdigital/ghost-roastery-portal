import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase";
import {
  processEcommerceOrder,
  type ExternalOrder,
  type ExternalLineItem,
} from "@/lib/ecommerce-order";
import { handleInboundProductUpdate } from "@/lib/ecommerce-stock-sync";

export async function POST(request: Request) {
  const body = await request.text();

  // ─── Verify HMAC signature ──────────────────────────────────────
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic");

  if (!hmacHeader || !shopDomain) {
    return NextResponse.json({ error: "Missing headers" }, { status: 401 });
  }

  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    console.error("[shopify-webhook] SHOPIFY_CLIENT_SECRET not set");
    return NextResponse.json({ error: "Config error" }, { status: 500 });
  }

  const computed = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  if (computed !== hmacHeader) {
    console.error("[shopify-webhook] HMAC verification failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // ─── Look up connection ─────────────────────────────────────────
  const supabase = createServerClient();
  const normalizedDomain = shopDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select("id, roaster_id, is_active")
    .eq("provider", "shopify")
    .eq("store_url", normalizedDomain)
    .eq("is_active", true)
    .single();

  if (!connection) {
    console.error(
      `[shopify-webhook] No active connection for ${normalizedDomain}`
    );
    return NextResponse.json({ error: "Unknown store" }, { status: 404 });
  }

  // ─── Handle product updates ───────────────────────────────────
  if (topic === "products/update" || topic === "products/create") {
    try {
      const variantUpdates = (payload.variants || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (v: any) => ({
          external_variant_id: String(v.id),
          price: v.price ? parseFloat(v.price) : undefined,
          sku: v.sku || undefined,
        })
      );

      const processed = await handleInboundProductUpdate(
        connection.id,
        String(payload.id),
        {
          name: payload.title || undefined,
          description: payload.body_html || undefined,
          image_url: payload.image?.src || payload.images?.[0]?.src || undefined,
          status: payload.status || undefined,
        },
        variantUpdates
      );

      return NextResponse.json({ ok: true, processed });
    } catch (err) {
      console.error("[shopify-webhook] Product update error:", err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }

  // ─── Handle order creation ────────────────────────────────────
  if (topic !== "orders/create") {
    // Acknowledge but don't process other topics
    return NextResponse.json({ ok: true });
  }

  // ─── Parse Shopify order ────────────────────────────────────────
  const lineItems: ExternalLineItem[] = (payload.line_items || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => ({
      external_product_id: String(item.product_id),
      external_variant_id: item.variant_id ? String(item.variant_id) : null,
      name: item.name || item.title || "Unknown",
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0,
      sku: item.sku || null,
    })
  );

  const shipping = payload.shipping_address;
  const shippingAddress = shipping
    ? {
        line1: shipping.address1 || "",
        line2: shipping.address2 || undefined,
        city: shipping.city || "",
        county: shipping.province || undefined,
        postcode: shipping.zip || "",
        country: shipping.country_code || shipping.country || "GB",
      }
    : null;

  // Map Shopify payment gateway to our payment methods
  const gateway = payload.gateway || payload.payment_gateway_names?.[0] || "";
  let paymentMethod = "card";
  if (gateway.includes("paypal")) paymentMethod = "other";
  else if (gateway.includes("manual")) paymentMethod = "bank_transfer";
  else if (gateway.includes("cash")) paymentMethod = "cash";

  const customerName = [
    payload.customer?.first_name,
    payload.customer?.last_name,
  ]
    .filter(Boolean)
    .join(" ") || payload.shipping_address?.name || "Shopify Customer";

  const externalOrder: ExternalOrder = {
    external_order_id: String(payload.id),
    external_source: "shopify",
    order_number: String(payload.order_number || payload.name || payload.id),
    customer_name: customerName,
    customer_email:
      payload.customer?.email || payload.email || "unknown@shopify.com",
    line_items: lineItems,
    shipping_address: shippingAddress,
    payment_method: paymentMethod,
    total: parseFloat(payload.total_price) || 0,
    currency: payload.currency || "GBP",
  };

  // ─── Process the order ──────────────────────────────────────────
  try {
    const result = await processEcommerceOrder(
      connection.roaster_id,
      connection.id,
      externalOrder
    );

    if (!result.success) {
      console.error("[shopify-webhook] Order processing failed:", result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      order_id: result.order_id,
      unmapped_items: result.unmapped_items,
    });
  } catch (err) {
    console.error("[shopify-webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
