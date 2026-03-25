"use client";

import { useEffect, useState } from "react";
import { Flame, Package, ClipboardList, AlertTriangle } from "@/components/icons";
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
  AnalyticsHeader,
  KPICard,
  ChartCard,
  EmptyChart,
  CHART_COLORS,
  DONUT_COLORS,
  formatKg,
  formatPercent,
  formatShortDate,
  useAnalyticsParams,
} from "../AnalyticsShared";

// ── Types ──

interface ProductionData {
  roastsOverTime: { date: string; value: number }[];
  kgOverTime: { date: string; value: number }[];
  yieldTrend: { date: string; value: number; rollingAvg: number }[];
  qualityOverTime: { date: string; value: number }[];
  cuppingTrend: { date: string; value: number }[];
  greenBeans: string[];
  plansCompleted: number;
  plansCancelled: number;
  plansTotal: number;
  roastsByMachine: { name: string; value: number }[];
  topBeans: { name: string; value: number }[];
  totalRoasts: number;
  totalKg: number;
}

// ── Tooltip style ──

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
};

// ── Main Component ──

export function ProductionClient() {
  const { queryString } = useAnalyticsParams();
  const [data, setData] = useState<ProductionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?section=production&${queryString}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [queryString]);

  return (
    <>
      <AnalyticsHeader subtitle="Production &amp; roasting insights." />

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-[360px]" />
            <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-[310px]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-[310px]" />
            <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-[310px]" />
          </div>
        </>
      ) : !data ? (
        <EmptyChart message="Unable to load production analytics data." />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              label="Total Roasts"
              value={data.totalRoasts.toString()}
              icon={Flame}
              iconBg="bg-orange-50"
              iconColor="text-orange-600"
            />
            <KPICard
              label="Total Kg Roasted"
              value={formatKg(data.totalKg)}
              icon={Package}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <KPICard
              label="Plans Completed"
              value={`${data.plansCompleted} / ${data.plansTotal}`}
              icon={ClipboardList}
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
            <KPICard
              label="Plans Cancelled"
              value={data.plansCancelled.toString()}
              icon={AlertTriangle}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
            />
          </div>

          {/* Row 1: Roasts over time + Kg roasted over time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Roasts over time */}
            <ChartCard title="Roasts Over Time" subtitle="Number of roasts completed per day">
              {data.roastsOverTime.length === 0 ? (
                <EmptyChart />
              ) : (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.roastsOverTime}>
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
                        contentStyle={tooltipStyle}
                        labelFormatter={(label: any) => formatShortDate(String(label))}
                        formatter={(value: any) => [value, "Roasts"]}
                      />
                      <Bar
                        dataKey="value"
                        fill={CHART_COLORS.brand}
                        radius={[4, 4, 0, 0]}
                        name="Roasts"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* Kg roasted over time */}
            <ChartCard title="Kg Roasted Over Time" subtitle="Total weight roasted per day">
              {data.kgOverTime.length === 0 ? (
                <EmptyChart />
              ) : (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.kgOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        tickFormatter={(v: number) => `${v} kg`}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label: any) => formatShortDate(String(label))}
                        formatter={(value: any) => [formatKg(Number(value)), "Kg roasted"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_COLORS.green}
                        strokeWidth={2}
                        dot={{ r: 3, fill: CHART_COLORS.green }}
                        activeDot={{ r: 5 }}
                        name="Kg roasted"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Row 2: Roast yield trend + Average roast quality */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Roast yield trend */}
            <ChartCard title="Roast Yield Trend" subtitle="Individual yield and 7-day rolling average">
              {data.yieldTrend.length === 0 ? (
                <EmptyChart />
              ) : (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.yieldTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        tickFormatter={(v: number) => `${v}%`}
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label: any) => formatShortDate(String(label))}
                        formatter={(value: any, name: any) => [
                          formatPercent(Number(value)),
                          name === "rollingAvg" ? "7-day avg" : "Yield",
                        ]}
                      />
                      <Legend
                        formatter={(value: string) =>
                          value === "rollingAvg" ? "7-day rolling avg" : "Individual yield"
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_COLORS.brand}
                        strokeWidth={1}
                        dot={{ r: 2, fill: CHART_COLORS.brand }}
                        activeDot={{ r: 4 }}
                        name="value"
                      />
                      <Line
                        type="monotone"
                        dataKey="rollingAvg"
                        stroke={CHART_COLORS.green}
                        strokeWidth={2}
                        dot={false}
                        name="rollingAvg"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* Average roast quality */}
            <ChartCard title="Average Roast Quality" subtitle="Quality score over time (0-5)">
              {data.qualityOverTime.length === 0 ? (
                <EmptyChart />
              ) : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.qualityOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        domain={[0, 5]}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label: any) => formatShortDate(String(label))}
                        formatter={(value: any) => [Number(value).toFixed(1), "Quality"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_COLORS.amber}
                        strokeWidth={2}
                        dot={{ r: 3, fill: CHART_COLORS.amber }}
                        activeDot={{ r: 5 }}
                        name="Quality"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Row 3: Cupping scores trend + Roasts by machine */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Cupping scores trend */}
            <ChartCard title="Cupping Scores Trend" subtitle="Average cupping score over time">
              {data.cuppingTrend.length === 0 ? (
                <EmptyChart />
              ) : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.cuppingTrend}>
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
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label: any) => formatShortDate(String(label))}
                        formatter={(value: any) => [Number(value).toFixed(1), "Cupping score"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_COLORS.purple}
                        strokeWidth={2}
                        dot={{ r: 3, fill: CHART_COLORS.purple }}
                        activeDot={{ r: 5 }}
                        name="Cupping score"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* Roasts by machine */}
            <ChartCard title="Roasts by Machine" subtitle="Distribution across roasting machines">
              {data.roastsByMachine.length === 0 ? (
                <EmptyChart />
              ) : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.roastsByMachine}
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
                        {data.roastsByMachine.map((_, idx) => (
                          <Cell
                            key={`machine-${idx}`}
                            fill={DONUT_COLORS[idx % DONUT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: any) => [value, "Roasts"]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Row 4: Top beans by volume */}
          <div className="mb-6">
            <ChartCard title="Top Beans by Volume" subtitle="Most roasted beans by weight (kg)">
              {data.topBeans.length === 0 ? (
                <EmptyChart />
              ) : (
                <div
                  style={{
                    height: Math.max(data.topBeans.length * 40 + 60, 200),
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topBeans}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tickFormatter={(v: number) => `${v} kg`}
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                        width={140}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: any) => [formatKg(Number(value)), "Volume"]}
                      />
                      <Bar
                        dataKey="value"
                        fill={CHART_COLORS.brand}
                        radius={[0, 4, 4, 0]}
                        name="Volume"
                        label={{
                          position: "right",
                          formatter: (v: any) => formatKg(Number(v)),
                          fill: "#64748b",
                          fontSize: 12,
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </>
  );
}
