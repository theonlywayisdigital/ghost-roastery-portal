import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
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

    // Fetch items for this batch
    const { data: items, error: itemsError } = await supabase
      .from("partner_payout_items")
      .select("*")
      .eq("batch_id", id)
      .order("created_at", { ascending: true });

    if (itemsError) {
      console.error("Error fetching payout items:", itemsError);
      return NextResponse.json(
        { error: "Failed to fetch payout items" },
        { status: 500 }
      );
    }

    // Gather unique roaster IDs and order IDs for joins
    const roasterIds = Array.from(
      new Set((items || []).map((item: { roaster_id: string }) => item.roaster_id))
    );
    const orderIds = Array.from(
      new Set((items || []).map((item: { order_id: string }) => item.order_id))
    );

    // Fetch roaster names
    const { data: roasters } = await supabase
      .from("partner_roasters")
      .select("id, business_name")
      .in("id", roasterIds.length > 0 ? roasterIds : ["none"]);

    const roasterMap = new Map(
      (roasters || []).map((r) => [r.id, r.business_name])
    );

    // Fetch order numbers
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_number")
      .in("id", orderIds.length > 0 ? orderIds : ["none"]);

    const orderMap = new Map(
      (orders || []).map((o) => [o.id, o.order_number])
    );

    // Enrich items with roaster name and order number
    const enrichedItems = (items || []).map((item) => ({
      ...item,
      roaster_name: roasterMap.get(item.roaster_id) || "Unknown",
      order_number: orderMap.get(item.order_id) || "Unknown",
    }));

    return NextResponse.json({
      batch,
      items: enrichedItems,
    });
  } catch (error) {
    console.error("Get batch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    // Fetch the batch to check status
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

    if (batch.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft batches can be deleted" },
        { status: 400 }
      );
    }

    // Fetch items to get order IDs before deletion
    const { data: items } = await supabase
      .from("partner_payout_items")
      .select("order_id")
      .eq("batch_id", id);

    const orderIds = (items || []).map((item) => item.order_id);

    // Delete payout items
    const { error: deleteItemsError } = await supabase
      .from("partner_payout_items")
      .delete()
      .eq("batch_id", id);

    if (deleteItemsError) {
      console.error("Error deleting payout items:", deleteItemsError);
      return NextResponse.json(
        { error: "Failed to delete payout items" },
        { status: 500 }
      );
    }

    // Delete the batch
    const { error: deleteBatchError } = await supabase
      .from("partner_payout_batches")
      .delete()
      .eq("id", id);

    if (deleteBatchError) {
      console.error("Error deleting batch:", deleteBatchError);
      return NextResponse.json(
        { error: "Failed to delete batch" },
        { status: 500 }
      );
    }

    // Reset orders back to unpaid
    if (orderIds.length > 0) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payout_status: "unpaid",
          payout_batch_id: null,
          payout_item_id: null,
        })
        .in("id", orderIds);

      if (updateError) {
        console.error("Error resetting orders:", updateError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete batch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
