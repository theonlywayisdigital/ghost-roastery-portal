import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Get all ghost roasters (partners)
    const { data: partners, error } = await supabase
      .from("partner_roasters")
      .select("id, business_name, contact_name, email, country, city, is_active, is_ghost_roaster, is_verified, ghost_roaster_approved_at, created_at")
      .eq("is_ghost_roaster", true)
      .order("business_name");

    if (error) {
      console.error("Partners fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch partners" }, { status: 500 });
    }

    const partnerIds = (partners || []).map((p) => p.id);

    // Fetch territories, rates, and order stats in parallel
    const [territoriesResult, ratesResult, ordersResult, roasterOrdersResult] = await Promise.all([
      supabase
        .from("partner_territories")
        .select("roaster_id, country_name, region")
        .in("roaster_id", partnerIds.length > 0 ? partnerIds : ["__none__"])
        .eq("is_active", true),
      supabase
        .from("partner_rates")
        .select("roaster_id, bag_size")
        .in("roaster_id", partnerIds.length > 0 ? partnerIds : ["__none__"])
        .eq("is_active", true),
      supabase
        .from("orders")
        .select("partner_roaster_id, fulfilment_type, order_status")
        .in("partner_roaster_id", partnerIds.length > 0 ? partnerIds : ["__none__"])
        .eq("fulfilment_type", "partner"),
      supabase
        .from("roaster_orders")
        .select("roaster_id, status, dispatched_on_time, shipped_at")
        .in("roaster_id", partnerIds.length > 0 ? partnerIds : ["__none__"]),
    ]);

    // Build lookup maps
    const territoryMap: Record<string, string[]> = {};
    for (const t of territoriesResult.data || []) {
      if (!territoryMap[t.roaster_id]) territoryMap[t.roaster_id] = [];
      territoryMap[t.roaster_id].push(t.region ? `${t.country_name} (${t.region})` : t.country_name);
    }

    const rateMap: Record<string, string[]> = {};
    for (const r of ratesResult.data || []) {
      if (!rateMap[r.roaster_id]) rateMap[r.roaster_id] = [];
      if (!rateMap[r.roaster_id].includes(r.bag_size)) rateMap[r.roaster_id].push(r.bag_size);
    }

    const orderMap: Record<string, { active: number; total: number }> = {};
    for (const o of ordersResult.data || []) {
      const rid = o.partner_roaster_id;
      if (!rid) continue;
      if (!orderMap[rid]) orderMap[rid] = { active: 0, total: 0 };
      orderMap[rid].total += 1;
      if (o.order_status !== "Delivered" && o.order_status !== "Cancelled") {
        orderMap[rid].active += 1;
      }
    }

    const slaMap: Record<string, { onTime: number; total: number }> = {};
    for (const ro of roasterOrdersResult.data || []) {
      if (!slaMap[ro.roaster_id]) slaMap[ro.roaster_id] = { onTime: 0, total: 0 };
      if (ro.shipped_at) {
        slaMap[ro.roaster_id].total += 1;
        if (ro.dispatched_on_time) slaMap[ro.roaster_id].onTime += 1;
      }
    }

    const partnersWithStats = (partners || []).map((p) => ({
      ...p,
      territories: territoryMap[p.id] || [],
      bag_sizes: rateMap[p.id] || [],
      active_orders: orderMap[p.id]?.active || 0,
      total_fulfilled: orderMap[p.id]?.total || 0,
      sla_compliance: slaMap[p.id]?.total > 0
        ? Math.round((slaMap[p.id].onTime / slaMap[p.id].total) * 100)
        : null,
    }));

    return NextResponse.json({ partners: partnersWithStats });
  } catch (error) {
    console.error("Partners API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
