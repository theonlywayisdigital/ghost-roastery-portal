import { createServerClient } from "@/lib/supabase";
import type { DateRange, DailyDataPoint, NamedValue } from "./types";
import { formatDateKey, getPreviousPeriod } from "./types";

interface OrderRow {
  subtotal: number;
  discount_amount: number | null;
  discount_code: string | null;
  payment_method: string | null;
  order_channel: string | null;
  items: any;
  created_at: string;
  status: string;
}

export async function fetchSalesData(roasterId: string, range: DateRange) {
  const supabase = createServerClient();
  const prev = getPreviousPeriod(range);

  const [ordersRes, prevOrdersRes, refundsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("subtotal, discount_amount, discount_code, payment_method, order_channel, items, created_at, status")
      .eq("roaster_id", roasterId)
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .not("status", "eq", "cancelled"),
    supabase
      .from("orders")
      .select("subtotal, discount_amount, discount_code")
      .eq("roaster_id", roasterId)
      .gte("created_at", prev.from)
      .lte("created_at", prev.to)
      .not("status", "eq", "cancelled"),
    supabase
      .from("refunds")
      .select("amount")
      .eq("order_type", "storefront")
      .eq("status", "completed")
      .gte("created_at", range.from)
      .lte("created_at", range.to),
  ]);

  const orders = (ordersRes.data || []) as OrderRow[];
  const prevOrders = (prevOrdersRes.data || []) as { subtotal: number; discount_amount: number | null; discount_code: string | null }[];

  // Revenue over time (daily bar chart)
  const dailyRevenue: Record<string, { retail: number; wholesale: number }> = {};
  const dailyOrders: Record<string, number> = {};

  for (const o of orders) {
    const key = formatDateKey(o.created_at);
    if (!dailyRevenue[key]) dailyRevenue[key] = { retail: 0, wholesale: 0 };
    if (o.order_channel === "wholesale") {
      dailyRevenue[key].wholesale += o.subtotal || 0;
    } else {
      dailyRevenue[key].retail += o.subtotal || 0;
    }
    dailyOrders[key] = (dailyOrders[key] || 0) + 1;
  }

  const revenueOverTime = Object.entries(dailyRevenue)
    .map(([date, v]) => ({ date, retail: v.retail, wholesale: v.wholesale, total: v.retail + v.wholesale }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const ordersOverTime: DailyDataPoint[] = Object.entries(dailyOrders)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // AOV
  const totalRevenue = orders.reduce((s, o) => s + (o.subtotal || 0), 0);
  const aov = orders.length > 0 ? totalRevenue / orders.length : 0;
  const prevTotalRevenue = prevOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
  const prevAov = prevOrders.length > 0 ? prevTotalRevenue / prevOrders.length : 0;
  const aovChange = prevAov > 0 ? ((aov - prevAov) / prevAov) * 100 : 0;

  // Revenue by payment method (donut)
  const byPayment: Record<string, number> = {};
  for (const o of orders) {
    const method = o.payment_method || "other";
    byPayment[method] = (byPayment[method] || 0) + (o.subtotal || 0);
  }
  const revenueByPayment: NamedValue[] = Object.entries(byPayment).map(([name, value]) => ({
    name: name === "invoice_online" ? "Invoice (Online)" : name === "invoice_offline" ? "Invoice (Offline)" : name === "stripe" ? "Stripe" : name,
    value,
  }));

  // Top 5 products by revenue (parse JSONB items)
  const productRevenue: Record<string, number> = {};
  for (const o of orders) {
    const items = Array.isArray(o.items) ? o.items : [];
    for (const item of items) {
      const name = item.name || item.productName || "Unknown";
      const lineTotal = (item.price || item.unitPrice || 0) * (item.quantity || 1);
      productRevenue[name] = (productRevenue[name] || 0) + lineTotal;
    }
  }
  const topProducts: NamedValue[] = Object.entries(productRevenue)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Discount impact
  const ordersWithDiscount = orders.filter((o) => o.discount_amount && o.discount_amount > 0);
  const totalDiscountGiven = ordersWithDiscount.reduce((s, o) => s + (o.discount_amount || 0), 0);
  const discountOrderCount = ordersWithDiscount.length;
  const aovWithDiscount = discountOrderCount > 0
    ? ordersWithDiscount.reduce((s, o) => s + (o.subtotal || 0), 0) / discountOrderCount
    : 0;
  const ordersWithoutDiscount = orders.filter((o) => !o.discount_amount || o.discount_amount === 0);
  const aovWithoutDiscount = ordersWithoutDiscount.length > 0
    ? ordersWithoutDiscount.reduce((s, o) => s + (o.subtotal || 0), 0) / ordersWithoutDiscount.length
    : 0;

  // Refund rate
  const refunds = (refundsRes.data || []) as { amount: number }[];
  const totalRefunded = refunds.reduce((s, r) => s + (r.amount || 0), 0);
  const refundRate = totalRevenue > 0 ? (totalRefunded / totalRevenue) * 100 : 0;

  return {
    revenueOverTime,
    ordersOverTime,
    totalRevenue,
    orderCount: orders.length,
    aov,
    aovChange,
    revenueByPayment,
    topProducts,
    totalDiscountGiven,
    discountOrderCount,
    aovWithDiscount,
    aovWithoutDiscount,
    totalRefunded,
    refundRate,
  };
}
