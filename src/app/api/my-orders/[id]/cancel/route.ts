import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import {
  sendOrderCancellationEmail,
  sendOrderCancelledPartnerNotification,
} from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { orderType, reasonCategory, reason } = body as {
    orderType: string;
    reasonCategory: string;
    reason: string;
  };

  if (!reason) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const isGhost = orderType === "ghost";
  const cancellationReason = `${reasonCategory}: ${reason}`;
  const now = new Date().toISOString();

  if (isGhost) {
    // Ghost Roastery order — can only cancel if Pending
    const { data: order, error: fetchError } = await supabase
      .from("ghost_orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.order_status !== "Pending") {
      return NextResponse.json(
        { error: "Can only cancel orders in Pending status. Please raise a support ticket for further assistance." },
        { status: 400 }
      );
    }

    const orderNumber = order.order_number;

    // Update order
    const { error: updateError } = await supabase
      .from("ghost_orders")
      .update({
        order_status: "Cancelled",
        cancellation_reason: cancellationReason,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Customer cancel ghost order error:", updateError);
      return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
    }

    // Activity log
    await supabase.from("order_activity_log").insert({
      order_id: id,
      order_type: "ghost",
      action: "cancelled",
      description: `Order cancelled by customer (${user.email}). Reason: ${cancellationReason}`,
      actor_id: user.id,
      actor_name: user.email,
    });

    // Customer email
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

    // Partner notification (if allocated)
    if (order.partner_roaster_id) {
      const { data: partner } = await supabase
        .from("partner_roasters")
        .select("email, contact_name, business_name, user_id")
        .eq("id", order.partner_roaster_id)
        .single();

      if (partner) {
        sendOrderCancelledPartnerNotification({
          to: partner.email,
          partnerName: partner.contact_name || partner.business_name,
          orderNumber,
          cancelledBy: "the customer",
        }).catch((err) => console.error("Failed to send partner notification:", err));

        if (partner.user_id) {
          createNotification({
            userId: partner.user_id,
            type: "order_status_updated",
            title: "Order cancelled",
            body: `Order #${orderNumber} has been cancelled by the customer.`,
            link: "/orders",
            metadata: { order_id: id, new_status: "cancelled" },
          }).catch(() => {});
        }
      }
    }

    // Auto-refund
    if (order.stripe_payment_id && order.refund_status !== "full") {
      const remainingRefundable = (order.total_price || 0) - (order.refund_total || 0);
      if (remainingRefundable > 0) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001"}/api/admin/orders/${id}/refund`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                cookie: req.headers.get("cookie") || "",
              },
              body: JSON.stringify({
                orderType: "ghost_roastery",
                refundType: "full",
                amount: remainingRefundable,
                reason: `Auto-refund: order cancelled by customer. ${reason}`,
                reasonCategory: "customer_request",
              }),
            }
          );
        } catch (err) {
          console.error("Auto-refund request failed:", err);
        }
      }
    }

    return NextResponse.json({ success: true });
  }

  // Wholesale/storefront order — can only cancel if pending
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("customer_email", user.email)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "Can only cancel orders in pending status. Please raise a support ticket for further assistance." },
      { status: 400 }
    );
  }

  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const wsOrderType = order.order_channel === "wholesale" ? "wholesale" : "storefront";

  // Update order
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancellation_reason: cancellationReason,
    })
    .eq("id", id);

  if (updateError) {
    console.error("Customer cancel wholesale order error:", updateError);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }

  // Activity log
  await supabase.from("order_activity_log").insert({
    order_id: id,
    order_type: wsOrderType,
    action: "cancelled",
    description: `Order cancelled by customer (${user.email}). Reason: ${cancellationReason}`,
    actor_id: user.id,
    actor_name: user.email,
  });

  // Customer email
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

  // Roaster notification
  if (order.roaster_id) {
    const { data: roasterData } = await supabase
      .from("partner_roasters")
      .select("email, contact_name, business_name, user_id")
      .eq("id", order.roaster_id)
      .single();

    if (roasterData) {
      sendOrderCancelledPartnerNotification({
        to: roasterData.email,
        partnerName: roasterData.contact_name || roasterData.business_name,
        orderNumber,
        cancelledBy: "the customer",
      }).catch((err) => console.error("Failed to send roaster notification:", err));

      if (roasterData.user_id) {
        createNotification({
          userId: roasterData.user_id,
          type: "order_status_updated",
          title: "Order cancelled",
          body: `Order #${orderNumber} has been cancelled by the customer.`,
          link: "/orders",
          metadata: { order_id: id, new_status: "cancelled" },
        }).catch(() => {});
      }
    }
  }

  // Auto-refund
  if (order.stripe_payment_id && order.refund_status !== "full") {
    const remainingRefundable = (order.subtotal || 0) - (order.refund_total || 0);
    if (remainingRefundable > 0) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001"}/api/admin/orders/${id}/refund`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: req.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              orderType: wsOrderType,
              refundType: "full",
              amount: remainingRefundable,
              reason: `Auto-refund: order cancelled by customer. ${reason}`,
              reasonCategory: "customer_request",
            }),
          }
        );
      } catch (err) {
        console.error("Auto-refund request failed:", err);
      }
    }
  }

  // Void unpaid invoice
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
