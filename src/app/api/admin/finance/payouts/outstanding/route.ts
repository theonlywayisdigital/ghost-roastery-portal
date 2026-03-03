import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    // Fetch all unpaid orders with a partner roaster
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, partner_roaster_id, partner_payout_total")
      .not("partner_roaster_id", "is", null)
      .eq("payout_status", "unpaid")
      .eq("payment_status", "paid");

    if (ordersError) {
      console.error("Error fetching outstanding orders:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch outstanding orders" },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Group by partner_roaster_id
    const grouped = new Map<
      string,
      { order_count: number; total_amount: number }
    >();

    for (const order of orders) {
      const roasterId = order.partner_roaster_id as string;
      const existing = grouped.get(roasterId) || {
        order_count: 0,
        total_amount: 0,
      };
      existing.order_count += 1;
      existing.total_amount += parseFloat(order.partner_payout_total) || 0;
      grouped.set(roasterId, existing);
    }

    // Fetch roaster details
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

    // Build response
    const data = roasterIds.map((roasterId) => {
      const roaster = roasterMap.get(roasterId);
      const group = grouped.get(roasterId)!;
      return {
        roaster_id: roasterId,
        roaster_name: roaster?.business_name || "Unknown",
        order_count: group.order_count,
        total_amount: group.total_amount,
        has_stripe_account: !!roaster?.stripe_account_id,
      };
    });

    // Sort by total_amount descending
    data.sort((a, b) => b.total_amount - a.total_amount);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Outstanding payouts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
