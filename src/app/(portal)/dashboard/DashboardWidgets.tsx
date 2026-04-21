"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatRelativeTime, formatPrice } from "@/components/shared/orders/format";
import { ShoppingCart, Coffee, FileText, Users, Wallet } from "@/components/icons";

export interface RecentOrder {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string | null;
  type: "storefront" | "wholesale" | "ghost";
  status: string;
  total: number;
}

export interface ActivityItem {
  id: string;
  type: "order" | "ghost_order" | "form_submission" | "wholesale_application" | "payout";
  description: string;
  timestamp: string;
}

const activityIconMap: Record<ActivityItem["type"], { Icon: typeof ShoppingCart; bg: string; text: string }> = {
  order: { Icon: ShoppingCart, bg: "bg-blue-50", text: "text-blue-600" },
  ghost_order: { Icon: Coffee, bg: "bg-brand-50", text: "text-brand-600" },
  form_submission: { Icon: FileText, bg: "bg-purple-50", text: "text-purple-600" },
  wholesale_application: { Icon: Users, bg: "bg-indigo-50", text: "text-indigo-600" },
  payout: { Icon: Wallet, bg: "bg-green-50", text: "text-green-600" },
};

export function RecentOrdersWidget({ recentOrders }: { recentOrders: RecentOrder[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">Recent Orders</h2>
        <Link
          href="/orders"
          className="text-sm text-brand-600 hover:underline"
        >
          View all
        </Link>
      </div>

      {recentOrders.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left font-medium text-slate-500 pb-3 pr-4">Order</th>
                <th className="text-left font-medium text-slate-500 pb-3 pr-4 hidden md:table-cell">Date</th>
                <th className="text-left font-medium text-slate-500 pb-3 pr-4">Customer</th>
                <th className="text-left font-medium text-slate-500 pb-3 pr-4">Type</th>
                <th className="text-left font-medium text-slate-500 pb-3 pr-4">Status</th>
                <th className="text-right font-medium text-slate-500 pb-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/orders/${order.id}?type=${order.type}`}
                      className="font-mono text-brand-600 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-slate-500 hidden md:table-cell">
                    {formatRelativeTime(order.date)}
                  </td>
                  <td className="py-3 pr-4 text-slate-700 max-w-[140px] truncate">
                    {order.customerName || "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={order.type} type="orderType" />
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={order.status} type="order" />
                  </td>
                  <td className="py-3 text-right text-slate-700 whitespace-nowrap">
                    {formatPrice(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RecentActivityWidget({ activityItems }: { activityItems: ActivityItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Activity</h2>

      {activityItems.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No recent activity.</p>
      ) : (
        <div className="space-y-4">
          {activityItems.map((item) => {
            const config = activityIconMap[item.type];
            const { Icon } = config;
            return (
              <div key={item.id} className="flex gap-3">
                <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 line-clamp-2">
                    {item.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatRelativeTime(item.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Backward-compatible composite export
export function DashboardWidgets({ recentOrders, activityItems }: { recentOrders: RecentOrder[]; activityItems: ActivityItem[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="lg:col-span-2">
        <RecentOrdersWidget recentOrders={recentOrders} />
      </div>
      <div className="lg:col-span-1">
        <RecentActivityWidget activityItems={activityItems} />
      </div>
    </div>
  );
}
