import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  try {
    // Fetch the batch
    const { data: batch, error: batchError } = await supabase
      .from("partner_payout_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    if (batch.status !== "approved") {
      return NextResponse.json(
        {
          error: `Cannot process batch with status '${batch.status}'. Only 'approved' batches can be processed.`,
        },
        { status: 400 }
      );
    }

    // Set batch to processing
    await supabase
      .from("partner_payout_batches")
      .update({ status: "processing" })
      .eq("id", id);

    // Fetch all items for this batch
    const { data: items, error: itemsError } = await supabase
      .from("partner_payout_items")
      .select("*")
      .eq("batch_id", id);

    if (itemsError || !items) {
      console.error("Error fetching payout items:", itemsError);
      return NextResponse.json(
        { error: "Failed to fetch payout items" },
        { status: 500 }
      );
    }

    // Get unique roaster IDs for stripe_account_id lookup
    const roasterIds = Array.from(
      new Set(items.map((item: { roaster_id: string }) => item.roaster_id))
    );

    const { data: roasters } = await supabase
      .from("partner_roasters")
      .select("id, stripe_account_id")
      .in("id", roasterIds);

    const roasterMap = new Map(
      (roasters || []).map((r) => [r.id, r.stripe_account_id])
    );

    // Process stripe_transfer items
    const results: { itemId: string; success: boolean; error?: string }[] = [];

    for (const item of items) {
      if (item.payment_method !== "stripe_transfer") {
        // bank_transfer items are left as 'approved' for manual processing
        continue;
      }

      const stripeAccountId = roasterMap.get(item.roaster_id);

      if (!stripeAccountId) {
        console.error(
          `No stripe_account_id found for roaster ${item.roaster_id}`
        );
        results.push({
          itemId: item.id,
          success: false,
          error: "No Stripe account found for roaster",
        });
        continue;
      }

      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(item.amount * 100),
          currency: "gbp",
          destination: stripeAccountId,
          transfer_group: batch.batch_number,
        });

        // Update item as paid
        await supabase
          .from("partner_payout_items")
          .update({
            status: "paid",
            stripe_transfer_id: transfer.id,
            paid_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        // Update order payout_status
        await supabase
          .from("orders")
          .update({ payout_status: "paid" })
          .eq("id", item.order_id);

        results.push({ itemId: item.id, success: true });
      } catch (stripeError) {
        console.error(
          `Stripe transfer failed for item ${item.id}:`,
          stripeError
        );
        results.push({
          itemId: item.id,
          success: false,
          error:
            stripeError instanceof Error
              ? stripeError.message
              : "Stripe transfer failed",
        });
      }
    }

    // Check if all items are now paid
    const { data: updatedItems } = await supabase
      .from("partner_payout_items")
      .select("status")
      .eq("batch_id", id);

    const allPaid = (updatedItems || []).every(
      (item) => item.status === "paid"
    );

    const batchUpdate: Record<string, unknown> = {
      status: allPaid ? "completed" : "partially_completed",
    };

    if (allPaid) {
      batchUpdate.completed_at = new Date().toISOString();
    }

    await supabase
      .from("partner_payout_batches")
      .update(batchUpdate)
      .eq("id", id);

    // Fetch the final batch state
    const { data: finalBatch } = await supabase
      .from("partner_payout_batches")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({
      batch: finalBatch,
      results,
    });
  } catch (error) {
    console.error("Process batch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
