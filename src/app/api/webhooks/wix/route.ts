import { NextResponse } from "next/server";
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
    route: "/api/webhooks/wix",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  console.log("[wix-webhook] ===== REQUEST RECEIVED =====");

  let body: string;
  try {
    body = await request.text();
  } catch (readErr) {
    console.error("[wix-webhook] Failed to read body:", readErr);
    return NextResponse.json({ error: "Body read failed" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    console.error("[wix-webhook] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Wix webhooks include eventType and data (stringified JSON) and instanceId
  const eventType = (payload.eventType as string) || "";
  const instanceId = (payload.instanceId as string) || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventData: any = payload.data;

  // Wix sometimes sends data as a stringified JSON
  if (typeof eventData === "string") {
    try {
      eventData = JSON.parse(eventData);
    } catch {
      // Use as-is
    }
  }

  console.log(
    `[wix-webhook] eventType=${eventType}, instanceId=${instanceId}, bodyLen=${body.length}`
  );

  // ─── Look up connection ─────────────────────────────────────────
  const supabase = createServerClient();

  // Match by instanceId stored in settings, or fall back to any active Wix connection
  const { data: connections } = await supabase
    .from("ecommerce_connections")
    .select("id, roaster_id, is_active, access_token, settings")
    .eq("provider", "wix")
    .eq("is_active", true);

  if (!connections || connections.length === 0) {
    console.error("[wix-webhook] No active Wix connection found");
    return NextResponse.json({ error: "Unknown store" }, { status: 404 });
  }

  // Try to match by instanceId
  let connection = connections[0];
  if (instanceId) {
    const matched = connections.find((c) => {
      const settings = (c.settings as Record<string, unknown>) || {};
      return settings.instance_id === instanceId;
    });
    if (matched) connection = matched;
  }

  // ─── Handle product updates ───────────────────────────────────
  if (
    eventType.includes("product_changed") ||
    eventType.includes("product_created") ||
    eventType.includes("product_updated")
  ) {
    try {
      const productData = eventData?.product || eventData;
      const productId =
        productData?.id || eventData?.productId || payload.entityId;

      if (!productId) {
        return NextResponse.json({ ok: true, skipped: "no product id" });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variantUpdates = (productData?.variants || []).map((v: any) => ({
        external_variant_id: String(v.id),
        price: v.priceData?.price ?? v.price?.price ?? undefined,
        sku: v.sku || undefined,
      }));

      const processed = await handleInboundProductUpdate(
        connection.id,
        String(productId),
        {
          name: productData?.name || undefined,
          description: productData?.description || undefined,
          image_url:
            productData?.media?.mainMedia?.image?.url || undefined,
          status: productData?.visible ? "published" : "draft",
        },
        variantUpdates
      );

      return NextResponse.json({ ok: true, processed });
    } catch (err) {
      console.error("[wix-webhook] Product update error:", err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }

  // ─── Handle order creation ────────────────────────────────────
  if (
    !eventType.includes("order_created") &&
    !eventType.includes("order_paid")
  ) {
    return NextResponse.json({ ok: true });
  }

  const orderData = eventData?.order || eventData;

  // ─── Parse Wix order ──────────────────────────────────────────
  const lineItems: ExternalLineItem[] = (
    orderData?.lineItems || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((item: any) => ({
    external_product_id: String(
      item.catalogReference?.catalogItemId || item.productId || item.id
    ),
    external_variant_id: item.catalogReference?.options?.variantId
      ? String(item.catalogReference.options.variantId)
      : null,
    name: item.name || item.productName?.original || "Unknown",
    quantity: item.quantity || 1,
    price: item.price?.amount
      ? parseFloat(item.price.amount)
      : item.priceData?.price ?? 0,
    sku: item.sku || null,
  }));

  const shipping =
    orderData?.shippingInfo?.shipmentDetails?.address ||
    orderData?.shippingInfo?.logistics?.shippingDestination?.address ||
    null;
  const billing = orderData?.billingInfo?.address || null;
  const addr = shipping || billing;

  const shippingAddress = addr
    ? {
        line1: addr.addressLine1 || addr.streetAddress?.name || "",
        line2: addr.addressLine2 || undefined,
        city: addr.city || "",
        county: addr.subdivision || addr.state || undefined,
        postcode: addr.postalCode || "",
        country: addr.country || "GB",
      }
    : null;

  // Map payment method
  let paymentMethod = "card";
  const wixPayment =
    orderData?.paymentInfo?.payments?.[0]?.regularPaymentDetails
      ?.paymentMethod || "";
  if (typeof wixPayment === "string") {
    const lower = wixPayment.toLowerCase();
    if (lower.includes("paypal")) paymentMethod = "other";
    else if (lower.includes("cash")) paymentMethod = "cash";
    else if (lower.includes("bank")) paymentMethod = "bank_transfer";
  }

  const buyerInfo = orderData?.buyerInfo || {};
  const customerName =
    [buyerInfo.firstName, buyerInfo.lastName].filter(Boolean).join(" ") ||
    orderData?.billingInfo?.contactDetails?.firstName
      ? [
          orderData.billingInfo.contactDetails.firstName,
          orderData.billingInfo.contactDetails.lastName,
        ]
          .filter(Boolean)
          .join(" ")
      : "Wix Customer";

  const externalOrder: ExternalOrder = {
    external_order_id: String(orderData?.id || orderData?.number),
    external_source: "wix",
    order_number: String(orderData?.number || orderData?.id),
    customer_name: customerName,
    customer_email:
      buyerInfo.email ||
      orderData?.billingInfo?.contactDetails?.email ||
      "unknown@wix.com",
    line_items: lineItems,
    shipping_address: shippingAddress,
    payment_method: paymentMethod,
    total: orderData?.priceSummary?.totalPrice?.amount
      ? parseFloat(orderData.priceSummary.totalPrice.amount)
      : 0,
    currency: orderData?.currency || "GBP",
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
        "[wix-webhook] Order processing failed:",
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
    console.error("[wix-webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
