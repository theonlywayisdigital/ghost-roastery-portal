import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import {
  sendOrderCancellationEmail,
} from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { reasonCategory, reason } = body as {
    reasonCategory: string;
    reason: string;
  };

  if (!reason) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Roasters can only cancel their own wholesale orders
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Only from pending or confirmed
  if (!["pending", "confirmed"].includes(order.status)) {
    return NextResponse.json(
      { error: "Can only cancel orders in pending or confirmed status" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const cancellationReason = `${reasonCategory}: ${reason}`;

  // 1. Update order
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancellation_reason: cancellationReason,
    })
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (updateError) {
    console.error("Roaster cancel order error:", updateError);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }

  // 2. Replenish roasted stock for cancelled items
  const orderItems = Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [];
  for (const item of orderItems) {
    const roastedStockId = item.roastedStockId as string | undefined;
    const weightGrams = item.weightGrams as number | undefined;
    const quantity = item.quantity as number | undefined;
    if (roastedStockId && weightGrams && weightGrams > 0 && quantity) {
      const replenishKg = (weightGrams / 1000) * quantity;
      await supabase.rpc("replenish_roasted_stock", {
        stock_id: roastedStockId,
        qty_kg: replenishKg,
      });
      const { data: updatedStock } = await supabase
        .from("roasted_stock")
        .select("current_stock_kg")
        .eq("id", roastedStockId)
        .single();
      await supabase.from("roasted_stock_movements").insert({
        roaster_id: order.roaster_id,
        roasted_stock_id: roastedStockId,
        movement_type: "cancellation_return",
        quantity_kg: replenishKg,
        balance_after_kg: updatedStock?.current_stock_kg ?? replenishKg,
        reference_id: id,
        reference_type: "order",
        notes: `Cancelled order ${orderNumber} — ${item.name || "Item"} × ${quantity}`,
      });
    }
  }

  // 2b. Replenish green bean stock for cancelled items
  for (const item of orderItems) {
    const greenBeanId = item.greenBeanId as string | undefined;
    const weightGrams = item.weightGrams as number | undefined;
    const quantity = item.quantity as number | undefined;
    if (greenBeanId && weightGrams && weightGrams > 0 && quantity) {
      const replenishKg = (weightGrams / 1000) * quantity;
      const { data: bean } = await supabase
        .from("green_beans")
        .select("current_stock_kg")
        .eq("id", greenBeanId)
        .single();
      if (bean) {
        const newStock = (bean.current_stock_kg || 0) + replenishKg;
        await supabase
          .from("green_beans")
          .update({ current_stock_kg: newStock })
          .eq("id", greenBeanId);
        await supabase.from("green_bean_movements").insert({
          roaster_id: order.roaster_id,
          green_bean_id: greenBeanId,
          movement_type: "cancellation_return",
          quantity_kg: replenishKg,
          balance_after_kg: newStock,
          reference_id: id,
          reference_type: "order",
          notes: `Cancelled order ${orderNumber} — ${item.name || "Item"} × ${quantity}`,
        });
      }
    }
  }

  // 3. Activity log
  await supabase.from("order_activity_log").insert({
    order_id: id,
    order_type: order.order_channel === "wholesale" ? "wholesale" : "storefront",
    action: "cancelled",
    description: `Order cancelled by roaster (${roaster.business_name}). Reason: ${cancellationReason}`,
    actor_id: roaster.user_id || null,
    actor_name: roaster.business_name,
  });

  // 4. Send cancellation email to customer
  const wasPaid = !!order.stripe_payment_id;
  if (order.customer_email) {
    sendOrderCancellationEmail({
      to: order.customer_email,
      customerName: order.customer_name || "",
      orderNumber,
      reason,
      wasPaid,
    }).catch((err) => console.error("Failed to send cancellation email:", err));
  }

  // 5. Notify customer in-app
  if (order.user_id) {
    createNotification({
      userId: order.user_id,
      type: "order_status_updated",
      title: "Order cancelled",
      body: `Your order #${orderNumber} from ${roaster.business_name} has been cancelled.`,
      link: "/my-orders",
      metadata: { order_id: id, new_status: "cancelled" },
    }).catch(() => {});
  }

  // 6. Auto-refund for Stripe-paid orders
  if (order.stripe_payment_id && order.refund_status !== "full") {
    const remainingRefundable = (order.subtotal || 0) - (order.refund_total || 0);
    if (remainingRefundable > 0) {
      const orderType = order.order_channel === "wholesale" ? "wholesale" : "storefront";
      try {
        const refundRes = await fetch(
          `${process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001"}/api/admin/orders/${id}/refund`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: req.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              orderType,
              refundType: "full",
              amount: remainingRefundable,
              reason: `Auto-refund: order cancelled by roaster. ${reason}`,
              reasonCategory: "customer_request",
            }),
          }
        );
        if (!refundRes.ok) {
          const refundError = await refundRes.json();
          console.error("Auto-refund failed:", refundError);
        }
      } catch (err) {
        console.error("Auto-refund request failed:", err);
      }
    }
  }

  // 7. Void unpaid invoice
  if (!order.stripe_payment_id && order.invoice_id) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("id", order.invoice_id)
      .single();

    if (invoice && invoice.status !== "void" && invoice.status !== "paid") {
      await supabase
        .from("invoices")
        .update({ status: "void", payment_status: "cancelled" })
        .eq("id", invoice.id);
    }
  }

  return NextResponse.json({ success: true });
}
