"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatRelativeTime, formatPrice } from "@/components/shared/orders/format";

export interface AdminRecentOrder {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string | null;
  type: "ghost" | "storefront";
  status: string;
  total: number;
}

export function AdminRecentOrdersWidget({ recentOrders }: { recentOrders: AdminRecentOrder[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">Recent Orders</h2>
        <Link
          href="/admin/orders"
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
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-brand-600 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-slate-500 hidden md:table-cell">
                    {formatRelativeTime(order.date)}
                  </td>
                  <td className="py-3 pr-4 text-slate-700 max-w-[140px] truncate">
                    {order.customerName || "\u2014"}
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
