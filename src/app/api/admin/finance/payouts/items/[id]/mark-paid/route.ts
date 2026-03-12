import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  try {
    const body = await request.json();
    const { reference, notes } = body as {
      reference?: string;
      notes?: string;
    };

    // Fetch the payout item
    const { data: item, error: itemError } = await supabase
      .from("partner_payout_items")
      .select("*")
      .eq("id", id)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "Payout item not found" },
        { status: 404 }
      );
    }

    if (item.payment_method !== "bank_transfer") {
      return NextResponse.json(
        { error: "Only bank_transfer items can be manually marked as paid" },
        { status: 400 }
      );
    }

    if (item.status === "paid") {
      return NextResponse.json(
        { error: "Item is already marked as paid" },
        { status: 400 }
      );
    }

    // Update the payout item
    const { data: updatedItem, error: updateError } = await supabase
      .from("partner_payout_items")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        notes: [reference ? `Ref: ${reference}` : null, notes]
          .filter(Boolean)
          .join(" — ") || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error marking item as paid:", updateError);
      return NextResponse.json(
        { error: "Failed to update payout item" },
        { status: 500 }
      );
    }

    // Update the order payout_status
    const { error: orderError } = await supabase
      .from("ghost_orders")
      .update({ payout_status: "paid" })
      .eq("id", item.order_id);

    if (orderError) {
      console.error("Error updating order payout status:", orderError);
    }

    // Check if all items in the batch are now paid
    const { data: batchItems } = await supabase
      .from("partner_payout_items")
      .select("status")
      .eq("batch_id", item.batch_id);

    const allPaid = (batchItems || []).every(
      (batchItem) => batchItem.status === "paid"
    );

    if (allPaid) {
      await supabase
        .from("partner_payout_batches")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", item.batch_id);
    }

    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    console.error("Mark paid error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
