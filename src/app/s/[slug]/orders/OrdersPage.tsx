"use client";

import Link from "next/link";
import { useStorefront } from "../_components/StorefrontProvider";
import { Header } from "../_components/Header";
import { Cart } from "../_components/Cart";
import { Footer } from "../_components/Footer";
import { RETAIL_ENABLED } from "@/lib/feature-flags";

interface OrderItem {
  name?: string;
  productName?: string;
  quantity: number;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  discount_code: string | null;
  items: OrderItem[];
  order_channel: string;
  payment_method: string;
  payment_terms: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  stripe_payment_id: string | null;
  refund_status: string;
  refund_total: number;
  invoice_id: string | null;
}

const STATUS_COLOURS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-slate-100", text: "text-slate-700" },
  paid: { bg: "bg-blue-100", text: "text-blue-700" },
  confirmed: { bg: "bg-blue-100", text: "text-blue-700" },
  processing: { bg: "bg-amber-100", text: "text-amber-700" },
  dispatched: { bg: "bg-purple-100", text: "text-purple-700" },
  delivered: { bg: "bg-green-100", text: "text-green-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-700" },
};

function StatusBadge({ status }: { status: string }) {
  const colours = STATUS_COLOURS[status] || STATUS_COLOURS.pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colours.bg} ${colours.text}`}
    >
      {status}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const label = channel === "wholesale" ? "Wholesale" : "Retail";
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function itemCount(items: OrderItem[]) {
  const total = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  return `${total} item${total !== 1 ? "s" : ""}`;
}

export function OrdersPage({
  slug,
  orders,
}: {
  slug: string;
  orders: Order[];
}) {
  const { accent, accentText, embedded } = useStorefront();

  return (
    <div style={{ fontFamily: "var(--sf-font)" }} className="min-h-screen">
      <Header />
      <Cart />
      {!embedded && <div className="h-16 md:h-20" />}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold mb-8" style={{ color: "var(--sf-text)" }}>My Orders</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-7 h-7 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              No orders yet
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Once you place an order, it will appear here.
            </p>
            <Link
              href={`/s/${slug}/shop`}
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent, color: accentText }}
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/s/${slug}/orders/${order.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-slate-900">
                      {`#${order.id.slice(0, 8).toUpperCase()}`}
                    </span>
                    <StatusBadge status={order.status} />
                    {RETAIL_ENABLED && <ChannelBadge channel={order.order_channel} />}
                    {(order.refund_status === "partial" ||
                      order.refund_status === "full") && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 capitalize">
                        {`${order.refund_status} refund`}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-slate-500">
                    {formatDate(order.created_at)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">
                      {`£${order.subtotal.toFixed(2)}`}
                    </span>
                    {order.discount_amount > 0 && (
                      <span className="text-green-600">
                        {`-£${order.discount_amount.toFixed(2)} discount`}
                      </span>
                    )}
                    <span>{itemCount(order.items)}</span>
                  </div>
                  {order.tracking_number && (
                    <span className="text-xs text-slate-500">
                      {`${order.tracking_carrier || "Tracking"}: ${order.tracking_number}`}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-end">
                  <span
                    className="text-xs font-medium"
                    style={{ color: accent }}
                  >
                    View Order →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
