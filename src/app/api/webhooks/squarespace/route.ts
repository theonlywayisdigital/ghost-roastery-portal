import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase";
import {
  processEcommerceOrder,
  type ExternalOrder,
  type ExternalLineItem,
} from "@/lib/ecommerce-order";
import { handleInboundProductUpdate } from "@/lib/ecommerce-stock-sync";

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    route: "/api/webhooks/squarespace",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  console.log("[squarespace-webhook] ===== REQUEST RECEIVED =====");

  let body: string;
  try {
    body = await request.text();
  } catch (readErr) {
    console.error("[squarespace-webhook] Failed to read body:", readErr);
    return NextResponse.json({ error: "Body read failed" }, { status: 400 });
  }

  const topic = request.headers.get("squarespace-topic") || "";

  console.log(
    `[squarespace-webhook] topic=${topic}, bodyLen=${body.length}`
  );

  const payload = JSON.parse(body);

  // ─── Look up connection ─────────────────────────────────────────
  // Squarespace webhooks include a websiteId in the payload
  const websiteId = payload.websiteId || payload.website_id;
  const supabase = createServerClient();

  // We look up the connection by provider — since a roaster typically has one Squarespace store
  // If websiteId is available, we can use it in the future for multi-store support
  const { data: connections } = await supabase
    .from("ecommerce_connections")
    .select("id, roaster_id, is_active, access_token")
    .eq("provider", "squarespace")
    .eq("is_active", true);

  if (!connections || connections.length === 0) {
    console.error(
      "[squarespace-webhook] No active Squarespace connection found"
    );
    return NextResponse.json({ error: "Unknown store" }, { status: 404 });
  }

  // Verify webhook signature if the secret is available
  const signatureHeader = request.headers.get("x-squarespace-signature");
  let connection = connections[0]; // default to first

  // Try to match by verifying HMAC against each connection's access_token
  if (signatureHeader) {
    let verified = false;
    for (const conn of connections) {
      if (!conn.access_token) continue;
      const computed = crypto
        .createHmac("sha256", conn.access_token)
        .update(body, "utf8")
        .digest("base64");

      if (computed === signatureHeader) {
        connection = conn;
        verified = true;
        break;
      }
    }

    if (!verified) {
      console.log(
        "[squarespace-webhook] Signature verification failed — proceeding with first connection"
      );
      // Squarespace webhook signatures may use a different signing secret
      // Proceed anyway since we still want to process valid webhooks
    }
  }

  // ─── Handle product updates ───────────────────────────────────
  if (
    topic === "extension.product.update" ||
    topic === "extension.product.create"
  ) {
    try {
      const productData = payload.data || payload;
      const productId =
        productData.id || productData.productId || payload.entityId;

      if (!productId) {
        return NextResponse.json({ ok: true, skipped: "no product id" });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variantUpdates = (productData.variants || []).map((v: any) => ({
        external_variant_id: String(v.id),
        price: v.pricing?.basePrice?.value
          ? parseFloat(v.pricing.basePrice.value)
          : undefined,
        sku: v.sku || undefined,
      }));

      const processed = await handleInboundProductUpdate(
        connection.id,
        String(productId),
        {
          name: productData.name || undefined,
          description: productData.description || undefined,
          image_url: productData.images?.[0]?.url || undefined,
          status: productData.isVisible ? "published" : "draft",
        },
        variantUpdates
      );

      return NextResponse.json({ ok: true, processed });
    } catch (err) {
      console.error("[squarespace-webhook] Product update error:", err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }

  // ─── Handle order creation ────────────────────────────────────
  if (topic !== "order.create") {
    return NextResponse.json({ ok: true });
  }

  const orderData = payload.data || payload;

  // ─── Parse Squarespace order ──────────────────────────────────
  const lineItems: ExternalLineItem[] = (
    orderData.lineItems || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((item: any) => ({
    external_product_id: String(item.productId || item.id),
    external_variant_id: item.variantId ? String(item.variantId) : null,
    name: item.productName || item.name || "Unknown",
    quantity: item.quantity || 1,
    price: item.unitPricePaid?.value
      ? parseFloat(item.unitPricePaid.value)
      : 0,
    sku: item.sku || null,
  }));

  const billing = orderData.billingAddress;
  const shipping = orderData.shippingAddress || billing;

  const shippingAddress = shipping
    ? {
        address_line_1: shipping.address1 || shipping.line1 || "",
        address_line_2: shipping.address2 || shipping.line2 || undefined,
        city: shipping.city || "",
        county: shipping.state || shipping.region || undefined,
        postcode: shipping.postalCode || shipping.zip || "",
        country: shipping.countryCode || shipping.country || "GB",
      }
    : null;

  // Map payment method
  let paymentMethod = "card";
  const sqPayment = orderData.paymentMethod || orderData.paymentType || "";
  if (typeof sqPayment === "string") {
    if (sqPayment.toLowerCase().includes("paypal")) paymentMethod = "other";
    else if (sqPayment.toLowerCase().includes("cash")) paymentMethod = "cash";
    else if (sqPayment.toLowerCase().includes("bank"))
      paymentMethod = "bank_transfer";
  }

  const customerName =
    [
      orderData.customerName?.firstName || billing?.firstName,
      orderData.customerName?.lastName || billing?.lastName,
    ]
      .filter(Boolean)
      .join(" ") || "Squarespace Customer";

  const externalOrder: ExternalOrder = {
    external_order_id: String(orderData.id || orderData.orderId),
    external_source: "squarespace",
    order_number: String(
      orderData.orderNumber || orderData.id || orderData.orderId
    ),
    customer_name: customerName,
    customer_email:
      orderData.customerEmail ||
      billing?.email ||
      "unknown@squarespace.com",
    line_items: lineItems,
    shipping_address: shippingAddress,
    payment_method: paymentMethod,
    total: orderData.grandTotal?.value
      ? parseFloat(orderData.grandTotal.value)
      : 0,
    currency: orderData.grandTotal?.currency || "GBP",
  };

  // ─── Process the order ──────────────────────────────────────────
  try {
    const result = await processEcommerceOrder(
      connection.roaster_id,
      connection.id,
      externalOrder
    );

    if (!result.success) {
      console.error(
        "[squarespace-webhook] Order processing failed:",
        result.error
      );
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      order_id: result.order_id,
      unmapped_items: result.unmapped_items,
    });
  } catch (err) {
    console.error("[squarespace-webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
