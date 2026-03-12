import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const pageSize = parseInt(sp.get("pageSize") || "25");
  const status = sp.get("status") || "";
  const orderType = sp.get("orderType") || "";
  const reasonCategory = sp.get("reasonCategory") || "";
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";

  const supabase = createServerClient();

  // Build query for refunds list
  let query = supabase
    .from("refunds")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (orderType) query = query.eq("order_type", orderType);
  if (reasonCategory) query = query.eq("reason_category", reasonCategory);
  if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: refunds, count, error } = await query;

  if (error) {
    console.error("Fetch refunds error:", error);
    return NextResponse.json({ error: "Failed to fetch refunds" }, { status: 500 });
  }

  // Enrich with order data
  const enrichedRefunds = await Promise.all(
    (refunds || []).map(async (refund) => {
      const isGhost = refund.order_type === "ghost_roastery";
      /* eslint-disable @typescript-eslint/no-explicit-any */
      let order: any = null;

      if (isGhost) {
        const { data } = await supabase
          .from("ghost_orders")
          .select("order_number, customer_name, customer_email")
          .eq("id", refund.order_id)
          .single();
        order = data;
      } else {
        const { data } = await supabase
          .from("orders")
          .select("id, customer_name, customer_email")
          .eq("id", refund.order_id)
          .single();
        order = data;
      }

      return {
        ...refund,
        order_number: isGhost ? order?.order_number : order?.id?.slice(0, 8).toUpperCase(),
        customer_name: order?.customer_name || null,
        customer_email: order?.customer_email || null,
      };
    })
  );

  // Summary stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: allCompleted } = await supabase
    .from("refunds")
    .select("amount, created_at")
    .eq("status", "completed");

  const completedRefunds = allCompleted || [];
  const thisMonthRefunds = completedRefunds.filter((r) => r.created_at >= monthStart);

  const totalRefundedAllTime = completedRefunds.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalRefundedThisMonth = thisMonthRefunds.reduce((sum, r) => sum + (r.amount || 0), 0);
  const refundCountThisMonth = thisMonthRefunds.length;
  const averageRefundAmount = completedRefunds.length > 0
    ? totalRefundedAllTime / completedRefunds.length
    : 0;

  return NextResponse.json({
    data: enrichedRefunds,
    total: count || 0,
    page,
    pageSize,
    summary: {
      totalRefundedThisMonth,
      totalRefundedAllTime,
      refundCountThisMonth,
      averageRefundAmount,
    },
  });
}
