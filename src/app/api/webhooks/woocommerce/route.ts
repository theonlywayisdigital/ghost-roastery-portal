import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  processEcommerceOrder,
  type ExternalOrder,
  type ExternalLineItem,
} from "@/lib/ecommerce-order";

export async function POST(request: Request) {
  const body = await request.text();

  // ─── Verify webhook source ──────────────────────────────────────
  const source = request.headers.get("x-wc-webhook-source");
  const topic = request.headers.get("x-wc-webhook-topic");

  if (!source) {
    return NextResponse.json({ error: "Missing source" }, { status: 401 });
  }

  // Only handle order creation
  if (topic !== "order.created") {
    return NextResponse.json({ ok: true });
  }

  const payload = JSON.parse(body);

  // ─── Look up connection by source URL ───────────────────────────
  const supabase = createServerClient();
  const normalizedSource = source
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select("id, roaster_id, is_active")
    .eq("provider", "woocommerce")
    .eq("store_url", normalizedSource)
    .eq("is_active", true)
    .single();

  if (!connection) {
    console.error(
      `[woocommerce-webhook] No active connection for ${normalizedSource}`
    );
    return NextResponse.json({ error: "Unknown store" }, { status: 404 });
  }

  // ─── Parse WooCommerce order ────────────────────────────────────
  const lineItems: ExternalLineItem[] = (payload.line_items || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => ({
      external_product_id: String(item.product_id),
      external_variant_id: item.variation_id
        ? String(item.variation_id)
        : null,
      name: item.name || "Unknown",
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0,
      sku: item.sku || null,
    })
  );

  const billing = payload.billing;
  const shipping = payload.shipping;
  const address = shipping?.address_1 ? shipping : billing;

  const shippingAddress = address
    ? {
        line1: address.address_1 || "",
        line2: address.address_2 || undefined,
        city: address.city || "",
        county: address.state || undefined,
        postcode: address.postcode || "",
        country: address.country || "GB",
      }
    : null;

  // Map WooCommerce payment method
  const wcPaymentMethod = payload.payment_method || "";
  let paymentMethod = "card";
  if (wcPaymentMethod.includes("paypal")) paymentMethod = "other";
  else if (wcPaymentMethod.includes("bacs")) paymentMethod = "bank_transfer";
  else if (wcPaymentMethod.includes("cod")) paymentMethod = "cash";
  else if (wcPaymentMethod.includes("cheque")) paymentMethod = "other";

  const customerName = [billing?.first_name, billing?.last_name]
    .filter(Boolean)
    .join(" ") || "WooCommerce Customer";

  const externalOrder: ExternalOrder = {
    external_order_id: String(payload.id),
    external_source: "woocommerce",
    order_number: String(payload.number || payload.id),
    customer_name: customerName,
    customer_email: billing?.email || "unknown@woocommerce.com",
    line_items: lineItems,
    shipping_address: shippingAddress,
    payment_method: paymentMethod,
    total: parseFloat(payload.total) || 0,
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
      console.error(
        "[woocommerce-webhook] Order processing failed:",
        result.error
      );
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
    console.error("[woocommerce-webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
