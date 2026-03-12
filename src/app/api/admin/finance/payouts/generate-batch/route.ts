import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    // Find all unpaid orders eligible for payout
    const { data: orders, error: ordersError } = await supabase
      .from("ghost_orders")
      .select("*")
      .not("partner_roaster_id", "is", null)
      .eq("payout_status", "unpaid")
      .eq("payment_status", "paid")
      .in("order_status", ["Delivered", "Dispatched"]);

    if (ordersError) {
      console.error("Error fetching unpaid orders:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch unpaid orders" },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: "No eligible orders found for payout" },
        { status: 400 }
      );
    }

    // Group orders by partner_roaster_id
    const grouped = new Map<string, typeof orders>();
    for (const order of orders) {
      const roasterId = order.partner_roaster_id as string;
      if (!grouped.has(roasterId)) {
        grouped.set(roasterId, []);
      }
      grouped.get(roasterId)!.push(order);
    }

    // Fetch roaster details for all partner roasters in this batch
    const roasterIds = Array.from(grouped.keys());
    const { data: roasters, error: roastersError } = await supabase
      .from("partner_roasters")
      .select("id, business_name, stripe_account_id")
      .in("id", roasterIds);

    if (roastersError) {
      console.error("Error fetching roasters:", roastersError);
      return NextResponse.json(
        { error: "Failed to fetch roaster details" },
        { status: 500 }
      );
    }

    const roasterMap = new Map(
      (roasters || []).map((r) => [r.id, r])
    );

    // Generate batch number using sequence
    const { data: seqResult, error: seqError } = await supabase.rpc(
      "nextval_payout_batch_seq"
    );

    let seqVal: number | undefined;
    if (seqError) {
      // Fallback: use raw SQL via rpc if the wrapper doesn't exist
      const { data: rawSeq, error: rawSeqError } = await supabase
        .from("payout_batch_seq_view")
        .select("nextval")
        .single();

      if (rawSeqError) {
        console.error("Error getting batch sequence:", seqError, rawSeqError);
        return NextResponse.json(
          { error: "Failed to generate batch number" },
          { status: 500 }
        );
      }

      seqVal = rawSeq?.nextval;
    } else {
      seqVal = seqResult;
    }

    const batchNumber = `PB-${new Date().getFullYear()}-${String(seqVal).padStart(3, "0")}`;

    // Calculate totals — use partner_payout_total (roaster's negotiated rate), not total_price (customer price)
    const totalAmount = orders.reduce(
      (sum, o) => sum + (parseFloat(o.partner_payout_total) || 0),
      0
    );
    const totalOrders = orders.length;
    const totalRoasters = grouped.size;

    // Create the batch
    const { data: batch, error: batchError } = await supabase
      .from("partner_payout_batches")
      .insert({
        batch_number: batchNumber,
        status: "draft",
        total_amount: totalAmount,
        total_orders: totalOrders,
        partner_count: totalRoasters,
        created_by: user.id,
      })
      .select()
      .single();

    if (batchError || !batch) {
      console.error("Error creating batch:", batchError);
      return NextResponse.json(
        { error: "Failed to create payout batch" },
        { status: 500 }
      );
    }

    // Create payout items for each order
    const payoutItems = [];
    for (const order of orders) {
      const roasterId = order.partner_roaster_id as string;
      const roaster = roasterMap.get(roasterId);
      const paymentMethod = roaster?.stripe_account_id
        ? "stripe_transfer"
        : "bank_transfer";

      payoutItems.push({
        batch_id: batch.id,
        roaster_id: roasterId,
        order_id: order.id,
        amount: parseFloat(order.partner_payout_total) || 0,
        payment_method: paymentMethod,
        status: "pending",
      });
    }

    const { data: createdItems, error: itemsError } = await supabase
      .from("partner_payout_items")
      .insert(payoutItems)
      .select();

    if (itemsError) {
      console.error("Error creating payout items:", itemsError);
      // Clean up the batch since items failed
      await supabase
        .from("partner_payout_batches")
        .delete()
        .eq("id", batch.id);
      return NextResponse.json(
        { error: "Failed to create payout items" },
        { status: 500 }
      );
    }

    // Build a map of order_id -> payout_item_id
    const itemMap = new Map(
      (createdItems || []).map((item) => [item.order_id, item.id])
    );

    // Update orders: set payout_status, batch_id, and item_id
    const failedOrderIds: string[] = [];
    for (const order of orders) {
      const payoutItemId = itemMap.get(order.id);
      const { error: updateError } = await supabase
        .from("ghost_orders")
        .update({
          payout_status: "batched",
          payout_batch_id: batch.id,
          payout_item_id: payoutItemId,
        })
        .eq("id", order.id);

      if (updateError) {
        failedOrderIds.push(order.id);
      }
    }

    return NextResponse.json({
      ...(failedOrderIds.length > 0 ? { warning: `${failedOrderIds.length} order(s) failed to update`, failedOrderIds } : {}),
      batch: {
        ...batch,
        items: createdItems,
      },
    });
  } catch (error) {
    console.error("Generate batch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
