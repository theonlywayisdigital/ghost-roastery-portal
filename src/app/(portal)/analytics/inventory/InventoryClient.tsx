"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Trash2 } from "@/components/icons";
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  DateRangeSelector, AnalyticsNav, KPICard, ChartCard, EmptyChart,
  CHART_COLORS, formatKg, formatPercent, formatShortDate,
} from "../AnalyticsShared";

// ── Types ──

interface StockLevel {
  id: string;
  name: string;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  status: "green" | "amber" | "red";
}

interface Movement {
  date: string;
  roast_addition: number;
  order_deduction: number;
  adjustment: number;
  waste: number;
}

interface YieldPoint {
  date: string;
  value: number;
}

interface DaysOfStock {
  name: string;
  currentKg: number;
  dailyRate: number;
  daysRemaining: number | null;
}

interface InventoryData {
  roastedStockLevels: StockLevel[];
  greenBeanLevels: StockLevel[];
  movementsOverTime: Movement[];
  yieldOverTime: YieldPoint[];
  wasteRate: number;
  totalWaste: number;
  daysOfStock: DaysOfStock[];
}

// ── Helpers ──

const STATUS_COLORS: Record<string, string> = {
  red: "#ef4444",
  amber: "#f59e0b",
  green: "#22c55e",
};

function StockLevelChart({ data, title, subtitle }: { data: StockLevel[]; title: string; subtitle?: string }) {
  if (data.length === 0) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <EmptyChart message="No stock data available." />
      </ChartCard>
    );
  }

  const chartHeight = Math.max(data.length * 40 + 60, 160);

  // Build chart data with status color per item
  const chartData = data.map((item) => ({
    name: item.name,
    current_stock_kg: item.current_stock_kg,
    low_stock_threshold_kg: item.low_stock_threshold_kg,
    fill: STATUS_COLORS[item.status] || STATUS_COLORS.green,
  }));

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${v} kg`}
              fontSize={12}
              tick={{ fill: "#64748b" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              fontSize={12}
              tick={{ fill: "#334155" }}
            />
            <Tooltip
              formatter={(value: any, name: any) => {
                const label = name === "current_stock_kg" ? "Current stock" : "Low stock threshold";
                return [formatKg(Number(value)), label];
              }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 13,
              }}
            />
            <Legend
              formatter={(value: string) => {
                if (value === "current_stock_kg") return "Current stock";
                if (value === "low_stock_threshold_kg") return "Low stock threshold";
                return value;
              }}
            />
            {/* Threshold bar (rendered first so it sits behind) */}
            <Bar
              dataKey="low_stock_threshold_kg"
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              barSize={8}
              radius={[0, 2, 2, 0]}
            />
            {/* Current stock bar, colored by status */}
            <Bar
              dataKey="current_stock_kg"
              barSize={18}
              radius={[0, 4, 4, 0]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={payload.fill}
                    rx={4}
                    ry={4}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ── Main Component ──

export function InventoryClient() {
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || "30d";
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?section=inventory&range=${range}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <DateRangeSelector />
      </div>
      <p className="text-slate-500 mb-4">Stock &amp; inventory overview.</p>
      <AnalyticsNav />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-48" />
          ))}
        </div>
      ) : !data ? (
        <EmptyChart message="Unable to load inventory analytics data." />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <KPICard
              label="Waste Rate"
              value={formatPercent(data.wasteRate)}
              icon={AlertTriangle}
              iconBg="bg-rose-50"
              iconColor="text-red-600"
            />
            <KPICard
              label="Total Waste"
              value={formatKg(data.totalWaste)}
              icon={Trash2}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
          </div>

          {/* Roasted Stock Levels */}
          <div className="mb-6">
            <StockLevelChart
              data={data.roastedStockLevels}
              title="Roasted Stock Levels"
              subtitle="Current stock vs. low-stock threshold per pool"
            />
          </div>

          {/* Green Bean Stock Levels */}
          <div className="mb-6">
            <StockLevelChart
              data={data.greenBeanLevels}
              title="Green Bean Stock Levels"
              subtitle="Current stock vs. low-stock threshold per origin"
            />
          </div>

          {/* Stock Movements Over Time */}
          <div className="mb-6">
            <ChartCard title="Stock Movements" subtitle="Inventory changes over time">
              {data.movementsOverTime.length === 0 ? (
                <EmptyChart message="No stock movement data for the selected period." />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.movementsOverTime} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradRoast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.6} />
                          <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="gradOrder" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.6} />
                          <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="gradAdjust" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.amber} stopOpacity={0.6} />
                          <stop offset="95%" stopColor={CHART_COLORS.amber} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="gradWaste" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.red} stopOpacity={0.6} />
                          <stop offset="95%" stopColor={CHART_COLORS.red} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        fontSize={12}
                        tick={{ fill: "#64748b" }}
                      />
                      <YAxis
                        tickFormatter={(v: number) => `${v} kg`}
                        fontSize={12}
                        tick={{ fill: "#64748b" }}
                      />
                      <Tooltip
                        labelFormatter={(label: any) => formatShortDate(String(label))}
                        formatter={(value: any, name: any) => {
                          const labels: Record<string, string> = {
                            roast_addition: "Roast additions",
                            order_deduction: "Order deductions",
                            adjustment: "Adjustments",
                            waste: "Waste",
                          };
                          return [formatKg(Number(value)), labels[String(name)] || String(name)];
                        }}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                      />
                      <Legend
                        formatter={(value: string) => {
                          const labels: Record<string, string> = {
                            roast_addition: "Roast additions",
                            order_deduction: "Order deductions",
                            adjustment: "Adjustments",
                            waste: "Waste",
                          };
                          return labels[value] || value;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="roast_addition"
                        stackId="1"
                        stroke={CHART_COLORS.green}
                        fill="url(#gradRoast)"
                        fillOpacity={0.6}
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="order_deduction"
                        stackId="1"
                        stroke={CHART_COLORS.blue}
                        fill="url(#gradOrder)"
                        fillOpacity={0.6}
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="adjustment"
                        stackId="1"
                        stroke={CHART_COLORS.amber}
                        fill="url(#gradAdjust)"
                        fillOpacity={0.6}
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="waste"
                        stackId="1"
                        stroke={CHART_COLORS.red}
                        fill="url(#gradWaste)"
                        fillOpacity={0.6}
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Roast Yield Over Time */}
          <div className="mb-6">
            <ChartCard title="Roast Yield" subtitle="Yield percentage per roast over time">
              {data.yieldOverTime.length === 0 ? (
                <EmptyChart message="No yield data for the selected period." />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.yieldOverTime} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        fontSize={12}
                        tick={{ fill: "#64748b" }}
                      />
                      <YAxis
                        tickFormatter={(v: number) => `${v}%`}
                        domain={["auto", "auto"]}
                        fontSize={12}
                        tick={{ fill: "#64748b" }}
                      />
                      <Tooltip
                        labelFormatter={(label: any) => formatShortDate(String(label))}
                        formatter={(value: any) => [formatPercent(Number(value)), "Yield"]}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_COLORS.brand}
                        strokeWidth={1.5}
                        dot={{ r: 3, fill: CHART_COLORS.brand, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: CHART_COLORS.brand, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Days of Stock Remaining */}
          <div className="mb-6">
            <ChartCard title="Days of Stock Remaining" subtitle="Estimated days until stock runs out based on current usage">
              {data.daysOfStock.length === 0 ? (
                <EmptyChart message="No stock data available." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Pool name</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Current kg</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Daily rate</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Days remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daysOfStock.map((row) => {
                        let daysColor = "text-green-600";
                        let daysText: string;
                        if (row.daysRemaining === null) {
                          daysText = "\u2014";
                          daysColor = "text-slate-400";
                        } else if (row.daysRemaining < 7) {
                          daysText = row.daysRemaining.toString();
                          daysColor = "text-red-600 font-semibold";
                        } else if (row.daysRemaining < 14) {
                          daysText = row.daysRemaining.toString();
                          daysColor = "text-amber-600 font-semibold";
                        } else {
                          daysText = row.daysRemaining.toString();
                        }

                        return (
                          <tr key={row.name} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-2.5 px-3 text-slate-900 font-medium">{row.name}</td>
                            <td className="py-2.5 px-3 text-right text-slate-600">{formatKg(row.currentKg)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              {row.dailyRate > 0 ? `${row.dailyRate.toFixed(2)} kg/day` : "\u2014"}
                            </td>
                            <td className={`py-2.5 px-3 text-right ${daysColor}`}>{daysText}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </>
  );
}
