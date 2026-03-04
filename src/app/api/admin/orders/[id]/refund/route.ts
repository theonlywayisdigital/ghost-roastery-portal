import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

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

  const supabase = createServerClient();
  const isGhost = orderType === "ghost_roastery";
  const table = isGhost ? "orders" : "wholesale_orders";

  // Fetch the order
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

  const stripePaymentId = order.stripe_payment_id;

  // Store credit — no Stripe call
  if (refundType === "store_credit") {
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

    // Update order refund totals
    await supabase
      .from(table)
      .update({ refund_total: newRefundTotal, refund_status: newRefundStatus })
      .eq("id", id);

    // Log activity
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

  // Stripe refund
  if (!stripePaymentId) {
    return NextResponse.json(
      { error: "No Stripe payment found for this order. Use store credit instead." },
      { status: 400 }
    );
  }

  // Insert refund record as processing
  const { data: refund, error: insertError } = await supabase
    .from("refunds")
    .insert({
      order_type: orderType,
      order_id: id,
      refund_type: refundType,
      amount,
      reason,
      reason_category: reasonCategory || null,
      status: "processing",
      stripe_payment_intent_id: stripePaymentId,
      notes: notes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Refund insert error:", insertError);
    return NextResponse.json({ error: "Failed to create refund record" }, { status: 500 });
  }

  try {
    const amountInPence = Math.round(amount * 100);

    // Storefront/wholesale use destination charges — need reverse_transfer
    const refundParams: {
      payment_intent: string;
      amount: number;
      reason?: "requested_by_customer" | "duplicate" | "fraudulent";
      reverse_transfer?: boolean;
    } = {
      payment_intent: stripePaymentId,
      amount: amountInPence,
    };

    if (!isGhost) {
      refundParams.reverse_transfer = true;
    }

    const stripeRefund = await stripe.refunds.create(refundParams);

    // Update refund record as completed
    const newRefundTotal = existingRefundTotal + amount;
    const newRefundStatus = newRefundTotal >= orderTotal ? "full" : "partial";

    await supabase
      .from("refunds")
      .update({
        status: "completed",
        stripe_refund_id: stripeRefund.id,
        completed_at: new Date().toISOString(),
      })
      .eq("id", refund.id);

    // Update order refund totals
    await supabase
      .from(table)
      .update({ refund_total: newRefundTotal, refund_status: newRefundStatus })
      .eq("id", id);

    // Create negative ledger entry
    if (isGhost) {
      await supabase.from("platform_fee_ledger").insert({
        roaster_id: order.partner_roaster_id || null,
        order_type: "ghost_roastery",
        reference_id: id,
        gross_amount: -amount,
        fee_amount: -amount,
        fee_percent: 100,
        net_to_roaster: 0,
        currency: "GBP",
        stripe_payment_id: stripePaymentId,
        status: "collected",
      });

      // Adjust partner payout if unpaid
      if (order.payout_status === "unpaid" && order.partner_payout_total > 0) {
        const proportionalPayout = order.partner_payout_total * (amount / orderTotal);
        const newPayoutTotal = Math.max(0, order.partner_payout_total - proportionalPayout);
        await supabase
          .from("orders")
          .update({ partner_payout_total: newPayoutTotal })
          .eq("id", id);
      }
    } else {
      // Storefront/wholesale — proportional fee reversal
      const { data: originalLedger } = await supabase
        .from("platform_fee_ledger")
        .select("*")
        .eq("reference_id", id)
        .gt("gross_amount", 0)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (originalLedger) {
        const proportion = amount / originalLedger.gross_amount;
        const feeRefund = originalLedger.fee_amount * proportion;
        const netRefund = amount - feeRefund;

        await supabase.from("platform_fee_ledger").insert({
          roaster_id: order.roaster_id || null,
          order_type: orderType,
          reference_id: id,
          gross_amount: -amount,
          fee_amount: -feeRefund,
          fee_percent: originalLedger.fee_percent,
          net_to_roaster: -netRefund,
          currency: "GBP",
          stripe_payment_id: stripePaymentId,
          status: "collected",
        });
      }
    }

    // Log activity
    await supabase.from("order_activity_log").insert({
      order_id: id,
      order_type: orderType === "ghost_roastery" ? "ghost" : orderType,
      action: "refunded",
      description: `${refundType === "full" ? "Full" : "Partial"} refund of £${amount.toFixed(2)} processed via Stripe (${stripeRefund.id}). Reason: ${reason}`,
      actor_id: user.id,
      actor_name: user.email,
    });

    // Flag if payout already paid (Ghost orders only)
    if (isGhost && order.payout_status === "paid") {
      await supabase.from("order_activity_log").insert({
        order_id: id,
        order_type: "ghost",
        action: "note",
        description: `Warning: Partner payout was already marked as paid. Manual clawback of £${(order.partner_payout_total * (amount / orderTotal)).toFixed(2)} may be needed.`,
        actor_id: user.id,
        actor_name: user.email,
      });
    }

    return NextResponse.json({ refund: { ...refund, status: "completed", stripe_refund_id: stripeRefund.id } });
  } catch (stripeError: unknown) {
    const errorMessage = stripeError instanceof Error ? stripeError.message : "Unknown Stripe error";
    console.error("Stripe refund error:", stripeError);

    // Update refund as failed
    await supabase
      .from("refunds")
      .update({
        status: "failed",
        failed_reason: errorMessage,
      })
      .eq("id", refund.id);

    return NextResponse.json(
      { error: `Stripe refund failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
