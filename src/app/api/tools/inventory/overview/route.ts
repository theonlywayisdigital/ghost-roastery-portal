import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface OrderItem {
  productId?: string;
  quantity?: number;
  weightGrams?: number;
  roastedStockId?: string;
  greenBeanId?: string;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const roasterId = user.roaster.id;

  // Fetch all data in parallel
  const [roastedRes, greenRes, ordersRes, roasterRes] = await Promise.all([
    supabase
      .from("roasted_stock")
      .select("id, name, current_stock_kg, green_bean_id, low_stock_threshold_kg, batch_size_kg")
      .eq("roaster_id", roasterId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("green_beans")
      .select("id, name, current_stock_kg, low_stock_threshold_kg")
      .eq("roaster_id", roasterId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("orders")
      .select("items")
      .eq("roaster_id", roasterId)
      .not("status", "in", '("delivered","cancelled")'),
    supabase
      .from("partner_roasters")
      .select("default_batch_size_kg")
      .eq("id", roasterId)
      .single(),
  ]);

  const roastedStock = roastedRes.data || [];
  const greenBeans = greenRes.data || [];
  const unfulfilledOrders = ordersRes.data || [];
  const defaultBatchSizeKg = roasterRes.data?.default_batch_size_kg ?? null;

  // Aggregate committed KG per roastedStockId and greenBeanId
  const committedByRoasted: Record<string, number> = {};
  const committedByGreen: Record<string, number> = {};

  for (const order of unfulfilledOrders) {
    const items = Array.isArray(order.items) ? (order.items as OrderItem[]) : [];
    for (const item of items) {
      const qty = item.quantity || 0;
      const wg = item.weightGrams || 0;
      if (qty <= 0 || wg <= 0) continue;
      const kg = (wg / 1000) * qty;

      if (item.roastedStockId) {
        committedByRoasted[item.roastedStockId] = (committedByRoasted[item.roastedStockId] || 0) + kg;
      }
      if (item.greenBeanId) {
        committedByGreen[item.greenBeanId] = (committedByGreen[item.greenBeanId] || 0) + kg;
      }
    }
  }

  return NextResponse.json({
    roastedStock,
    greenBeans,
    committedByRoasted,
    committedByGreen,
    defaultBatchSizeKg,
  });
}
