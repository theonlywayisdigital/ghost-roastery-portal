"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PoundSterling,
  ShoppingCart,
  Users,
  Flame,
  Package,
  AlertTriangle,
  UserPlus,
  TrendingUp,
} from "@/components/icons";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";
import {
  DateRangeSelector,
  AnalyticsNav,
  KPICard,
  DomainCard,
  EmptyChart,
  CHART_COLORS,
  formatCurrency,
  formatKg,
  formatPercent,
  formatShortDate,
} from "./AnalyticsShared";

interface OverviewData {
  totalRevenue: number;
  revenueChange: number;
  orderCount: number;
  activeCustomers: number;
  totalKgRoasted: number;
  totalStockKg: number;
  lowStockCount: number;
  newCustomers: number;
  topCustomer: { first_name: string; last_name: string; business_name: string | null; total_spend: number } | null;
  roastsCompleted: number;
  avgYield: number;
  revenueSpark: { date: string; value: number }[];
}

export function OverviewClient() {
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || "30d";
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?section=overview&range=${range}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <DateRangeSelector />
      </div>
      <p className="text-slate-500 mb-4">Performance overview across your business.</p>
      <AnalyticsNav />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : !data ? (
        <EmptyChart message="Unable to load analytics data." />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              label="Total Revenue"
              value={formatCurrency(data.totalRevenue)}
              change={data.revenueChange}
              icon={PoundSterling}
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
            <KPICard
              label="Orders Placed"
              value={data.orderCount.toString()}
              icon={ShoppingCart}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <KPICard
              label="Active Customers"
              value={data.activeCustomers.toString()}
              icon={Users}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
            <KPICard
              label="Total Kg Roasted"
              value={formatKg(data.totalKgRoasted)}
              icon={Flame}
              iconBg="bg-orange-50"
              iconColor="text-orange-600"
            />
          </div>

          {/* Domain summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales */}
            <DomainCard
              title="Sales & Revenue"
              icon={ShoppingCart}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              href={`/analytics/sales?range=${range}`}
            >
              {data.revenueSpark.length > 0 ? (
                <div className="h-16 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenueSpark}>
                      <defs>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.brand} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_COLORS.brand}
                        strokeWidth={1.5}
                        fill="url(#sparkGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No revenue data in period</p>
              )}
              <div className="flex items-center gap-1 mt-2">
                {data.revenueChange >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 text-red-500 rotate-180" />
                )}
                <span className={`text-xs font-medium ${data.revenueChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {data.revenueChange >= 0 ? "+" : ""}
                  {data.revenueChange.toFixed(1)}% vs prev period
                </span>
              </div>
            </DomainCard>

            {/* Inventory */}
            <DomainCard
              title="Stock & Inventory"
              icon={Package}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              href={`/analytics/inventory?range=${range}`}
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Roasted stock total</span>
                  <span className="font-medium text-slate-900">{formatKg(data.totalStockKg)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Pools below threshold</span>
                  <span className={`font-medium ${data.lowStockCount > 0 ? "text-red-600" : "text-green-600"}`}>
                    {data.lowStockCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {data.lowStockCount}
                      </span>
                    ) : (
                      "None"
                    )}
                  </span>
                </div>
              </div>
            </DomainCard>

            {/* Customers */}
            <DomainCard
              title="Customers & Buyers"
              icon={Users}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              href={`/analytics/customers?range=${range}`}
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">New customers</span>
                  <span className="font-medium text-slate-900 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5 text-purple-500" />
                    {data.newCustomers}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Top customer</span>
                  <span className="font-medium text-slate-900 truncate ml-4 max-w-[160px]">
                    {data.topCustomer
                      ? `${data.topCustomer.first_name} ${data.topCustomer.last_name}`.trim() || data.topCustomer.business_name || "—"
                      : "—"}
                  </span>
                </div>
              </div>
            </DomainCard>

            {/* Production */}
            <DomainCard
              title="Production & Roasting"
              icon={Flame}
              iconBg="bg-orange-50"
              iconColor="text-orange-600"
              href={`/analytics/production?range=${range}`}
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Roasts completed</span>
                  <span className="font-medium text-slate-900">{data.roastsCompleted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Avg roast yield</span>
                  <span className="font-medium text-slate-900">{data.avgYield > 0 ? formatPercent(data.avgYield) : "—"}</span>
                </div>
              </div>
            </DomainCard>
          </div>
        </>
      )}
    </>
  );
}
