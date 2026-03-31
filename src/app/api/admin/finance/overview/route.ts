import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    // Total revenue from Roastery Platform orders
    const { data: ghostOrders } = await supabase
      .from("ghost_orders")
      .select("total_price")
      .eq("payment_status", "paid");

    const totalGhostRevenue = (ghostOrders || []).reduce(
      (sum, o) => sum + (o.total_price || 0),
      0
    );

    // Total revenue from storefront/wholesale orders
    const { data: storefrontOrders } = await supabase
      .from("orders")
      .select("subtotal, platform_fee")
      .eq("status", "paid");

    const totalStorefrontRevenue = (storefrontOrders || []).reduce(
      (sum, o) => sum + (o.subtotal || 0),
      0
    );

    // Platform fees from ledger
    const { data: ledgerEntries } = await supabase
      .from("platform_fee_ledger")
      .select("fee_amount, order_type, gross_amount, net_to_roaster, created_at")
      .eq("status", "collected");

    const platformFees = (ledgerEntries || []).reduce(
      (sum, e) => sum + (e.fee_amount || 0),
      0
    );

    // Roastery Platform margin (orders without partner routing — full margin)
    const ghostMargin = (ledgerEntries || [])
      .filter((e) => e.order_type === "ghost_roastery")
      .reduce((sum, e) => sum + (e.fee_amount || 0), 0);

    // Outstanding payouts
    const { data: unpaidOrders } = await supabase
      .from("ghost_orders")
      .select("partner_payout_total")
      .eq("payout_status", "unpaid")
      .eq("payment_status", "paid")
      .not("partner_roaster_id", "is", null);

    const outstandingPayouts = (unpaidOrders || []).reduce(
      (sum, o) => sum + (o.partner_payout_total || 0),
      0
    );

    // Outstanding invoices
    const { data: unpaidInvoices } = await supabase
      .from("invoices")
      .select("total, amount_paid")
      .in("status", ["sent", "viewed", "overdue", "partially_paid"]);

    const outstandingInvoices = (unpaidInvoices || []).reduce(
      (sum, inv) => sum + ((inv.total || 0) - (inv.amount_paid || 0)),
      0
    );

    // Total refunded
    const { data: completedRefunds } = await supabase
      .from("refunds")
      .select("amount")
      .eq("status", "completed");

    const totalRefunded = (completedRefunds || []).reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    );

    // Recent ledger entries
    const { data: recentLedger } = await supabase
      .from("platform_fee_ledger")
      .select("*, roasters(business_name)")
      .order("created_at", { ascending: false })
      .limit(20);

    const recentLedgerEntries = (recentLedger || []).map((e) => ({
      ...e,
      roaster_name:
        (e.roasters as { business_name: string } | null)
          ?.business_name || null,
      roasters: undefined,
    }));

    // Monthly revenue (last 12 months)
    const monthlyRevenue: { month: string; revenue: number; fees: number }[] =
      [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
      const monthStart = `${monthStr}-01`;
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthEnd = nextMonth.toISOString().slice(0, 10);

      const monthEntries = (ledgerEntries || []).filter((e) => {
        const created = e.created_at;
        return created >= monthStart && created < monthEnd;
      });

      monthlyRevenue.push({
        month: monthStr,
        revenue: monthEntries.reduce(
          (sum, e) => sum + (e.gross_amount || 0),
          0
        ),
        fees: monthEntries.reduce((sum, e) => sum + (e.fee_amount || 0), 0),
      });
    }

    return NextResponse.json({
      totalRevenue: totalGhostRevenue + totalStorefrontRevenue,
      ghostRoasteryMargin: ghostMargin,
      platformFees,
      outstandingPayouts,
      outstandingInvoices,
      totalRefunded,
      recentLedgerEntries,
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Finance overview error:", error);
    return NextResponse.json(
      { error: "Failed to load finance overview." },
      { status: 500 }
    );
  }
}
