import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { processStripeRefund } from "@/lib/refund";

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
  const { orderType, refundType, amount, reason, reasonCategory, notes } = body as {
    orderType: string;
    refundType: "full" | "partial" | "store_credit";
    amount: number;
    reason: string;
    reasonCategory?: string;
    notes?: string;
  };

  if (!orderType || !refundType || !amount || !reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }

  // Store credit — admin-only, no Stripe call
  if (refundType === "store_credit") {
    const supabase = createServerClient();
    const isGhost = orderType === "ghost_roastery";
    const table = isGhost ? "ghost_orders" : "orders";

    const { data: order, error: orderError } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderTotal = isGhost ? order.total_price : order.subtotal;
    const existingRefundTotal = order.refund_total || 0;
    const remaining = orderTotal - existingRefundTotal;

    if (amount > remaining + 0.01) {
      return NextResponse.json(
        { error: `Refund amount exceeds remaining refundable amount of £${remaining.toFixed(2)}` },
        { status: 400 }
      );
    }

    const newRefundTotal = existingRefundTotal + amount;
    const newRefundStatus = newRefundTotal >= orderTotal ? "full" : "partial";

    const { data: refund, error: insertError } = await supabase
      .from("refunds")
      .insert({
        order_type: orderType,
        order_id: id,
        refund_type: "store_credit",
        amount,
        reason,
        reason_category: reasonCategory || null,
        status: "completed",
        notes: notes || null,
        created_by: user.id,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Refund insert error:", insertError);
      return NextResponse.json({ error: "Failed to create refund record" }, { status: 500 });
    }

    await supabase
      .from(table)
      .update({ refund_total: newRefundTotal, refund_status: newRefundStatus })
      .eq("id", id);

    await supabase.from("order_activity_log").insert({
      order_id: id,
      order_type: orderType === "ghost_roastery" ? "ghost" : orderType,
      action: "refunded",
      description: `Store credit of £${amount.toFixed(2)} issued. Reason: ${reason}`,
      actor_id: user.id,
      actor_name: user.email,
    });

    return NextResponse.json({ refund });
  }

  // Stripe refund — use shared function
  const result = await processStripeRefund({
    orderId: id,
    orderType,
    refundType,
    amount,
    reason,
    reasonCategory,
    actorId: user.id,
    actorName: user.email,
  });

  if (!result.success) {
    const status = result.error?.includes("not found") ? 404
      : result.error?.includes("exceeds") ? 400
      : result.error?.includes("No Stripe") ? 400
      : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ refund: { id: result.refundId, status: "completed", stripe_refund_id: result.stripeRefundId } });
}
