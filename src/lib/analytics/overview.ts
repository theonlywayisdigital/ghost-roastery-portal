import { createServerClient } from "@/lib/supabase";
import type { DateRange } from "./types";
import { formatDateKey, getPreviousPeriod } from "./types";

export async function fetchOverviewData(roasterId: string, range: DateRange) {
  const supabase = createServerClient();
  const prev = getPreviousPeriod(range);

  const [
    ordersRes,
    prevOrdersRes,
    roastLogsRes,
    roastedStockRes,
    customersRes,
    newContactsRes,
    topCustomerRes,
    dailyRevenueRes,
    prevDailyRevenueRes,
    roastsCompletedRes,
  ] = await Promise.all([
    // Current period orders (non-cancelled)
    supabase
      .from("orders")
      .select("subtotal, created_at, customer_email")
      .eq("roaster_id", roasterId)
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .not("status", "eq", "cancelled"),
    // Previous period orders
    supabase
      .from("orders")
      .select("subtotal")
      .eq("roaster_id", roasterId)
      .gte("created_at", prev.from)
      .lte("created_at", prev.to)
      .not("status", "eq", "cancelled"),
    // Roast logs in period
    supabase
      .from("roast_logs")
      .select("roasted_weight_kg, green_weight_kg")
      .eq("roaster_id", roasterId)
      .eq("status", "completed")
      .gte("roast_date", range.from.split("T")[0])
      .lte("roast_date", range.to.split("T")[0]),
    // All roasted stock pools
    supabase
      .from("roasted_stock")
      .select("current_stock_kg, low_stock_threshold_kg")
      .eq("roaster_id", roasterId)
      .eq("is_active", true),
    // Active customers (unique emails with orders in period)
    supabase
      .from("orders")
      .select("customer_email")
      .eq("roaster_id", roasterId)
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .not("status", "eq", "cancelled"),
    // New contacts in period
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", roasterId)
      .gte("created_at", range.from)
      .lte("created_at", range.to),
    // Top customer by spend
    supabase
      .from("contacts")
      .select("first_name, last_name, business_name, total_spend")
      .eq("roaster_id", roasterId)
      .eq("status", "active")
      .order("total_spend", { ascending: false })
      .limit(1),
    // Daily revenue for sparkline
    supabase
      .from("orders")
      .select("subtotal, created_at")
      .eq("roaster_id", roasterId)
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .not("status", "eq", "cancelled")
      .order("created_at"),
    // Previous daily revenue for comparison
    supabase
      .from("orders")
      .select("subtotal")
      .eq("roaster_id", roasterId)
      .gte("created_at", prev.from)
      .lte("created_at", prev.to)
      .not("status", "eq", "cancelled"),
    // Roasts completed count
    supabase
      .from("roast_logs")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", roasterId)
      .eq("status", "completed")
      .gte("roast_date", range.from.split("T")[0])
      .lte("roast_date", range.to.split("T")[0]),
  ]);

  const orders = (ordersRes.data || []) as { subtotal: number; created_at: string; customer_email: string }[];
  const prevOrders = (prevOrdersRes.data || []) as { subtotal: number }[];
  const roastLogs = (roastLogsRes.data || []) as { roasted_weight_kg: number; green_weight_kg: number }[];
  const roastedStock = (roastedStockRes.data || []) as { current_stock_kg: number; low_stock_threshold_kg: number | null }[];
  const dailyOrders = (dailyRevenueRes.data || []) as { subtotal: number; created_at: string }[];

  // KPI: Total revenue
  const totalRevenue = orders.reduce((s, o) => s + (o.subtotal || 0), 0);
  const prevTotalRevenue = prevOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
  const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;

  // KPI: Order count
  const orderCount = orders.length;

  // KPI: Active customers
  const activeCustomers = new Set(orders.map((o) => o.customer_email?.toLowerCase()).filter(Boolean)).size;

  // KPI: Total kg roasted
  const totalKgRoasted = roastLogs.reduce((s, l) => s + (l.roasted_weight_kg || 0), 0);

  // Domain: Inventory
  const totalStockKg = roastedStock.reduce((s, r) => s + (r.current_stock_kg || 0), 0);
  const lowStockCount = roastedStock.filter((r) => r.low_stock_threshold_kg != null && r.current_stock_kg <= r.low_stock_threshold_kg).length;

  // Domain: Customers
  const newCustomers = newContactsRes.count || 0;
  const topCustomer = (topCustomerRes.data || [])[0] || null;

  // Domain: Production
  const roastsCompleted = roastsCompletedRes.count || 0;
  const avgYield = roastLogs.length > 0
    ? roastLogs.reduce((s, l) => s + ((l.roasted_weight_kg || 0) / (l.green_weight_kg || 1)) * 100, 0) / roastLogs.length
    : 0;

  // Revenue sparkline
  const dailyMap: Record<string, number> = {};
  for (const o of dailyOrders) {
    const key = formatDateKey(o.created_at);
    dailyMap[key] = (dailyMap[key] || 0) + (o.subtotal || 0);
  }
  const revenueSpark = Object.entries(dailyMap)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Previous revenue total for % change
  const prevRevenue = (prevDailyRevenueRes.data || []).reduce((s: number, o: any) => s + (o.subtotal || 0), 0);

  return {
    totalRevenue,
    revenueChange,
    orderCount,
    activeCustomers,
    totalKgRoasted,
    totalStockKg,
    lowStockCount,
    newCustomers,
    topCustomer: topCustomer as { first_name: string; last_name: string; business_name: string | null; total_spend: number } | null,
    roastsCompleted,
    avgYield,
    revenueSpark,
    prevRevenue,
  };
}
