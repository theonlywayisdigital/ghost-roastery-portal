import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface OrderItem {
  productId?: string;
  name?: string;
  quantity?: number;
  weightGrams?: number;
  roastedStockId?: string;
  blendComponents?: { roasted_stock_id: string; percentage: number }[];
}

export interface DispatchOrder {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerBusiness: string | null;
  customerEmail: string;
  itemSummary: string;
  itemCount: number;
  totalWeightKg: number;
  subtotal: number;
  status: string;
  requiredByDate: string | null;
  confirmedAt: string | null;
  externalSource: string | null;
  orderChannel: string | null;
  scheduledDispatchDate: string | null;
  readiness: "ready" | "partial" | "not_ready";
  readinessDetail: string;
  stockBreakdown: {
    profileName: string;
    neededKg: number;
    availableKg: number;
    sufficient: boolean;
  }[];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const roasterId = user.roaster.id;

  // Fetch orders ready for dispatch + roasted stock in parallel
  const [ordersRes, stockRes] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, items, status, customer_name, customer_business, customer_email, subtotal, required_by_date, confirmed_at, external_source, order_channel, scheduled_dispatch_date"
      )
      .eq("roaster_id", roasterId)
      .in("status", ["confirmed", "processing"])
      .order("required_by_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("roasted_stock")
      .select("id, name, current_stock_kg")
      .eq("roaster_id", roasterId)
      .eq("is_active", true),
  ]);

  const orders = ordersRes.data || [];
  const roastedStocks = stockRes.data || [];

  // Build stock lookup
  const stockMap = new Map(
    roastedStocks.map((rs) => [rs.id, { name: rs.name, stockKg: rs.current_stock_kg ?? 0 }])
  );

  // Process each order
  const dispatchOrders: DispatchOrder[] = [];

  for (const order of orders) {
    const items = Array.isArray(order.items) ? (order.items as OrderItem[]) : [];

    // Calculate total weight and item summary
    let totalWeightKg = 0;
    let itemCount = 0;
    const itemNames: string[] = [];

    // Track stock demands per roasted_stock_id for this order
    const stockDemands: Record<string, number> = {};

    for (const item of items) {
      const qty = item.quantity || 0;
      const wg = item.weightGrams || 0;
      if (qty <= 0) continue;
      itemCount += qty;
      const kg = (wg / 1000) * qty;
      totalWeightKg += kg;
      if (item.name) itemNames.push(qty > 1 ? `${item.name} x${qty}` : item.name);

      if (item.blendComponents && item.blendComponents.length > 0) {
        for (const comp of item.blendComponents) {
          stockDemands[comp.roasted_stock_id] =
            (stockDemands[comp.roasted_stock_id] || 0) + kg * (comp.percentage / 100);
        }
      } else if (item.roastedStockId) {
        stockDemands[item.roastedStockId] =
          (stockDemands[item.roastedStockId] || 0) + kg;
      }
    }

    // Calculate stock readiness
    const stockBreakdown: DispatchOrder["stockBreakdown"] = [];
    let allSufficient = true;
    let anySufficient = false;
    let hasStockLinks = false;

    for (const [stockId, neededKg] of Object.entries(stockDemands)) {
      const stock = stockMap.get(stockId);
      if (!stock) {
        stockBreakdown.push({
          profileName: "Unknown profile",
          neededKg: Math.round(neededKg * 1000) / 1000,
          availableKg: 0,
          sufficient: false,
        });
        allSufficient = false;
        hasStockLinks = true;
        continue;
      }

      hasStockLinks = true;
      const sufficient = stock.stockKg >= neededKg;
      if (sufficient) anySufficient = true;
      else allSufficient = false;

      stockBreakdown.push({
        profileName: stock.name,
        neededKg: Math.round(neededKg * 1000) / 1000,
        availableKg: Math.round(stock.stockKg * 1000) / 1000,
        sufficient,
      });
    }

    // Determine readiness
    let readiness: DispatchOrder["readiness"];
    let readinessDetail: string;

    if (!hasStockLinks) {
      // No stock tracking — always ready
      readiness = "ready";
      readinessDetail = "No stock tracking";
    } else if (allSufficient) {
      readiness = "ready";
      readinessDetail = "All stock available";
    } else if (anySufficient) {
      readiness = "partial";
      const shortCount = stockBreakdown.filter((s) => !s.sufficient).length;
      readinessDetail = `${shortCount} profile${shortCount !== 1 ? "s" : ""} short`;
    } else {
      readiness = "not_ready";
      readinessDetail = "Insufficient stock";
    }

    dispatchOrders.push({
      id: order.id,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      customerName: order.customer_name,
      customerBusiness: order.customer_business,
      customerEmail: order.customer_email,
      itemSummary: itemNames.slice(0, 3).join(", ") + (itemNames.length > 3 ? ` +${itemNames.length - 3} more` : ""),
      itemCount,
      totalWeightKg: Math.round(totalWeightKg * 1000) / 1000,
      subtotal: order.subtotal,
      status: order.status,
      requiredByDate: order.required_by_date || null,
      confirmedAt: order.confirmed_at || null,
      externalSource: order.external_source || null,
      orderChannel: order.order_channel || null,
      scheduledDispatchDate: order.scheduled_dispatch_date || null,
      readiness,
      readinessDetail,
      stockBreakdown,
    });
  }

  // Sort: orders with dates first (by date), then no-date orders. Within same date group, ready first.
  const readinessOrder = { ready: 0, partial: 1, not_ready: 2 };
  dispatchOrders.sort((a, b) => {
    // Required-by date priority
    if (a.requiredByDate && b.requiredByDate) {
      const dateCmp = a.requiredByDate.localeCompare(b.requiredByDate);
      if (dateCmp !== 0) return dateCmp;
    }
    if (a.requiredByDate && !b.requiredByDate) return -1;
    if (!a.requiredByDate && b.requiredByDate) return 1;
    // Then by readiness
    return readinessOrder[a.readiness] - readinessOrder[b.readiness];
  });

  return NextResponse.json({
    orders: dispatchOrders,
    summary: {
      totalOrders: dispatchOrders.length,
      readyCount: dispatchOrders.filter((o) => o.readiness === "ready").length,
      partialCount: dispatchOrders.filter((o) => o.readiness === "partial").length,
      notReadyCount: dispatchOrders.filter((o) => o.readiness === "not_ready").length,
    },
  });
}
