import { createServerClient } from "@/lib/supabase";
import type { DateRange, DailyDataPoint } from "./types";
import { formatDateKey } from "./types";

interface StockPool {
  id: string;
  name: string;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
}

interface MovementRow {
  movement_type: string;
  quantity_kg: number;
  created_at: string;
}

export async function fetchInventoryData(roasterId: string, range: DateRange) {
  const supabase = createServerClient();

  const [roastedRes, greenRes, movementsRes, roastLogsRes, wasteRes, deductionRes] = await Promise.all([
    supabase
      .from("roasted_stock")
      .select("id, name, current_stock_kg, low_stock_threshold_kg")
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
      .from("roasted_stock_movements")
      .select("movement_type, quantity_kg, created_at")
      .eq("roaster_id", roasterId)
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .order("created_at"),
    supabase
      .from("roast_logs")
      .select("roasted_weight_kg, green_weight_kg, roast_date")
      .eq("roaster_id", roasterId)
      .eq("status", "completed")
      .gte("roast_date", range.from.split("T")[0])
      .lte("roast_date", range.to.split("T")[0])
      .order("roast_date"),
    // Waste movements total
    supabase
      .from("roasted_stock_movements")
      .select("quantity_kg")
      .eq("roaster_id", roasterId)
      .eq("movement_type", "waste")
      .gte("created_at", range.from)
      .lte("created_at", range.to),
    // Order deductions for days-of-stock calc
    supabase
      .from("roasted_stock_movements")
      .select("roasted_stock_id, quantity_kg")
      .eq("roaster_id", roasterId)
      .eq("movement_type", "order_deduction")
      .gte("created_at", range.from)
      .lte("created_at", range.to),
  ]);

  const roastedStock = (roastedRes.data || []) as StockPool[];
  const greenBeans = (greenRes.data || []) as StockPool[];
  const movements = (movementsRes.data || []) as MovementRow[];
  const roastLogs = (roastLogsRes.data || []) as { roasted_weight_kg: number; green_weight_kg: number; roast_date: string }[];

  // Stock levels with status
  const roastedStockLevels = roastedStock.map((s) => {
    const threshold = s.low_stock_threshold_kg || 0;
    let status: "green" | "amber" | "red" = "green";
    if (threshold > 0) {
      if (s.current_stock_kg <= threshold) status = "red";
      else if (s.current_stock_kg <= threshold * 1.2) status = "amber";
    }
    return { ...s, status };
  });

  const greenBeanLevels = greenBeans.map((s) => {
    const threshold = s.low_stock_threshold_kg || 0;
    let status: "green" | "amber" | "red" = "green";
    if (threshold > 0) {
      if (s.current_stock_kg <= threshold) status = "red";
      else if (s.current_stock_kg <= threshold * 1.2) status = "amber";
    }
    return { ...s, status };
  });

  // Stock movements over time (stacked area)
  const dailyMovements: Record<string, Record<string, number>> = {};
  for (const m of movements) {
    const key = formatDateKey(m.created_at);
    if (!dailyMovements[key]) dailyMovements[key] = {};
    const absQty = Math.abs(m.quantity_kg || 0);
    dailyMovements[key][m.movement_type] = (dailyMovements[key][m.movement_type] || 0) + absQty;
  }
  const movementsOverTime = Object.entries(dailyMovements)
    .map(([date, types]) => ({
      date,
      roast_addition: types.roast_addition || 0,
      order_deduction: types.order_deduction || 0,
      adjustment: types.adjustment || 0,
      waste: types.waste || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Roast yield over time
  const yieldOverTime: DailyDataPoint[] = roastLogs.map((l) => ({
    date: l.roast_date,
    value: l.green_weight_kg > 0 ? (l.roasted_weight_kg / l.green_weight_kg) * 100 : 0,
  }));

  // Waste rate
  const wasteMovements = (wasteRes.data || []) as { quantity_kg: number }[];
  const totalWaste = wasteMovements.reduce((s, w) => s + Math.abs(w.quantity_kg || 0), 0);
  const totalMovementKg = movements.reduce((s, m) => s + Math.abs(m.quantity_kg || 0), 0);
  const wasteRate = totalMovementKg > 0 ? (totalWaste / totalMovementKg) * 100 : 0;

  // Days of stock remaining per pool
  const deductions = (deductionRes.data || []) as { roasted_stock_id: string; quantity_kg: number }[];
  const deductionByStock: Record<string, number> = {};
  for (const d of deductions) {
    deductionByStock[d.roasted_stock_id] = (deductionByStock[d.roasted_stock_id] || 0) + Math.abs(d.quantity_kg || 0);
  }
  const periodDays = Math.max(1, (new Date(range.to).getTime() - new Date(range.from).getTime()) / (1000 * 60 * 60 * 24));
  const daysOfStock = roastedStock.map((s) => {
    const totalDeducted = deductionByStock[s.id] || 0;
    const dailyRate = totalDeducted / periodDays;
    return {
      name: s.name,
      currentKg: s.current_stock_kg,
      dailyRate,
      daysRemaining: dailyRate > 0 ? Math.round(s.current_stock_kg / dailyRate) : null,
    };
  });

  return {
    roastedStockLevels,
    greenBeanLevels,
    movementsOverTime,
    yieldOverTime,
    wasteRate,
    totalWaste,
    daysOfStock,
  };
}
