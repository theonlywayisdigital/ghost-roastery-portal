import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  Package, Coffee, TrendingUp, ArrowRight, ClipboardList, Users, Store,
  ShoppingCart, Wallet, AlertTriangle,
} from "@/components/icons";
import Link from "next/link";
import { DashboardWidgets } from "./DashboardWidgets";
import { DashboardQuickActions } from "./DashboardQuickActions";
import type { RecentOrder, ActivityItem } from "./DashboardWidgets";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createServerClient();
  const isRoaster = user.roles.includes("roaster");
  const isCustomer =
    user.roles.includes("ghost_roastery_customer") ||
    user.roles.includes("retail_buyer") ||
    user.roles.includes("wholesale_buyer");
  const isGhostRoaster = !!(user.roaster?.is_ghost_roaster);
  const roasterId = user.roaster?.id;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // ── Parallel queries ──
  const [
    // Existing stat queries
    pendingWholesaleResult,
    wholesaleRequestsResult,
    ghostOrderCountResult,
    wsRevenueResult,
    ghostRevenueResult,
    customerOrderResult,
    wholesaleAccountResult,
    // New stat queries
    openOrdersResult,
    pendingPayoutsResult,
    overdueInvoicesResult,
    lowStockResult,
    // Recent orders
    recentStorefrontResult,
    recentGhostResult,
    // Activity feed sources
    activityOrdersResult,
    activityGhostOrdersResult,
    activityFormSubmissionsResult,
    activityWholesaleAppsResult,
    activityPayoutsResult,
  ] = await Promise.all([
    // ── Existing stats ──
    isRoaster && roasterId
      ? supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("roaster_id", roasterId)
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),

    isRoaster && roasterId
      ? supabase
          .from("wholesale_access")
          .select("*", { count: "exact", head: true })
          .eq("roaster_id", roasterId)
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),

    isGhostRoaster && roasterId
      ? supabase
          .from("roaster_orders")
          .select("*", { count: "exact", head: true })
          .eq("roaster_id", roasterId)
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),

    isRoaster && roasterId
      ? supabase
          .from("orders")
          .select("roaster_payout, subtotal")
          .eq("roaster_id", roasterId)
          .gte("created_at", startOfMonth.toISOString())
          .not("status", "eq", "cancelled")
      : Promise.resolve({ data: [] }),

    isGhostRoaster && roasterId
      ? supabase
          .from("ghost_orders")
          .select("partner_payout_total")
          .eq("partner_roaster_id", roasterId)
          .gte("created_at", startOfMonth.toISOString())
          .not("order_status", "eq", "Cancelled")
      : Promise.resolve({ data: [] }),

    isCustomer
      ? supabase
          .from("ghost_orders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),

    user.roles.includes("wholesale_buyer")
      ? supabase
          .from("wholesale_access")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "approved")
      : Promise.resolve({ count: 0 }),

    // ── New stats ──
    // Open orders (confirmed + processing)
    isRoaster && roasterId
      ? supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("roaster_id", roasterId)
          .in("status", ["confirmed", "processing"])
      : Promise.resolve({ count: 0 }),

    // Pending payouts (ghost roaster only)
    isGhostRoaster && roasterId
      ? supabase
          .from("partner_payout_items")
          .select("amount")
          .eq("roaster_id", roasterId)
          .eq("status", "pending")
      : Promise.resolve({ data: [] }),

    // Overdue invoices
    isRoaster && roasterId
      ? supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("roaster_id", roasterId)
          .eq("status", "overdue")
      : Promise.resolve({ count: 0 }),

    // Low stock products
    isRoaster && roasterId
      ? supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("roaster_id", roasterId)
          .eq("track_stock", true)
          .eq("is_purchasable", true)
          .lte("retail_stock_count", 5)
      : Promise.resolve({ count: 0 }),

    // ── Recent orders ──
    isRoaster && roasterId
      ? supabase
          .from("orders")
          .select("id, order_number, customer_name, subtotal, status, order_channel, created_at")
          .eq("roaster_id", roasterId)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),

    isGhostRoaster && roasterId
      ? supabase
          .from("ghost_orders")
          .select("id, order_number, customer_name, total_price, partner_payout_total, order_status, created_at")
          .eq("partner_roaster_id", roasterId)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),

    // ── Activity feed ──
    // New storefront/wholesale orders
    isRoaster && roasterId
      ? supabase
          .from("orders")
          .select("id, customer_name, order_channel, created_at")
          .eq("roaster_id", roasterId)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),

    // New ghost orders
    isGhostRoaster && roasterId
      ? supabase
          .from("ghost_orders")
          .select("id, order_number, customer_name, created_at")
          .eq("partner_roaster_id", roasterId)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),

    // Form submissions
    isRoaster && roasterId
      ? supabase
          .from("form_submissions")
          .select("id, created_at, forms!inner(roaster_id, name)")
          .eq("forms.roaster_id", roasterId)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),

    // Wholesale applications
    isRoaster && roasterId
      ? supabase
          .from("wholesale_access")
          .select("id, business_name, created_at")
          .eq("roaster_id", roasterId)
          .eq("status", "pending")
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),

    // Payouts received
    isGhostRoaster && roasterId
      ? supabase
          .from("partner_payout_items")
          .select("id, amount, paid_at")
          .eq("roaster_id", roasterId)
          .eq("status", "paid")
          .not("paid_at", "is", null)
          .gte("paid_at", sevenDaysAgo.toISOString())
          .order("paid_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
  ]);

  // ── Compute stats ──
  const wholesaleCount = pendingWholesaleResult.count || 0;
  const pendingWholesaleRequests = wholesaleRequestsResult.count || 0;
  const ghostOrderCount = ghostOrderCountResult.count || 0;
  const customerOrderCount = customerOrderResult.count || 0;
  const wholesaleAccountCount = wholesaleAccountResult.count || 0;
  const openOrdersCount = openOrdersResult.count || 0;
  const overdueInvoicesCount = overdueInvoicesResult.count || 0;
  const lowStockCount = lowStockResult.count || 0;

  // Pending payout total
  let pendingPayoutTotal = 0;
  for (const item of (pendingPayoutsResult.data as { amount: number }[] | null) || []) {
    pendingPayoutTotal += item.amount || 0;
  }

  // Monthly revenue
  let monthlyRevenue = 0;
  for (const wo of (wsRevenueResult.data as { roaster_payout: number | null; subtotal: number | null }[] | null) || []) {
    monthlyRevenue += wo.roaster_payout || wo.subtotal || 0;
  }
  for (const go of (ghostRevenueResult.data as { partner_payout_total: number | null }[] | null) || []) {
    monthlyRevenue += go.partner_payout_total || 0;
  }

  // ── Build recent orders ──
  const recentOrders: RecentOrder[] = [];

  for (const o of (recentStorefrontResult.data as any[] | null) || []) {
    recentOrders.push({
      id: o.id,
      orderNumber: o.order_number || o.id.slice(0, 8).toUpperCase(),
      date: o.created_at,
      customerName: o.customer_name,
      type: o.order_channel === "wholesale" ? "wholesale" : "storefront",
      status: o.status,
      total: o.subtotal || 0,
    });
  }

  for (const o of (recentGhostResult.data as any[] | null) || []) {
    recentOrders.push({
      id: o.id,
      orderNumber: o.order_number,
      date: o.created_at,
      customerName: o.customer_name,
      type: "ghost",
      status: o.order_status,
      total: o.partner_payout_total || 0,
    });
  }

  recentOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const topRecentOrders = recentOrders.slice(0, 5);

  // ── Build activity feed ──
  const activityItems: ActivityItem[] = [];

  for (const o of (activityOrdersResult.data as any[] | null) || []) {
    const channel = o.order_channel === "wholesale" ? "wholesale" : "retail";
    activityItems.push({
      id: `order-${o.id}`,
      type: "order",
      description: `New ${channel} order from ${o.customer_name || "a customer"}`,
      timestamp: o.created_at,
    });
  }

  for (const o of (activityGhostOrdersResult.data as any[] | null) || []) {
    activityItems.push({
      id: `ghost-${o.id}`,
      type: "ghost_order",
      description: `New platform order #${o.order_number} from ${o.customer_name || "a customer"}`,
      timestamp: o.created_at,
    });
  }

  for (const s of (activityFormSubmissionsResult.data as any[] | null) || []) {
    const formName = s.forms?.name || "a form";
    activityItems.push({
      id: `form-${s.id}`,
      type: "form_submission",
      description: `New submission on "${formName}"`,
      timestamp: s.created_at,
    });
  }

  for (const w of (activityWholesaleAppsResult.data as any[] | null) || []) {
    activityItems.push({
      id: `wholesale-${w.id}`,
      type: "wholesale_application",
      description: `Wholesale application from ${w.business_name || "a business"}`,
      timestamp: w.created_at,
    });
  }

  for (const p of (activityPayoutsResult.data as any[] | null) || []) {
    const amount = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p.amount || 0);
    activityItems.push({
      id: `payout-${p.id}`,
      type: "payout",
      description: `Payout of ${amount} received`,
      timestamp: p.paid_at,
    });
  }

  activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const topActivityItems = activityItems.slice(0, 8);

  const displayName =
    user.roaster?.contact_name || user.fullName || user.email;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
      <p className="text-slate-500 mb-6">
        {`Welcome back, ${displayName}.`}
      </p>

      {/* Quick Actions */}
      {isRoaster && <DashboardQuickActions />}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Roaster stats */}
        {isRoaster && (
          <>
            {/* Pending Wholesale */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pending Wholesale</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {wholesaleCount}
                  </p>
                </div>
              </div>
              <Link
                href="/orders"
                className="text-sm text-brand-600 hover:underline flex items-center gap-1"
              >
                View orders <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Ghost orders (only if Ghost Roaster) */}
            {isGhostRoaster && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">New Ghost Orders</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {ghostOrderCount}
                    </p>
                  </div>
                </div>
                <Link
                  href="/ghost-orders"
                  className="text-sm text-brand-600 hover:underline flex items-center gap-1"
                >
                  View orders <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Trade Requests */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Trade Requests</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {pendingWholesaleRequests}
                  </p>
                </div>
              </div>
              <Link
                href="/contacts"
                className="text-sm text-brand-600 hover:underline flex items-center gap-1"
              >
                View requests <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">This Month</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(monthlyRevenue)}
                  </p>
                </div>
              </div>
              <Link
                href="/orders"
                className="text-sm text-brand-600 hover:underline flex items-center gap-1"
              >
                View revenue <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Open Orders */}
            <Link
              href="/orders"
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-6 block"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Open Orders</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {openOrdersCount}
                  </p>
                </div>
              </div>
              <span className="text-sm text-brand-600 flex items-center gap-1">
                View orders <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            {/* Pending Payouts (Ghost Roaster only) */}
            {isGhostRoaster && (
              <Link
                href="/ghost-orders"
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-6 block"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Pending Payouts</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(pendingPayoutTotal)}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-brand-600 flex items-center gap-1">
                  View payouts <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            )}

            {/* Overdue Invoices */}
            <Link
              href="/invoices"
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-6 block"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Overdue Invoices</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {overdueInvoicesCount}
                  </p>
                </div>
              </div>
              <span className="text-sm text-brand-600 flex items-center gap-1">
                View invoices <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            {/* Low Stock */}
            <Link
              href="/products"
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-6 block"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Low Stock</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {lowStockCount}
                  </p>
                </div>
              </div>
              <span className="text-sm text-brand-600 flex items-center gap-1">
                View products <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </>
        )}

        {/* Customer stats */}
        {isCustomer && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">My Orders</p>
                <p className="text-2xl font-bold text-slate-900">
                  {customerOrderCount}
                </p>
              </div>
            </div>
            <Link
              href="/my-orders"
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              View orders <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Wholesale buyer stats */}
        {user.roles.includes("wholesale_buyer") && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Wholesale Accounts</p>
                <p className="text-2xl font-bold text-slate-900">
                  {wholesaleAccountCount}
                </p>
              </div>
            </div>
            <Link
              href="/wholesale"
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              View suppliers <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Recent Orders + Activity Feed (roaster only) */}
      {isRoaster && (
        <DashboardWidgets
          recentOrders={topRecentOrders}
          activityItems={topActivityItems}
        />
      )}

      {/* Ghost Roaster CTA (only if roaster but NOT a Ghost Roaster) */}
      {isRoaster && user.roaster && !isGhostRoaster && (
        <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-xl border border-brand-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Earn more from your existing roasting capacity
          </h2>
          <p className="text-slate-600 mb-6 max-w-2xl">
            Join the Ghost Roaster programme and receive white-label orders
            from customers across the UK. Use your existing equipment and
            capacity to earn additional revenue — no extra costs.
          </p>
          {user.roaster.ghost_roaster_application_status ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-brand-200">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
              <span className="text-sm font-medium text-slate-700">
                {`Application ${user.roaster.ghost_roaster_application_status}`}
              </span>
            </div>
          ) : (
            <Link
              href="/wholesale/apply"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              Apply now <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </>
  );
}
