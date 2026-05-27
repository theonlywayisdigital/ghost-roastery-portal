import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  TrendingUp,
  Building2,
  ShoppingCart,
  LifeBuoy,
  Users,
  ClipboardList,
  AlertTriangle,
  Wallet,
  ArrowRight,
} from "@/components/icons";
import Link from "next/link";
import { AdminRevenueWidget } from "./AdminRevenueWidget";
import { AdminSupportWidget } from "./AdminSupportWidget";
import { AdminActivityWidget } from "./AdminActivityWidget";
import { AdminRecentOrdersWidget } from "./AdminRecentOrdersWidget";
import type { AdminActivityItem } from "./AdminActivityWidget";
import type { AdminRecentOrder } from "./AdminRecentOrdersWidget";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const supabase = createServerClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStart = startOfMonth.toISOString();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekAgo = sevenDaysAgo.toISOString();

  const ghostActiveStatuses = [
    "Pending",
    "Approved",
    "Allocated",
    "Accepted",
    "In Production",
    "Artwork Review",
  ];

  // ── Parallel queries ──
  const [
    monthlyFeesResult,
    activeRoastersResult,
    openGhostOrdersResult,
    openStorefrontOrdersResult,
    openTicketsResult,
    newLeadsResult,
    pendingPartnerAppsResult,
    pendingGrAppsResult,
    openDisputesResult,
    outstandingPayoutsResult,
    recentGhostOrdersResult,
    recentStorefrontOrdersResult,
    recentRoasterSignupsResult,
    recentTicketsResult,
    recentPartnerAppsResult,
  ] = await Promise.all([
    // 1. Platform fees this month
    supabase
      .from("platform_fee_ledger")
      .select("fee_amount")
      .eq("status", "collected")
      .gte("created_at", monthStart),

    // 2. Active roasters
    supabase
      .from("roasters")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),

    // 3. Open ghost orders
    supabase
      .from("ghost_orders")
      .select("*", { count: "exact", head: true })
      .in("order_status", ghostActiveStatuses),

    // 4. Open storefront orders
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["confirmed", "processing"]),

    // 5. Open tickets (not resolved/closed)
    supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .not("status", "in", '("resolved","closed")'),

    // 6. New leads this month (contacts with owner_type=ghost_roastery)
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("owner_type", "ghost_roastery")
      .gte("created_at", monthStart),

    // 7. Pending partner applications
    supabase
      .from("partner_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),

    // 8. Pending GR applications (roasters where ghost_roaster_application_status=pending)
    supabase
      .from("roasters")
      .select("*", { count: "exact", head: true })
      .eq("ghost_roaster_application_status", "pending"),

    // 9. Open disputes (tickets where type=dispute, not resolved/closed)
    supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("type", "dispute")
      .not("status", "in", '("resolved","closed")'),

    // 10. Outstanding payouts
    supabase
      .from("ghost_orders")
      .select("partner_payout_total")
      .eq("payout_status", "unpaid")
      .eq("payment_status", "paid")
      .not("partner_roaster_id", "is", null),

    // 11. Recent ghost orders (5)
    supabase
      .from("ghost_orders")
      .select("id, order_number, customer_name, total_price, order_status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),

    // 12. Recent storefront orders (5)
    supabase
      .from("orders")
      .select("id, order_number, customer_name, subtotal, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),

    // 13. Recent roaster signups (7 days)
    supabase
      .from("roasters")
      .select("id, business_name, created_at")
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(10),

    // 14. Recent tickets (7 days)
    supabase
      .from("support_tickets")
      .select("id, subject, ticket_number, created_at")
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(10),

    // 15. Recent partner applications (7 days)
    supabase
      .from("partner_applications")
      .select("id, roaster_id, created_at, roasters(business_name)")
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // ── Compute stats ──
  const monthlyPlatformFees = (monthlyFeesResult.data || []).reduce(
    (sum, e) => sum + (e.fee_amount || 0),
    0
  );
  const activeRoastersCount = activeRoastersResult.count || 0;
  const openOrdersCount =
    (openGhostOrdersResult.count || 0) + (openStorefrontOrdersResult.count || 0);
  const openTicketsCount = openTicketsResult.count || 0;
  const newLeadsCount = newLeadsResult.count || 0;
  const pendingApplicationsCount =
    (pendingPartnerAppsResult.count || 0) + (pendingGrAppsResult.count || 0);
  const openDisputesCount = openDisputesResult.count || 0;
  const outstandingPayoutsTotal = (outstandingPayoutsResult.data || []).reduce(
    (sum, o) => sum + (o.partner_payout_total || 0),
    0
  );

  // ── Build recent orders (merge ghost + storefront, sort, take 5) ──
  const recentOrders: AdminRecentOrder[] = [];

  for (const o of (recentGhostOrdersResult.data as any[] | null) || []) {
    recentOrders.push({
      id: o.id,
      orderNumber: o.order_number || o.id.slice(0, 8).toUpperCase(),
      date: o.created_at,
      customerName: o.customer_name,
      type: "ghost",
      status: o.order_status || "Pending",
      total: o.total_price || 0,
    });
  }

  for (const o of (recentStorefrontOrdersResult.data as any[] | null) || []) {
    recentOrders.push({
      id: o.id,
      orderNumber: o.order_number || o.id.slice(0, 8).toUpperCase(),
      date: o.created_at,
      customerName: o.customer_name,
      type: "storefront",
      status: o.status || "pending",
      total: o.subtotal || 0,
    });
  }

  recentOrders.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const topRecentOrders = recentOrders.slice(0, 5);

  // ── Build activity feed ──
  const activityItems: AdminActivityItem[] = [];

  // New orders (ghost)
  for (const o of (recentGhostOrdersResult.data as any[] | null) || []) {
    activityItems.push({
      id: `ghost-${o.id}`,
      type: "order",
      description: `New platform order ${o.order_number || ""} from ${o.customer_name || "a customer"}`,
      timestamp: o.created_at,
    });
  }

  // New orders (storefront)
  for (const o of (recentStorefrontOrdersResult.data as any[] | null) || []) {
    // Only include orders from the last 7 days
    if (new Date(o.created_at) >= sevenDaysAgo) {
      activityItems.push({
        id: `storefront-${o.id}`,
        type: "order",
        description: `New storefront order ${o.order_number || ""} from ${o.customer_name || "a customer"}`,
        timestamp: o.created_at,
      });
    }
  }

  // Roaster signups
  for (const r of (recentRoasterSignupsResult.data as any[] | null) || []) {
    activityItems.push({
      id: `roaster-${r.id}`,
      type: "roaster_signup",
      description: `${r.business_name || "A roaster"} signed up`,
      timestamp: r.created_at,
    });
  }

  // Tickets
  for (const t of (recentTicketsResult.data as any[] | null) || []) {
    activityItems.push({
      id: `ticket-${t.id}`,
      type: "ticket",
      description: `New ticket: ${t.subject || t.ticket_number}`,
      timestamp: t.created_at,
    });
  }

  // Partner applications
  for (const a of (recentPartnerAppsResult.data as any[] | null) || []) {
    const roasterName =
      (a.roasters as { business_name: string } | null)?.business_name ||
      "A roaster";
    activityItems.push({
      id: `app-${a.id}`,
      type: "partner_application",
      description: `Partner application from ${roasterName}`,
      timestamp: a.created_at,
    });
  }

  activityItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const topActivityItems = activityItems.slice(0, 8);

  // ── Stat card config ──
  const row1Cards = [
    {
      label: "Platform Revenue (MTD)",
      value: formatCurrency(monthlyPlatformFees),
      Icon: TrendingUp,
      bg: "bg-green-50",
      text: "text-green-600",
      href: "/admin/finance",
    },
    {
      label: "Active Roasters",
      value: activeRoastersCount,
      Icon: Building2,
      bg: "bg-blue-50",
      text: "text-blue-600",
      href: "/admin/roasters",
    },
    {
      label: "Open Orders",
      value: openOrdersCount,
      Icon: ShoppingCart,
      bg: "bg-orange-50",
      text: "text-orange-600",
      href: "/admin/orders",
    },
    {
      label: "Open Tickets",
      value: openTicketsCount,
      Icon: LifeBuoy,
      bg: "bg-rose-50",
      text: "text-rose-600",
      href: "/admin/support",
    },
  ];

  const row2Cards = [
    {
      label: "New Leads (MTD)",
      value: newLeadsCount,
      Icon: Users,
      bg: "bg-purple-50",
      text: "text-purple-600",
      href: "/admin/contacts",
    },
    {
      label: "Pending Applications",
      value: pendingApplicationsCount,
      Icon: ClipboardList,
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      href: "/admin/partner-program",
    },
    {
      label: "Open Disputes",
      value: openDisputesCount,
      Icon: AlertTriangle,
      bg: "bg-red-50",
      text: "text-red-600",
      href: "/admin/support",
    },
    {
      label: "Outstanding Payouts",
      value: formatCurrency(outstandingPayoutsTotal),
      Icon: Wallet,
      bg: "bg-amber-50",
      text: "text-amber-600",
      href: "/admin/finance",
    },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Platform overview: revenue, orders, support, and partner metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Row 1 — Key Business Metrics */}
        {row1Cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-6 block"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}
              >
                <card.Icon className={`w-5 h-5 ${card.text}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            </div>
            <span className="text-sm text-brand-600 flex items-center gap-1">
              View details <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Row 2 — Attention Items */}
        {row2Cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-6 block"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}
              >
                <card.Icon className={`w-5 h-5 ${card.text}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            </div>
            <span className="text-sm text-brand-600 flex items-center gap-1">
              View details <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>

      {/* Row 3 — Async Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AdminRevenueWidget />
        <AdminSupportWidget />
      </div>

      {/* Row 4 — Data Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AdminActivityWidget activityItems={topActivityItems} />
        <AdminRecentOrdersWidget recentOrders={topRecentOrders} />
      </div>
    </>
  );
}
