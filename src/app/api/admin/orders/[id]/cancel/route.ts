import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { processStripeRefund } from "@/lib/refund";
import {
  sendOrderCancellationEmail,
  sendOrderCancelledPartnerNotification,
} from "@/lib/email";
import { dispatchWebhook } from "@/lib/webhooks";
import { pushStockToChannels } from "@/lib/ecommerce-stock-sync";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { orderType, reasonCategory, reason } = body as {
    orderType: string;
    reasonCategory: string;
    reason: string;
  };

  if (!orderType || !reason) {
    return NextResponse.json({ error: "orderType and reason are required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const isGhost = orderType === "ghost";
  const table = isGhost ? "orders" : "wholesale_orders";

  // 1. Fetch the order
  const { data: order, error: fetchError } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const status = isGhost ? order.order_status : order.status;
  const deliveredStatuses = isGhost
    ? ["Delivered"]
    : ["delivered"];

  if (deliveredStatuses.includes(status)) {
    return NextResponse.json({ error: "Cannot cancel a delivered order" }, { status: 400 });
  }

  const cancelledStatuses = isGhost ? ["Cancelled"] : ["cancelled"];
  if (cancelledStatuses.includes(status)) {
    return NextResponse.json({ error: "Order is already cancelled" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const orderNumber = isGhost ? order.order_number : order.id.slice(0, 8).toUpperCase();
  const customerEmail = order.customer_email;
  const customerName = order.customer_name;
  const cancellationReason = `${reasonCategory}: ${reason}`;

  // 2. Update order status
  const updatePayload: Record<string, unknown> = {
    cancellation_reason: cancellationReason,
  };

  if (isGhost) {
    updatePayload.order_status = "Cancelled";
  } else {
    updatePayload.status = "cancelled";
    updatePayload.cancelled_at = now;
  }

  const { error: updateError } = await supabase
    .from(table)
    .update(updatePayload)
    .eq("id", id);

  if (updateError) {
    console.error("Cancel order update error:", updateError);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }

  // 3. Replenish roasted stock and green bean stock for cancelled items (non-ghost orders only)
  if (!isGhost) {
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

      // Replenish green bean stock
      const greenBeanId = item.greenBeanId as string | undefined;
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

      // Replenish product-level stock
      const productId = item.productId as string | undefined;
      if (productId && quantity) {
        await supabase.rpc("increment_product_stock", {
          product_id: productId,
          qty: quantity,
        });
        const variantId = item.variantId as string | undefined;
        if (variantId) {
          await supabase.rpc("increment_variant_stock", {
            variant_id: variantId,
            qty: quantity,
          });
        }
      }
    }
  }

  // 3b. Push replenished stock to ecommerce channels (fire-and-forget, non-ghost only)
  if (!isGhost) {
    const affectedStockIds = new Set<string>();
    const cancelItems = Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [];
    for (const item of cancelItems) {
      const rsId = item.roastedStockId as string | undefined;
      if (rsId) affectedStockIds.add(rsId);
    }
    for (const stockId of Array.from(affectedStockIds)) {
      pushStockToChannels(order.roaster_id, stockId).catch((err) =>
        console.error("[admin-cancel] Stock push error:", err)
      );
    }
  }

  // 4. Activity log
  await supabase.from("order_activity_log").insert({
    order_id: id,
    order_type: isGhost ? "ghost" : orderType,
    action: "cancelled",
    description: `Order cancelled by admin (${user.email}). Reason: ${cancellationReason}`,
    actor_id: user.id,
    actor_name: user.email,
  });

  // 5. Send cancellation email to customer
  const wasPaid = !!order.stripe_payment_id;
  if (customerEmail) {
    // Fetch platform branding
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline")
      .limit(1)
      .single();

    const branding = settings
      ? {
          logoUrl: settings.brand_logo_url,
          primaryColour: settings.brand_primary_colour || undefined,
          accentColour: settings.brand_accent_colour || undefined,
          headingFont: settings.brand_heading_font || undefined,
          bodyFont: settings.brand_body_font || undefined,
          tagline: settings.brand_tagline || undefined,
        }
      : undefined;

    sendOrderCancellationEmail({
      to: customerEmail,
      customerName: customerName || "",
      orderNumber,
      reason,
      wasPaid,
      branding,
    }).catch((err) => console.error("Failed to send cancellation email:", err));
  }

  // 6. Notify customer in-app
  if (order.user_id) {
    createNotification({
      userId: order.user_id,
      type: "order_status_updated",
      title: "Order cancelled",
      body: `Your order #${orderNumber} has been cancelled.`,
      link: "/my-orders",
      metadata: { order_id: id, new_status: "cancelled" },
    }).catch(() => {});
  }

  // 7. Partner/roaster notification
  if (isGhost && order.partner_roaster_id) {
    // Ghost order with allocated partner
    const { data: partner } = await supabase
      .from("roasters")
      .select("email, contact_name, business_name, user_id")
      .eq("id", order.partner_roaster_id)
      .single();

    if (partner) {
      sendOrderCancelledPartnerNotification({
        to: partner.email,
        partnerName: partner.contact_name || partner.business_name,
        orderNumber,
        cancelledBy: "the admin team",
      }).catch((err) => console.error("Failed to send partner notification:", err));

      if (partner.user_id) {
        createNotification({
          userId: partner.user_id,
          type: "order_status_updated",
          title: "Order cancelled",
          body: `Order #${orderNumber} has been cancelled and removed from your fulfilment queue.`,
          link: "/orders",
          metadata: { order_id: id, new_status: "cancelled" },
        }).catch(() => {});
      }
    }
  } else if (!isGhost && order.roaster_id) {
    // Storefront/wholesale order — notify roaster
    const { data: roaster } = await supabase
      .from("roasters")
      .select("email, contact_name, business_name, user_id")
      .eq("id", order.roaster_id)
      .single();

    if (roaster) {
      sendOrderCancelledPartnerNotification({
        to: roaster.email,
        partnerName: roaster.contact_name || roaster.business_name,
        orderNumber,
        cancelledBy: "the admin team",
      }).catch((err) => console.error("Failed to send roaster notification:", err));

      if (roaster.user_id) {
        createNotification({
          userId: roaster.user_id,
          type: "order_status_updated",
          title: "Order cancelled",
          body: `Order #${orderNumber} has been cancelled by the admin team.`,
          link: "/orders",
          metadata: { order_id: id, new_status: "cancelled" },
        }).catch(() => {});
      }
    }
  }

  // 8. Auto-refund for Stripe-paid orders
  if (order.stripe_payment_id && order.refund_status !== "full") {
    const orderTotal = isGhost ? order.total_price : order.subtotal;
    const existingRefundTotal = order.refund_total || 0;
    const remainingRefundable = orderTotal - existingRefundTotal;

    if (remainingRefundable > 0) {
      const refundOrderType = isGhost ? "ghost_roastery" : orderType;

      try {
        const result = await processStripeRefund({
          orderId: id,
          orderType: refundOrderType,
          refundType: "full",
          amount: remainingRefundable,
          reason: `Auto-refund: order cancelled. ${reason}`,
          reasonCategory: "customer_request",
          actorId: user.id,
          actorName: user.email,
        });

        if (!result.success) {
          console.error("Auto-refund failed:", result.error);
          await supabase.from("order_activity_log").insert({
            order_id: id,
            order_type: isGhost ? "ghost" : orderType,
            action: "note",
            description: `Auto-refund failed: ${result.error || "Unknown error"}. Manual refund may be required.`,
            actor_id: user.id,
            actor_name: user.email,
          });
        }
      } catch (err) {
        console.error("Auto-refund failed:", err);
        await supabase.from("order_activity_log").insert({
          order_id: id,
          order_type: isGhost ? "ghost" : orderType,
          action: "note",
          description: "Auto-refund request failed. Manual refund may be required.",
          actor_id: user.id,
          actor_name: user.email,
        });
      }
    }
  }

  // 9. Invoice handling for non-Stripe orders
  if (!isGhost && !order.stripe_payment_id && order.invoice_id) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("id", order.invoice_id)
      .single();

    if (invoice) {
      if (invoice.status === "paid") {
        // Invoice already paid — flag for manual handling
        await supabase.from("order_activity_log").insert({
          order_id: id,
          order_type: orderType,
          action: "note",
          description: "This order was paid via invoice. Manual refund may be required.",
          actor_id: user.id,
          actor_name: user.email,
        });
      } else if (invoice.status !== "void") {
        // Void the unpaid invoice
        await supabase
          .from("invoices")
          .update({ status: "void", payment_status: "cancelled" })
          .eq("id", invoice.id);

        await supabase.from("order_activity_log").insert({
          order_id: id,
          order_type: orderType,
          action: "updated",
          description: `Invoice ${invoice.id.slice(0, 8)} voided due to order cancellation.`,
          actor_id: user.id,
          actor_name: user.email,
        });
      }
    }
  }

  // Dispatch order.cancelled webhook (storefront/wholesale orders only)
  if (!isGhost && order.roaster_id) {
    dispatchWebhook(order.roaster_id, "order.cancelled", {
      order: {
        id: order.id,
        order_number: orderNumber,
        customer_name: customerName,
        customer_email: customerEmail,
        items: order.items,
        subtotal: order.subtotal,
        order_channel: order.order_channel,
        status: "cancelled",
        cancellation_reason: cancellationReason,
        cancelled_at: now,
        cancelled_by: "admin",
      },
    });
  }

  return NextResponse.json({ success: true });
}
