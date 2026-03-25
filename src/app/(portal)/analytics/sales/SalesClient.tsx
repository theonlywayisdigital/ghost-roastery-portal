"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PoundSterling,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Tag,
} from "@/components/icons";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  DateRangeSelector,
  AnalyticsNav,
  KPICard,
  ChartCard,
  EmptyChart,
  CHART_COLORS,
  DONUT_COLORS,
  formatCurrency,
  formatShortDate,
  formatPercent,
} from "../AnalyticsShared";

interface SalesData {
  revenueOverTime: { date: string; retail: number; wholesale: number; total: number }[];
  ordersOverTime: { date: string; value: number }[];
  totalRevenue: number;
  orderCount: number;
  aov: number;
  aovChange: number;
  revenueByPayment: { name: string; value: number }[];
  topProducts: { name: string; value: number }[];
  totalDiscountGiven: number;
  discountOrderCount: number;
  aovWithDiscount: number;
  aovWithoutDiscount: number;
  totalRefunded: number;
  refundRate: number;
}

export function SalesClient() {
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || "30d";
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueMode, setRevenueMode] = useState<"stacked" | "total">("stacked");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?section=sales&range=${range}`)
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
      <p className="text-slate-500 mb-4">Sales & revenue performance.</p>
      <AnalyticsNav />

      {loading ? (
        <>
          {/* Skeleton KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-28" />
            ))}
          </div>
          {/* Skeleton charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-[360px]" />
            <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-[360px]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-[310px]" />
            <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-[310px]" />
          </div>
        </>
      ) : !data ? (
        <EmptyChart message="Unable to load sales analytics data." />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              label="Total Revenue"
              value={formatCurrency(data.totalRevenue)}
              icon={PoundSterling}
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
            <KPICard
              label="Orders"
              value={data.orderCount.toString()}
              icon={ShoppingCart}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <KPICard
              label="Avg Order Value"
              value={formatCurrency(data.aov)}
              change={data.aovChange}
              icon={TrendingUp}
              iconBg="bg-brand-50"
              iconColor="text-brand-600"
            />
            <KPICard
              label="Refund Rate"
              value={formatPercent(data.refundRate)}
              icon={Receipt}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
            />
          </div>

          {/* Revenue over time + Orders over time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue over time */}
            <ChartCard
              title="Revenue Over Time"
              subtitle="Retail vs wholesale breakdown"
              action={
                <button
                  onClick={() => setRevenueMode(revenueMode === "stacked" ? "total" : "stacked")}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  {revenueMode === "stacked" ? "Show Total" : "Show Stacked"}
                </button>
              }
            >
              {data.revenueOverTime.length === 0 ? (
                <EmptyChart />
              ) : (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.revenueOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        tickFormatter={(v) => formatCurrency(v)}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12 }}
                        formatter={(value: any, name: any) => [
                          formatCurrency(Number(value)),
                          String(name).charAt(0).toUpperCase() + String(name).slice(1),
                        ]}
                        labelFormatter={(label: any) => formatShortDate(String(label))}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {revenueMode === "stacked" ? (
                        <>
                          <Bar
                            dataKey="retail"
                            stackId="revenue"
                            fill={CHART_COLORS.brand}
                            radius={[0, 0, 0, 0]}
                            name="Retail"
                          />
                          <Bar
                            dataKey="wholesale"
                            stackId="revenue"
                            fill={CHART_COLORS.green}
                            radius={[4, 4, 0, 0]}
                            name="Wholesale"
                          />
                        </>
                      ) : (
                        <Bar
                          dataKey="total"
                          fill={CHART_COLORS.brand}
                          radius={[4, 4, 0, 0]}
                          name="Total"
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* Orders over time */}
            <ChartCard title="Orders Over Time" subtitle="Number of orders placed">
              {data.ordersOverTime.length === 0 ? (
                <EmptyChart />
              ) : (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.ordersOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12 }}
                        labelFormatter={(label: any) => formatShortDate(String(label))}
                        formatter={(value: any) => [value, "Orders"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_COLORS.brand}
                        strokeWidth={2}
                        dot={{ r: 3, fill: CHART_COLORS.brand }}
                        activeDot={{ r: 5 }}
                        name="Orders"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Revenue by payment method + Top products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue by payment method */}
            <ChartCard title="Revenue by Payment Method" subtitle="Breakdown by payment type">
              {data.revenueByPayment.length === 0 ? (
                <EmptyChart />
              ) : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.revenueByPayment}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }: any) =>
                          `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                        labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                      >
                        {data.revenueByPayment.map((_, idx) => (
                          <Cell
                            key={`payment-${idx}`}
                            fill={DONUT_COLORS[idx % DONUT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 12 }}
                        formatter={(value: any) => [formatCurrency(Number(value)), "Revenue"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* Top 5 products */}
            <ChartCard title="Top 5 Products" subtitle="By revenue">
              {data.topProducts.length === 0 ? (
                <EmptyChart />
              ) : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatCurrency(v)}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12 }}
                        formatter={(value: any) => [formatCurrency(Number(value)), "Revenue"]}
                      />
                      <Bar
                        dataKey="value"
                        fill={CHART_COLORS.brand}
                        radius={[0, 4, 4, 0]}
                        name="Revenue"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Discount impact */}
          <ChartCard title="Discount Impact" subtitle="How discounts affect order value">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Tag className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-500">Total Discount Given</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.totalDiscountGiven)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2 ml-[52px]">
                  Across {data.discountOrderCount} order{data.discountOrderCount !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-500">AOV With Discount</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.aovWithDiscount)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-500">AOV Without Discount</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.aovWithoutDiscount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>
        </>
      )}
    </>
  );
}
