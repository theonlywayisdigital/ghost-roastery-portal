"use client";

import { useState, useEffect } from "react";
import {
  PoundSterling,
  TrendingUp,
  Wallet,
  FileText,
  Loader2,
  Info,
  RotateCcw,
} from "@/components/icons";
import type { FinanceOverview, LedgerEntry } from "@/types/finance";
import { StatusBadge } from "@/components/admin/StatusBadge";

function formatCurrency(amount: number) {
  return `£${amount.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FinanceOverviewTab() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/finance/overview")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-slate-500 text-center py-10">
        Failed to load overview data.
      </p>
    );
  }

  const cards: { label: string; value: string; icon: typeof PoundSterling; color: string; tooltip?: string }[] = [
    {
      label: "Total Revenue",
      value: formatCurrency(data.totalRevenue),
      icon: PoundSterling,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "GR Margin",
      value: formatCurrency(data.ghostRoasteryMargin),
      icon: TrendingUp,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Platform Fees",
      value: formatCurrency(data.platformFees),
      icon: PoundSterling,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Partner Fulfilment Payouts",
      value: formatCurrency(data.outstandingPayouts),
      icon: Wallet,
      color: "text-orange-600 bg-orange-50",
      tooltip: "Payouts owed to partner roasters fulfilling Roastery Platform orders. Storefront and wholesale payments are handled via Stripe Connect or direct invoicing.",
    },
    {
      label: "Outstanding Invoices",
      value: formatCurrency(data.outstandingInvoices),
      icon: FileText,
      color: "text-red-600 bg-red-50",
    },
    {
      label: "Total Refunded",
      value: formatCurrency(data.totalRefunded),
      icon: RotateCcw,
      color: "text-slate-600 bg-slate-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{card.value}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-xs text-slate-500">{card.label}</p>
                {card.tooltip && (
                  <span className="group relative">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                      {card.tooltip}
                    </span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly revenue chart placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Monthly Revenue (Last 12 Months)
        </h3>
        <div className="grid grid-cols-12 gap-1 items-end h-40">
          {data.monthlyRevenue.map((m) => {
            const maxRevenue = Math.max(
              ...data.monthlyRevenue.map((x) => x.revenue),
              1
            );
            const height = Math.max((m.revenue / maxRevenue) * 100, 2);
            const feeHeight = Math.max((m.fees / maxRevenue) * 100, 1);
            return (
              <div
                key={m.month}
                className="flex flex-col items-center gap-0.5"
              >
                <div
                  className="w-full bg-brand-100 rounded-t relative"
                  style={{ height: `${height}%` }}
                  title={`${m.month}: ${formatCurrency(m.revenue)} revenue, ${formatCurrency(m.fees)} fees`}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-brand-500 rounded-t"
                    style={{ height: `${feeHeight}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400">
                  {m.month.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-brand-100 rounded" />
            Revenue
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-brand-500 rounded" />
            Fees
          </div>
        </div>
      </div>

      {/* Recent ledger entries */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            Recent Ledger Entries
          </h3>
        </div>
        {data.recentLedgerEntries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">
              No ledger entries yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                    Roaster
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Gross
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Fee
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentLedgerEntries.map((entry: LedgerEntry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-700">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge
                        status={entry.order_type}
                        type="orderType"
                      />
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700 hidden sm:table-cell">
                      {entry.roaster_name || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-900 text-right font-medium">
                      {formatCurrency(entry.gross_amount)}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700 text-right">
                      {formatCurrency(entry.fee_amount)}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={entry.status} type="payment" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
