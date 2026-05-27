"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, ArrowRight, Loader2 } from "@/components/icons";
import { formatPrice } from "@/components/shared/orders/format";
import type { FinanceOverview } from "@/types/finance";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function AdminRevenueWidget() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinanceOverview | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/finance/overview");
        if (!res.ok) return;
        const json: FinanceOverview = await res.json();
        setData(json);
      } catch {
        // Widget is non-critical
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-slate-500">Revenue Overview</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const chartData = (data.monthlyRevenue || []).slice(-6).map((m) => ({
    month: new Date(m.month + "-01").toLocaleDateString("en-GB", { month: "short" }),
    revenue: m.revenue,
    fees: m.fees,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-slate-500">Revenue Overview</p>
        </div>
        <Link href="/admin/finance" className="text-sm text-brand-600 hover:underline">
          View all
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center py-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-900">{formatPrice(data.totalRevenue)}</p>
          <p className="text-[10px] text-slate-500 font-medium">Total Revenue</p>
        </div>
        <div className="text-center py-2 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">{formatPrice(data.platformFees)}</p>
          <p className="text-[10px] text-green-600 font-medium">Platform Fees</p>
        </div>
        <div className="text-center py-2 bg-amber-50 rounded-lg">
          <p className="text-lg font-bold text-amber-600">{formatPrice(data.outstandingPayouts)}</p>
          <p className="text-[10px] text-amber-600 font-medium">Outstanding</p>
        </div>
        <div className="text-center py-2 bg-red-50 rounded-lg">
          <p className="text-lg font-bold text-red-600">{formatPrice(data.totalRefunded)}</p>
          <p className="text-[10px] text-red-600 font-medium">Refunded</p>
        </div>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="mb-4" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatPrice(Number(value)),
                  name === "revenue" ? "Revenue" : "Fees",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fees" fill="#86efac" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer link */}
      <Link
        href="/admin/finance"
        className="text-sm text-brand-600 hover:underline flex items-center gap-1"
      >
        View Finance Dashboard <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
