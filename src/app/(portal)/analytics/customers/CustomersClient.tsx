"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, AlertTriangle, UserPlus } from "@/components/icons";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  AnalyticsHeader, KPICard, ChartCard, EmptyChart,
  CHART_COLORS, DONUT_COLORS, formatCurrency, formatShortDate,
  useAnalyticsParams,
} from "../AnalyticsShared";

// ── Data shape ──

interface CustomersData {
  newVsReturning: { date: string; new: number; returning: number }[];
  acquisitionBySource: { name: string; value: number }[];
  topCustomers: {
    first_name: string;
    last_name: string;
    business_name: string | null;
    total_spend: number;
    order_count: number;
    last_activity_at: string;
    priceTier: string | null;
  }[];
  wholesaleTiers: { name: string; value: number }[];
  repeatCustomers: number;
  atRiskCount: number;
  leadPipeline: { name: string; value: number }[];
  totalCustomersInPeriod: number;
}

// ── Helpers ──

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function customerName(c: { first_name: string; last_name: string; business_name: string | null }) {
  const full = `${c.first_name} ${c.last_name}`.trim();
  return full || c.business_name || "—";
}

// ── Lead pipeline bar opacity (funnel effect) ──

const PIPELINE_OPACITY = [1, 0.85, 0.7, 0.55, 0.4];

// ── Component ──

export function CustomersClient() {
  const { queryString } = useAnalyticsParams();
  const [data, setData] = useState<CustomersData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?section=customers&${queryString}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [queryString]);

  return (
    <>
      <AnalyticsHeader subtitle="Customer &amp; buyer insights." />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : !data ? (
        <EmptyChart message="Unable to load customer analytics data." />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <KPICard
              label="Total Customers"
              value={data.totalCustomersInPeriod.toString()}
              icon={Users}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
            <KPICard
              label="Repeat Customers"
              value={data.repeatCustomers.toString()}
              icon={UserCheck}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <KPICard
              label="At-Risk Customers"
              value={data.atRiskCount.toString()}
              icon={AlertTriangle}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
            />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 1. New vs Returning */}
            <ChartCard title="New vs Returning Customers" subtitle="Customer breakdown by date">
              {data.newVsReturning.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.newVsReturning} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        labelFormatter={(label: any) => formatShortDate(String(label))}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />
                      <Bar dataKey="new" name="New" fill={CHART_COLORS.brand} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="returning" name="Returning" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* 2. Acquisition by Source */}
            <ChartCard title="Customer Acquisition by Source" subtitle="Where your customers come from">
              {data.acquisitionBySource.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-72 flex flex-col items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.acquisitionBySource}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {data.acquisitionBySource.map((_, idx) => (
                          <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* 3. Top 10 Customers — full width */}
            <ChartCard
              title="Top 10 Customers by Spend"
              subtitle="Highest-value customers in the selected period"
              className="lg:col-span-2"
            >
              {data.topCustomers.length === 0 ? (
                <EmptyChart message="No customer activity in this period." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                          Name
                        </th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                          Business
                        </th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                          Total Spend
                        </th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                          Orders
                        </th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                          Last Activity
                        </th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                          Tier
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCustomers.map((c, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="px-4 py-3 text-slate-700 font-medium">
                            {customerName(c)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {c.business_name || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatCurrency(c.total_spend)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {c.order_count}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {c.last_activity_at ? formatDate(c.last_activity_at) : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {c.priceTier || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>

            {/* 4. Wholesale Tier Breakdown */}
            <ChartCard title="Wholesale Tier Breakdown" subtitle="Distribution across pricing tiers">
              {data.wholesaleTiers.length === 0 ? (
                <EmptyChart message="No wholesale tier data available." />
              ) : (
                <div className="h-72 flex flex-col items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.wholesaleTiers}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {data.wholesaleTiers.map((_, idx) => (
                          <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* 5. Lead Pipeline */}
            <ChartCard title="Lead Pipeline" subtitle="Funnel stages of prospective customers">
              {data.leadPipeline.length === 0 ? (
                <EmptyChart message="No lead pipeline data available." />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.leadPipeline} layout="vertical" barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                      />
                      <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                        {data.leadPipeline.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={CHART_COLORS.brand}
                            fillOpacity={PIPELINE_OPACITY[idx] ?? 0.4}
                          />
                        ))}
                      </Bar>
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
