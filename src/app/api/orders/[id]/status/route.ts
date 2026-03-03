import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { fireAutomationTrigger, updateContactActivity } from "@/lib/automation-triggers";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "dispatched", "cancelled"],
  processing: ["dispatched", "cancelled"],
  dispatched: ["delivered"],
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { status: newStatus, trackingNumber, trackingCarrier, cancellationReason } = await request.json();

    if (!newStatus) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get current order with ownership check
    const { data: order } = await supabase
      .from("wholesale_orders")
      .select("id, status, user_id, customer_name")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${newStatus}` },
        { status: 400 }
      );
    }

    // Build update payload with status + timestamps + optional tracking
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = { status: newStatus };

    if (newStatus === "confirmed") updatePayload.confirmed_at = now;
    if (newStatus === "dispatched") {
      updatePayload.dispatched_at = now;
      if (trackingNumber) updatePayload.tracking_number = trackingNumber;
      if (trackingCarrier) updatePayload.tracking_carrier = trackingCarrier;
    }
    if (newStatus === "delivered") updatePayload.delivered_at = now;
    if (newStatus === "cancelled") {
      updatePayload.cancelled_at = now;
      if (cancellationReason) updatePayload.cancellation_reason = cancellationReason;
    }

    const { error: updateError } = await supabase
      .from("wholesale_orders")
      .update(updatePayload)
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (updateError) {
      console.error("Order status update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    // Notify the customer about their order status update
    if (order.user_id) {
      const statusLabels: Record<string, string> = {
        confirmed: "confirmed",
        processing: "being processed",
        dispatched: "dispatched",
        delivered: "delivered",
        cancelled: "cancelled",
      };
      await createNotification({
        userId: order.user_id,
        type: "order_status_updated",
        title: `Order ${statusLabels[newStatus] || newStatus}`,
        body: `Your order from ${roaster.business_name} has been ${statusLabels[newStatus] || newStatus}.`,
        link: "/my-orders",
        metadata: { order_id: id, new_status: newStatus },
      });
    }

    // Fire automation trigger for order status change
    // Find contact by customer email
    const { data: orderFull } = await supabase
      .from("wholesale_orders")
      .select("customer_email, subtotal")
      .eq("id", id)
      .single();

    if (orderFull?.customer_email) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("roaster_id", roaster.id)
        .eq("email", orderFull.customer_email.toLowerCase())
        .single();

      if (contact) {
        fireAutomationTrigger({
          trigger_type: "order_status_changed",
          roaster_id: roaster.id as string,
          contact_id: contact.id,
          event_data: { new_status: newStatus },
          context: { order: { subtotal: orderFull.subtotal } },
        }).catch(() => {});
        updateContactActivity(contact.id).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Order status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** PUT: Update tracking info without changing status */
export async function PUT(request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { trackingNumber, trackingCarrier } = await request.json();
    const supabase = createServerClient();

    const { data: order } = await supabase
      .from("wholesale_orders")
      .select("id")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (trackingNumber !== undefined) updatePayload.tracking_number = trackingNumber;
    if (trackingCarrier !== undefined) updatePayload.tracking_carrier = trackingCarrier;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("wholesale_orders")
      .update(updatePayload)
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update tracking" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tracking update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
