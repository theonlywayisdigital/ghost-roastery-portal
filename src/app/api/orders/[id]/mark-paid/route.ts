import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_METHODS = ["cash", "card", "bank_transfer", "stripe", "other"];

export async function POST(request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { paymentMethod, paidViaOther } = await request.json();

    if (!paymentMethod || !ALLOWED_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Valid payment method is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get current order with ownership check
    const { data: order } = await supabase
      .from("orders")
      .select("id, status, customer_name, order_channel")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Cannot mark already-paid, dispatched, delivered, or cancelled orders
    if (["paid", "dispatched", "delivered", "cancelled"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot mark as paid — order is already ${order.status}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Build notes addition for "other" method
    const noteAddition = paymentMethod === "other" && paidViaOther
      ? `Paid via: ${paidViaOther}`
      : null;

    // Update order status and payment method
    const updatePayload: Record<string, unknown> = {
      status: "paid",
      payment_method: paymentMethod,
    };

    // Append paid-via note to existing notes if needed
    if (noteAddition) {
      const { data: fullOrder } = await supabase
        .from("orders")
        .select("notes")
        .eq("id", id)
        .single();

      const existingNotes = fullOrder?.notes || "";
      updatePayload.notes = [existingNotes, noteAddition].filter(Boolean).join("\n");
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (updateError) {
      console.error("[mark-paid] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to mark order as paid" },
        { status: 500 }
      );
    }

    // Log activity
    const methodLabel = paymentMethod === "other" && paidViaOther
      ? paidViaOther
      : paymentMethod.replace("_", " ");

    await supabase
      .from("order_activity_log")
      .insert({
        order_id: id,
        order_type: order.order_channel || "wholesale",
        action: "status_change",
        description: `Marked as paid (${methodLabel}) by ${roaster.business_name}`,
        actor_id: roaster.user_id || null,
        actor_name: roaster.business_name,
        created_at: now,
      })
      .then(({ error: logError }) => {
        if (logError) console.error("[mark-paid] Activity log error:", logError);
      });

    return NextResponse.json({ success: true, status: "paid" });
  } catch (error) {
    console.error("[mark-paid] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
