import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface OrderItem {
  productId?: string;
  quantity?: number;
  weightGrams?: number;
  roastedStockId?: string;
  blendComponents?: { roasted_stock_id: string; percentage: number }[];
}

interface ContributingOrder {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerBusiness: string | null;
  kgNeeded: number;
  requiredByDate: string | null;
  status: string;
}

interface SuggestedBatch {
  roastedStockId: string;
  profileName: string;
  greenBeanId: string | null;
  greenBeanName: string | null;
  greenBeanOrigin: string | null;
  greenStockKg: number | null;
  roastedStockKg: number;
  weightLossPercent: number | null;
  batchSizeKg: number;
  batchNumber: number;
  totalBatches: number;
  totalShortfallKg: number;
  totalDemandKg: number;
  currentStockKg: number;
  earliestRequiredBy: string | null;
  urgency: "overdue" | "urgent" | "normal";
  contributingOrders: ContributingOrder[];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const roasterId = user.roaster.id;

  // Fetch all data in parallel
  const [roastedRes, ordersRes, roasterRes, plansRes] = await Promise.all([
    supabase
      .from("roasted_stock")
      .select("id, name, current_stock_kg, green_bean_id, batch_size_kg, weight_loss_percentage")
      .eq("roaster_id", roasterId)
      .eq("is_active", true),
    supabase
      .from("orders")
      .select("id, items, required_by_date, status, customer_name, customer_business")
      .eq("roaster_id", roasterId)
      .not("status", "in", '("delivered","cancelled")'),
    supabase
      .from("roasters")
      .select("default_batch_size_kg")
      .eq("id", roasterId)
      .single(),
    supabase
      .from("production_plans")
      .select("*, green_beans(name), roasted_stock(name)")
      .eq("roaster_id", roasterId)
      .in("status", ["planned", "in_progress", "completed"])
      .order("planned_date", { ascending: true }),
  ]);

  const roastedStocks = roastedRes.data || [];
  const orders = ordersRes.data || [];
  const defaultBatchSizeKg = roasterRes.data?.default_batch_size_kg ?? 8;
  const existingPlans = plansRes.data || [];

  // Build roasted stock lookup
  const stockMap = new Map(
    roastedStocks.map((rs) => [rs.id, rs])
  );

  // Green bean names lookup
  const greenBeanIds = Array.from(
    new Set(
      roastedStocks
        .map((rs) => rs.green_bean_id)
        .filter(Boolean) as string[]
    )
  );
  let greenBeanMap = new Map<string, { name: string; origin: string | null; stockKg: number }>();
  if (greenBeanIds.length > 0) {
    const { data: beans } = await supabase
      .from("green_beans")
      .select("id, name, origin_country, origin_region, current_stock_kg")
      .in("id", greenBeanIds);
    greenBeanMap = new Map(
      (beans || []).map((b) => [b.id, {
        name: b.name,
        origin: [b.origin_country, b.origin_region].filter(Boolean).join(", ") || null,
        stockKg: b.current_stock_kg ?? 0,
      }])
    );
  }

  // Aggregate demand per roasted stock ID with contributing orders
  const demandByStock: Record<string, {
    totalKg: number;
    orders: ContributingOrder[];
  }> = {};

  for (const order of orders) {
    const items = Array.isArray(order.items) ? (order.items as OrderItem[]) : [];
    for (const item of items) {
      const qty = item.quantity || 0;
      const wg = item.weightGrams || 0;
      if (qty <= 0 || wg <= 0) continue;
      const kg = (wg / 1000) * qty;

      const addDemand = (stockId: string, kgForStock: number) => {
        if (!demandByStock[stockId]) {
          demandByStock[stockId] = { totalKg: 0, orders: [] };
        }
        demandByStock[stockId].totalKg += kgForStock;

        // Add contributing order if not already present
        const existing = demandByStock[stockId].orders.find(
          (o) => o.orderId === order.id
        );
        if (existing) {
          existing.kgNeeded += kgForStock;
        } else {
          demandByStock[stockId].orders.push({
            orderId: order.id,
            orderNumber: order.id.slice(0, 8).toUpperCase(),
            customerName: order.customer_name,
            customerBusiness: order.customer_business,
            kgNeeded: kgForStock,
            requiredByDate: order.required_by_date || null,
            status: order.status,
          });
        }
      };

      if (item.blendComponents && item.blendComponents.length > 0) {
        for (const comp of item.blendComponents) {
          addDemand(comp.roasted_stock_id, kg * (comp.percentage / 100));
        }
      } else if (item.roastedStockId) {
        addDemand(item.roastedStockId, kg);
      }
    }
  }

  // Calculate suggested batches
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const suggestions: SuggestedBatch[] = [];

  for (const [stockId, demand] of Object.entries(demandByStock)) {
    const stock = stockMap.get(stockId);
    if (!stock) continue;

    const shortfall = demand.totalKg - stock.current_stock_kg;
    if (shortfall <= 0) continue;

    const batchSize = stock.batch_size_kg || defaultBatchSizeKg;
    const totalBatches = Math.ceil(shortfall / batchSize);

    // Find earliest required_by_date across contributing orders
    const requiredDates = demand.orders
      .map((o) => o.requiredByDate)
      .filter(Boolean) as string[];
    const earliestRequiredBy = requiredDates.length > 0
      ? requiredDates.sort()[0]
      : null;

    // Calculate urgency
    let urgency: "overdue" | "urgent" | "normal" = "normal";
    if (earliestRequiredBy) {
      const reqDate = new Date(earliestRequiredBy + "T00:00:00");
      const diffDays = Math.ceil(
        (reqDate.getTime() - today.getTime()) / 86400000
      );
      if (diffDays < 0) urgency = "overdue";
      else if (diffDays <= 2) urgency = "urgent";
    }

    const greenBean = stock.green_bean_id ? greenBeanMap.get(stock.green_bean_id) : null;

    for (let i = 0; i < totalBatches; i++) {
      suggestions.push({
        roastedStockId: stockId,
        profileName: stock.name,
        greenBeanId: stock.green_bean_id,
        greenBeanName: greenBean?.name || null,
        greenBeanOrigin: greenBean?.origin || null,
        greenStockKg: greenBean?.stockKg ?? null,
        roastedStockKg: stock.current_stock_kg,
        weightLossPercent: stock.weight_loss_percentage ?? null,
        batchSizeKg: batchSize,
        batchNumber: i + 1,
        totalBatches,
        totalShortfallKg: Math.round(shortfall * 1000) / 1000,
        totalDemandKg: Math.round(demand.totalKg * 1000) / 1000,
        currentStockKg: stock.current_stock_kg,
        earliestRequiredBy,
        urgency,
        contributingOrders: demand.orders,
      });
    }
  }

  // Sort: overdue first, then urgent, then normal. Within same urgency, by earliest required date
  const urgencyOrder = { overdue: 0, urgent: 1, normal: 2 };
  suggestions.sort((a, b) => {
    const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgDiff !== 0) return urgDiff;
    if (a.earliestRequiredBy && b.earliestRequiredBy) {
      return a.earliestRequiredBy.localeCompare(b.earliestRequiredBy);
    }
    if (a.earliestRequiredBy) return -1;
    if (b.earliestRequiredBy) return 1;
    return a.profileName.localeCompare(b.profileName);
  });

  return NextResponse.json({
    suggestions,
    existingPlans,
    summary: {
      totalBatchesNeeded: suggestions.length,
      profilesWithShortfall: new Set(suggestions.map((s) => s.roastedStockId)).size,
      overdueCount: suggestions.filter((s) => s.urgency === "overdue").length,
      urgentCount: suggestions.filter((s) => s.urgency === "urgent").length,
    },
  });
}
