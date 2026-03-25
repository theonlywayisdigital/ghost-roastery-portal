import { createServerClient } from "@/lib/supabase";
import type { DateRange, DailyDataPoint, NamedValue } from "./types";
import { formatDateKey } from "./types";

export async function fetchProductionData(roasterId: string, range: DateRange) {
  const supabase = createServerClient();
  const dateFrom = range.from.split("T")[0];
  const dateTo = range.to.split("T")[0];

  const [roastLogsRes, cuppingRes, plansRes] = await Promise.all([
    supabase
      .from("roast_logs")
      .select("id, roast_date, green_weight_kg, roasted_weight_kg, quality_rating, roaster_machine, green_bean_id, green_bean_name, status")
      .eq("roaster_id", roasterId)
      .eq("status", "completed")
      .gte("roast_date", dateFrom)
      .lte("roast_date", dateTo)
      .order("roast_date"),
    supabase
      .from("cupping_samples")
      .select("total_score, green_bean_id, created_at, session_id, cupping_sessions!inner(session_date)")
      .eq("roaster_id", roasterId)
      .gte("cupping_sessions.session_date", dateFrom)
      .lte("cupping_sessions.session_date", dateTo)
      .order("created_at"),
    supabase
      .from("production_plans")
      .select("planned_date, status, roast_log_id")
      .eq("roaster_id", roasterId)
      .gte("planned_date", dateFrom)
      .lte("planned_date", dateTo),
  ]);

  const roastLogs = (roastLogsRes.data || []) as {
    id: string;
    roast_date: string;
    green_weight_kg: number;
    roasted_weight_kg: number;
    quality_rating: number | null;
    roaster_machine: string | null;
    green_bean_id: string | null;
    green_bean_name: string | null;
    status: string;
  }[];
  const cuppingSamples = ((cuppingRes.data || []) as unknown) as {
    total_score: number;
    green_bean_id: string | null;
    created_at: string;
    session_id: string;
    cupping_sessions: { session_date: string };
  }[];
  const plans = (plansRes.data || []) as {
    planned_date: string;
    status: string;
    roast_log_id: string | null;
  }[];

  // Roasts over time (bar chart, daily count)
  const dailyRoasts: Record<string, number> = {};
  for (const l of roastLogs) {
    dailyRoasts[l.roast_date] = (dailyRoasts[l.roast_date] || 0) + 1;
  }
  const roastsOverTime: DailyDataPoint[] = Object.entries(dailyRoasts)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Kg roasted over time (line chart)
  const dailyKg: Record<string, number> = {};
  for (const l of roastLogs) {
    dailyKg[l.roast_date] = (dailyKg[l.roast_date] || 0) + (l.roasted_weight_kg || 0);
  }
  const kgOverTime: DailyDataPoint[] = Object.entries(dailyKg)
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Roast yield trend with rolling average
  const yieldPoints = roastLogs
    .filter((l) => l.green_weight_kg > 0)
    .map((l) => ({
      date: l.roast_date,
      yield: (l.roasted_weight_kg / l.green_weight_kg) * 100,
    }));
  const yieldTrend = yieldPoints.map((p, i) => {
    const windowStart = Math.max(0, i - 6);
    const window = yieldPoints.slice(windowStart, i + 1);
    const avg = window.reduce((s, w) => s + w.yield, 0) / window.length;
    return {
      date: p.date,
      value: Math.round(p.yield * 100) / 100,
      rollingAvg: Math.round(avg * 100) / 100,
    };
  });

  // Average quality rating over time
  const qualityByDate: Record<string, { sum: number; count: number }> = {};
  for (const l of roastLogs) {
    if (l.quality_rating == null) continue;
    if (!qualityByDate[l.roast_date]) qualityByDate[l.roast_date] = { sum: 0, count: 0 };
    qualityByDate[l.roast_date].sum += l.quality_rating;
    qualityByDate[l.roast_date].count += 1;
  }
  const qualityOverTime: DailyDataPoint[] = Object.entries(qualityByDate)
    .map(([date, v]) => ({ date, value: Math.round((v.sum / v.count) * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Cupping scores trend
  const cuppingByDate: Record<string, { sum: number; count: number }> = {};
  for (const s of cuppingSamples) {
    const date = (s.cupping_sessions as any)?.session_date || formatDateKey(s.created_at);
    if (!cuppingByDate[date]) cuppingByDate[date] = { sum: 0, count: 0 };
    cuppingByDate[date].sum += s.total_score || 0;
    cuppingByDate[date].count += 1;
  }
  const cuppingTrend: DailyDataPoint[] = Object.entries(cuppingByDate)
    .map(([date, v]) => ({ date, value: Math.round((v.sum / v.count) * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Unique green beans for filter
  const greenBeans = Array.from(
    new Map(
      cuppingSamples
        .filter((s) => s.green_bean_id)
        .map((s) => [s.green_bean_id!, s.green_bean_id!])
    ).keys()
  );

  // Production plan adherence
  const plansCompleted = plans.filter((p) => p.status === "completed").length;
  const plansCancelled = plans.filter((p) => p.status === "cancelled").length;
  const plansTotal = plans.length;

  // Roasts by machine (donut)
  const machineMap: Record<string, number> = {};
  for (const l of roastLogs) {
    const machine = l.roaster_machine || "Unknown";
    machineMap[machine] = (machineMap[machine] || 0) + 1;
  }
  const roastsByMachine: NamedValue[] = Object.entries(machineMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Top beans by volume
  const beanMap: Record<string, { name: string; kg: number }> = {};
  for (const l of roastLogs) {
    const key = l.green_bean_id || "unknown";
    if (!beanMap[key]) beanMap[key] = { name: l.green_bean_name || "Unknown", kg: 0 };
    beanMap[key].kg += l.roasted_weight_kg || 0;
  }
  const topBeans: NamedValue[] = Object.values(beanMap)
    .map((b) => ({ name: b.name, value: Math.round(b.kg * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return {
    roastsOverTime,
    kgOverTime,
    yieldTrend,
    qualityOverTime,
    cuppingTrend,
    greenBeans,
    plansCompleted,
    plansCancelled,
    plansTotal,
    roastsByMachine,
    topBeans,
    totalRoasts: roastLogs.length,
    totalKg: roastLogs.reduce((s, l) => s + (l.roasted_weight_kg || 0), 0),
  };
}
