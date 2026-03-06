"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package } from "@/components/icons";
import { StatusBadge } from "@/components/admin";
import { formatPrice } from "@/components/shared/orders";

interface UnifiedOrder {
  id: string;
  orderNumber: string;
  orderType: "ghost" | "wholesale" | "storefront";
  status: string;
  total: number;
  itemSummary: string;
  imageUrl: string | null;
  brandName: string | null;
  createdAt: string;
}

export function MyOrdersClient() {
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/my-orders")
      .then((res) => res.json())
      .then((data) => setOrders(data.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No orders yet</h3>
        <p className="text-slate-500 mb-6">
          Your orders will appear here once you place them.
        </p>
        <a
          href={process.env.NEXT_PUBLIC_SITE_URL || "https://ghostroasting.co.uk"}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          Build Your Coffee
        </a>
      </div>
    );
  }

  const filtered = filter === "all"
    ? orders
    : orders.filter((o) => o.orderType === filter);

  const hasMultipleTypes = new Set(orders.map((o) => o.orderType)).size > 1;

  return (
    <div>
      {/* Filter tabs */}
      {hasMultipleTypes && (
        <div className="flex gap-2 mb-6">
          {["all", "ghost", "storefront", "wholesale"].map((f) => {
            const count = f === "all" ? orders.length : orders.filter((o) => o.orderType === f).length;
            if (f !== "all" && count === 0) return null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-brand-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f === "all" ? "All" : f === "ghost" ? "Ghost Roastery" : f === "storefront" ? "Storefront" : "Wholesale"}
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Orders list */}
      <div className="space-y-4">
        {filtered.map((order) => (
          <Link
            key={order.id}
            href={`/my-orders/${order.id}?type=${order.orderType}`}
            className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                {order.imageUrl ? (
                  <Image
                    src={order.imageUrl}
                    alt={order.orderNumber}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-slate-300" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-slate-900">{order.orderNumber}</h3>
                  <StatusBadge status={order.orderType} type="orderType" />
                  <StatusBadge status={order.status} type="order" />
                </div>
                {order.brandName && (
                  <p className="text-sm text-slate-500 mb-1">{order.brandName}</p>
                )}
                <p className="text-sm text-slate-600">{order.itemSummary}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span>{formatPrice(order.total)}</span>
                  <span>
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
