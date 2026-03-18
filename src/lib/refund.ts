import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

interface ProcessRefundParams {
  orderId: string;
  orderType: string; // "wholesale" | "storefront" | "ghost_roastery"
  refundType: "full" | "partial";
  amount: number;
  reason: string;
  reasonCategory?: string;
  actorId: string;
  actorName: string;
}

interface RefundResult {
  success: boolean;
  error?: string;
  refundId?: string;
  stripeRefundId?: string;
}

/**
 * Process a Stripe refund for an order. Shared between admin refund route
 * and cancel endpoints so that non-admin callers can also trigger refunds.
 */
export async function processStripeRefund(params: ProcessRefundParams): Promise<RefundResult> {
  const { orderId, orderType, refundType, amount, reason, reasonCategory, actorId, actorName } = params;

  if (!amount || amount <= 0) {
    return { success: false, error: "Amount must be greater than 0" };
  }

  const supabase = createServerClient();
  const isGhost = orderType === "ghost_roastery";
  const table = isGhost ? "ghost_orders" : "orders";

  // Fetch the order
  const { data: order, error: orderError } = await supabase
    .from(table)
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: "Order not found" };
  }

  const orderTotal = isGhost ? order.total_price : order.subtotal;
  const existingRefundTotal = order.refund_total || 0;
  const remaining = orderTotal - existingRefundTotal;
  const stripePaymentId = order.stripe_payment_id;

  if (amount > remaining + 0.01) {
    return { success: false, error: `Refund amount exceeds remaining refundable amount of £${remaining.toFixed(2)}` };
  }

  if (!stripePaymentId) {
    return { success: false, error: "No Stripe payment found for this order" };
  }

  // Insert refund record as processing
  const { data: refund, error: insertError } = await supabase
    .from("refunds")
    .insert({
      order_type: orderType,
      order_id: orderId,
      refund_type: refundType,
      amount,
      reason,
      reason_category: reasonCategory || null,
      status: "processing",
      stripe_payment_intent_id: stripePaymentId,
      created_by: actorId,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Refund insert error:", insertError);
    return { success: false, error: "Failed to create refund record" };
  }

  try {
    const amountInPence = Math.round(amount * 100);

    const refundParams: {
      payment_intent: string;
      amount: number;
      reverse_transfer?: boolean;
    } = {
      payment_intent: stripePaymentId,
      amount: amountInPence,
    };

    // Storefront/wholesale use destination charges — need reverse_transfer
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
      .eq("id", orderId);

    // Create negative ledger entry
    if (isGhost) {
      await supabase.from("platform_fee_ledger").insert({
        roaster_id: order.partner_roaster_id || null,
        order_type: "ghost_roastery",
        reference_id: orderId,
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
          .from("ghost_orders")
          .update({ partner_payout_total: newPayoutTotal })
          .eq("id", orderId);
      }
    } else {
      // Storefront/wholesale — proportional fee reversal
      const { data: originalLedger } = await supabase
        .from("platform_fee_ledger")
        .select("*")
        .eq("reference_id", orderId)
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
          reference_id: orderId,
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
      order_id: orderId,
      order_type: orderType === "ghost_roastery" ? "ghost" : orderType,
      action: "refunded",
      description: `${refundType === "full" ? "Full" : "Partial"} refund of £${amount.toFixed(2)} processed via Stripe (${stripeRefund.id}). Reason: ${reason}`,
      actor_id: actorId,
      actor_name: actorName,
    });

    // Flag if payout already paid (Ghost orders only)
    if (isGhost && order.payout_status === "paid") {
      await supabase.from("order_activity_log").insert({
        order_id: orderId,
        order_type: "ghost",
        action: "note",
        description: `Warning: Partner payout was already marked as paid. Manual clawback of £${(order.partner_payout_total * (amount / orderTotal)).toFixed(2)} may be needed.`,
        actor_id: actorId,
        actor_name: actorName,
      });
    }

    return { success: true, refundId: refund.id, stripeRefundId: stripeRefund.id };
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

    return { success: false, error: `Stripe refund failed: ${errorMessage}` };
  }
}
