import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    orderType,
    status,
    artworkStatus,
    trackingNumber,
    trackingCarrier,
    cancellationReason,
    notes,
  } = body as {
    orderType: string;
    status?: string;
    artworkStatus?: string;
    trackingNumber?: string;
    trackingCarrier?: string;
    cancellationReason?: string;
    notes?: string;
  };

  const supabase = createServerClient();
  const isGhost = orderType === "ghost";
  const table = isGhost ? "orders" : "wholesale_orders";

  // Build update payload
  const updates: Record<string, unknown> = {};
  const activityEntries: { action: string; description: string }[] = [];

  if (status !== undefined) {
    if (isGhost) {
      updates.order_status = status;
    } else {
      updates.status = status;
    }

    // Set timestamps for wholesale statuses
    if (!isGhost) {
      const now = new Date().toISOString();
      if (status === "confirmed") updates.confirmed_at = now;
      if (status === "dispatched") updates.dispatched_at = now;
      if (status === "delivered") updates.delivered_at = now;
      if (status === "cancelled") updates.cancelled_at = now;
    }

    // Handle cancellation reason
    if (status === "cancelled" || status === "Cancelled") {
      if (cancellationReason) {
        updates.cancellation_reason = cancellationReason;
      }
      activityEntries.push({
        action: "cancelled",
        description: `Order cancelled${cancellationReason ? `: ${cancellationReason}` : ""}`,
      });
    } else {
      activityEntries.push({
        action: "status_change",
        description: `Status changed to ${status}`,
      });
    }
  }

  if (artworkStatus !== undefined && isGhost) {
    updates.artwork_status = artworkStatus;
    activityEntries.push({
      action: artworkStatus === "approved" ? "approved" : artworkStatus === "needs_edit" ? "declined" : "updated",
      description: `Artwork status changed to ${artworkStatus.replace(/_/g, " ")}`,
    });
  }

  if (trackingNumber !== undefined) {
    updates.tracking_number = trackingNumber;
    if (!activityEntries.some((e) => e.action === "shipped")) {
      activityEntries.push({
        action: "shipped",
        description: `Tracking number set: ${trackingNumber}${trackingCarrier ? ` (${trackingCarrier})` : ""}`,
      });
    }
  }

  if (trackingCarrier !== undefined) {
    updates.tracking_carrier = trackingCarrier;
  }

  if (notes !== undefined) {
    updates.special_instructions = notes;
    activityEntries.push({
      action: "updated",
      description: "Order notes updated",
    });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  // Apply update
  const { error: updateError } = await supabase
    .from(table)
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error("Admin order update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }

  // Log activities
  for (const entry of activityEntries) {
    await supabase.from("order_activity_log").insert({
      order_id: id,
      order_type: orderType || "ghost",
      action: entry.action,
      description: entry.description,
      actor_id: user.id,
      actor_name: user.email,
    });
  }

  return NextResponse.json({ success: true });
}
