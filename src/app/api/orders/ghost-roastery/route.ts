import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;
  const supabase = createServerClient();

  // Fetch orders assigned to this roaster
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_email, brand_name, bag_size, bag_colour, roast_profile, grind, quantity, total_price, price_per_bag, partner_payout_total, order_status, payment_status, artwork_status, label_file_url, mockup_image_url, delivery_address, created_at")
    .eq("partner_roaster_id", roasterId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching ghost roastery orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  // Fetch roaster_orders for fulfilment status
  const orderIds = (orders || []).map((o) => o.id);
  let roasterOrderMap = new Map<string, any>();
  if (orderIds.length > 0) {
    const { data: roasterOrders } = await supabase
      .from("roaster_orders")
      .select("*")
      .eq("roaster_id", roasterId)
      .in("order_id", orderIds);

    roasterOrderMap = new Map(
      (roasterOrders || []).map((ro) => [ro.order_id, ro])
    );
  }

  // Enrich orders with fulfilment status
  const enriched = (orders || []).map((o) => ({
    ...o,
    roaster_order: roasterOrderMap.get(o.id) || null,
  }));

  return NextResponse.json({ data: enriched });
}
