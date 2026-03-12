import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roasterId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roasterId } = await params;
    const supabase = createServerClient();

    // Fetch roaster
    const { data: roaster, error } = await supabase
      .from("partner_roasters")
      .select("*")
      .eq("id", roasterId)
      .single();

    if (error || !roaster) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    // Fetch territories, rates, orders, applications, roaster_orders in parallel
    const [territoriesRes, ratesRes, ordersRes, applicationsRes, roasterOrdersRes, bracketsRes] = await Promise.all([
      supabase
        .from("partner_territories")
        .select("*")
        .eq("roaster_id", roasterId)
        .order("country_name"),
      supabase
        .from("partner_rates")
        .select("*")
        .eq("roaster_id", roasterId)
        .order("bag_size"),
      supabase
        .from("ghost_orders")
        .select("id, order_number, bag_size, quantity, order_status, total_price, partner_rate_per_bag, partner_payout_total, fulfilment_type, created_at")
        .eq("partner_roaster_id", roasterId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("partner_applications")
        .select("*")
        .eq("roaster_id", roasterId)
        .order("applied_at", { ascending: false }),
      supabase
        .from("roaster_orders")
        .select("status, dispatched_on_time, shipped_at")
        .eq("roaster_id", roasterId),
      supabase
        .from("pricing_tier_brackets")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    // Fetch rate history from unified table
    const rateIds = (ratesRes.data || []).map((r) => r.id);
    let rateHistory: Array<{
      id: string;
      record_type: string;
      record_id: string;
      field_changed: string;
      old_value: string | null;
      new_value: string | null;
      changed_by: string | null;
      changed_at: string;
    }> = [];
    if (rateIds.length > 0) {
      const { data } = await supabase
        .from("pricing_change_history")
        .select("*")
        .eq("record_type", "partner_rate")
        .in("record_id", rateIds)
        .order("changed_at", { ascending: false })
        .limit(100);
      rateHistory = data || [];
    }

    // Fetch customer pricing (bracket-based)
    const { data: customerPrices } = await supabase
      .from("pricing_tier_prices")
      .select("bracket_id, bag_size, price_per_bag, currency")
      .eq("is_active", true);

    // Calculate SLA
    const roasterOrders = roasterOrdersRes.data || [];
    const shippedOrders = roasterOrders.filter((o) => o.shipped_at);
    const slaCompliance = shippedOrders.length > 0
      ? Math.round((shippedOrders.filter((o) => o.dispatched_on_time).length / shippedOrders.length) * 100)
      : null;

    return NextResponse.json({
      roaster,
      territories: territoriesRes.data || [],
      rates: ratesRes.data || [],
      orders: ordersRes.data || [],
      rateHistory,
      applications: applicationsRes.data || [],
      brackets: bracketsRes.data || [],
      customerPrices: customerPrices || [],
      stats: {
        totalFulfilled: (ordersRes.data || []).length,
        activeTerritories: (territoriesRes.data || []).filter((t) => t.is_active).length,
        slaCompliance,
      },
    });
  } catch (error) {
    console.error("Partner detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
