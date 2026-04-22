import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { getNextDeliveryDate } from "@/lib/standing-orders";

interface StandingOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3001";
  const proto = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;
  const cookieHeader = headersList.get("cookie") || "";

  const roasterId = user.roaster.id;
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch all due standing orders
  const { data: dueOrders, error: fetchError } = await supabase
    .from("standing_orders")
    .select(
      `*, wholesale_access(id, business_name, user_id, payment_terms, users!wholesale_access_user_id_fkey(full_name, email))`
    )
    .eq("roaster_id", roasterId)
    .eq("status", "active")
    .lte("next_delivery_date", today);

  if (fetchError) {
    console.error("[standing-orders/generate] Fetch error:", fetchError);
    return NextResponse.json(
      { error: "Failed to fetch due orders" },
      { status: 500 }
    );
  }

  if (!dueOrders || dueOrders.length === 0) {
    return NextResponse.json({
      generated: 0,
      failed: 0,
      results: [],
      message: "No standing orders are due",
    });
  }

  const results: {
    standingOrderId: string;
    buyerName: string;
    status: "success" | "failed" | "skipped";
    orderId?: string;
    error?: string;
  }[] = [];

  for (const so of dueOrders) {
    const wa = so.wholesale_access as {
      id: string;
      business_name: string;
      user_id: string;
      payment_terms: string;
      users: { full_name: string | null; email: string } | { full_name: string | null; email: string }[];
    };
    const buyerUser = Array.isArray(wa.users) ? wa.users[0] : wa.users;
    const items = so.items as StandingOrderItem[];

    if (!items || !Array.isArray(items) || items.length === 0) {
      // Record skip
      await supabase.from("standing_order_history").insert({
        standing_order_id: so.id,
        status: "skipped",
        error_message: "No items in standing order",
        summary: { buyer_name: wa.business_name, items_count: 0, total: 0 },
      });
      results.push({
        standingOrderId: so.id,
        buyerName: wa.business_name,
        status: "skipped",
        error: "No items",
      });
      continue;
    }

    try {
      // Call create-manual endpoint internally
      const orderPayload = {
        orderChannel: "wholesale",
        customerId: wa.user_id,
        customerName: buyerUser?.full_name || wa.business_name,
        customerEmail: buyerUser?.email || "",
        customerBusiness: wa.business_name,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variantId: item.variantId || undefined,
          unitPrice: item.unitPrice,
        })),
        deliveryAddress: so.delivery_address || undefined,
        paymentMethod: "invoice",
        paymentTerms: so.payment_terms || wa.payment_terms || "net30",
        notes: `Auto-generated from standing order`,
        status: "confirmed",
      };

      const res = await fetch(`${baseUrl}/api/orders/create-manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      const total = items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );

      // Link the created order back to this standing order
      if (result.orderId) {
        await supabase
          .from("orders")
          .update({ standing_order_id: so.id })
          .eq("id", result.orderId);
      }

      // Record success
      await supabase.from("standing_order_history").insert({
        standing_order_id: so.id,
        order_id: result.orderId,
        status: "success",
        summary: {
          buyer_name: wa.business_name,
          items_count: items.length,
          total,
        },
      });

      // Advance next_delivery_date
      const nextDate = getNextDeliveryDate(
        so.next_delivery_date,
        so.frequency
      );
      await supabase
        .from("standing_orders")
        .update({ next_delivery_date: nextDate })
        .eq("id", so.id);

      results.push({
        standingOrderId: so.id,
        buyerName: wa.business_name,
        status: "success",
        orderId: result.orderId,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      console.error(
        `[standing-orders/generate] Failed for ${so.id}:`,
        message
      );

      // Record failure
      await supabase.from("standing_order_history").insert({
        standing_order_id: so.id,
        status: "failed",
        error_message: message,
        summary: { buyer_name: wa.business_name },
      });

      results.push({
        standingOrderId: so.id,
        buyerName: wa.business_name,
        status: "failed",
        error: message,
      });
    }
  }

  const generated = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;

  // Send notification to roaster
  const { data: roaster } = await supabase
    .from("roasters")
    .select("user_id")
    .eq("id", roasterId)
    .single();

  if (roaster?.user_id) {
    if (failed > 0) {
      await createNotification({
        userId: roaster.user_id,
        type: "order_status_updated",
        title: "Standing order generation issues",
        body: `${generated} order(s) generated successfully, ${failed} failed. Check standing orders for details.`,
        link: "/wholesale-buyers?tab=standing",
      });
    } else if (generated > 0) {
      await createNotification({
        userId: roaster.user_id,
        type: "new_order",
        title: "Standing orders generated",
        body: `${generated} order(s) generated from standing orders.`,
        link: "/orders",
      });
    }
  }

  return NextResponse.json({ generated, failed, results });
}
