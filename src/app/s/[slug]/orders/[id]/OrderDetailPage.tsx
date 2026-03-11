"use client";

import { useState } from "react";
import Link from "next/link";
import { useStorefront } from "../../_components/StorefrontProvider";
import { Header } from "../../_components/Header";
import { Cart } from "../../_components/Cart";
import { Footer } from "../../_components/Footer";

interface OrderItem {
  name?: string;
  productName?: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  unitAmount?: number;
  unit?: string;
}

interface DeliveryAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
  country?: string;
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
  delivery_address: DeliveryAddress | null;
  customer_name: string;
  customer_email: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_access_token: string | null;
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: "Card (Stripe)",
  invoice_online: "Invoice",
  invoice_offline: "Invoice (Offline)",
};

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  prepay: "Prepay",
  net7: "Net 7",
  net14: "Net 14",
  net30: "Net 30",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getItemPrice(item: OrderItem): number {
  // unitAmount is in pence (from Stripe metadata), price/unitPrice are in pounds
  if (item.unitAmount) return item.unitAmount / 100;
  return item.price || item.unitPrice || 0;
}

export function OrderDetailPage({
  slug,
  order,
  invoice,
}: {
  slug: string;
  order: Order;
  invoice: Invoice | null;
}) {
  const { accent, accentText, embedded } = useStorefront();
  const [trackingCopied, setTrackingCopied] = useState(false);

  const statusColours =
    STATUS_COLOURS[order.status] || STATUS_COLOURS.pending;
  const orderRef = order.id.slice(0, 8).toUpperCase();
  const address = order.delivery_address;
  const total = order.subtotal - order.discount_amount;

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";

  function copyTracking() {
    if (order.tracking_number) {
      navigator.clipboard.writeText(order.tracking_number);
      setTrackingCopied(true);
      setTimeout(() => setTrackingCopied(false), 2000);
    }
  }

  return (
    <div
      style={{ fontFamily: "var(--sf-font)" }}
      className="min-h-screen"
    >
      <Header />
      <Cart />
      {!embedded && <div className="h-16 md:h-20" />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Back link */}
        <Link
          href={`/s/${slug}/orders`}
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-80"
          style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Orders
        </Link>

        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "var(--sf-text)" }}>
            {`Order #${orderRef}`}
          </h1>
          <span
            className={`inline-flex items-center self-start px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColours.bg} ${statusColours.text}`}
          >
            {order.status}
          </span>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order summary card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">
                  Order Summary
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {order.items.map((item, idx) => {
                  const unitPrice = getItemPrice(item);
                  const lineTotal = unitPrice * item.quantity;
                  return (
                    <div
                      key={idx}
                      className="px-6 py-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-slate-900">
                          {item.name || item.productName || "Item"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {`${item.quantity} × £${unitPrice.toFixed(2)}`}
                          {item.unit ? ` / ${item.unit}` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {`£${lineTotal.toFixed(2)}`}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-900">
                    {`£${order.subtotal.toFixed(2)}`}
                  </span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">
                      {`Discount${order.discount_code ? ` (${order.discount_code})` : ""}`}
                    </span>
                    <span className="text-green-600">
                      {`-£${order.discount_amount.toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-100">
                  <span className="text-slate-900">Total</span>
                  <span className="text-slate-900">
                    {`£${total.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery address card */}
            {address && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  Delivery Address
                </h2>
                <div className="text-sm text-slate-600 space-y-0.5">
                  {address.name && <p>{address.name}</p>}
                  {address.line1 && <p>{address.line1}</p>}
                  {address.line2 && <p>{address.line2}</p>}
                  {address.city && <p>{address.city}</p>}
                  {address.postcode && <p>{address.postcode}</p>}
                  {address.country && <p>{address.country}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Right column — 1/3 */}
          <div className="space-y-6">
            {/* Order info card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">
                Order Info
              </h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Date Placed</dt>
                  <dd className="text-slate-900 font-medium">
                    {formatDate(order.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Payment Method</dt>
                  <dd className="text-slate-900 font-medium">
                    {PAYMENT_METHOD_LABELS[order.payment_method] ||
                      order.payment_method}
                  </dd>
                </div>
                {order.order_channel === "wholesale" &&
                  order.payment_terms && (
                    <div>
                      <dt className="text-slate-500">Payment Terms</dt>
                      <dd className="text-slate-900 font-medium">
                        {PAYMENT_TERMS_LABELS[order.payment_terms] ||
                          order.payment_terms}
                      </dd>
                    </div>
                  )}
                <div>
                  <dt className="text-slate-500">Order Type</dt>
                  <dd className="text-slate-900 font-medium">
                    {order.order_channel === "wholesale"
                      ? "Wholesale"
                      : "Retail"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Tracking card */}
            {order.tracking_number && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  Tracking
                </h2>
                <div className="text-sm space-y-2">
                  {order.tracking_carrier && (
                    <p className="text-slate-600">
                      {`Carrier: ${order.tracking_carrier}`}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700 flex-1 truncate">
                      {order.tracking_number}
                    </code>
                    <button
                      onClick={copyTracking}
                      className="text-xs font-medium px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
                    >
                      {trackingCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice card */}
            {invoice && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  Invoice
                </h2>
                <p className="text-sm text-slate-600 mb-3">
                  {`Invoice: ${invoice.invoice_number}`}
                </p>
                {invoice.invoice_access_token && (
                  <Link
                    href={`/invoices/view/${invoice.id}?token=${invoice.invoice_access_token}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ backgroundColor: accent, color: accentText }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    View Invoice
                  </Link>
                )}
              </div>
            )}

            {/* Refund card */}
            {(order.refund_status === "partial" ||
              order.refund_status === "full") && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  Refund
                </h2>
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      order.refund_status === "full"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {`${order.refund_status} refund`}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {`£${order.refund_total.toFixed(2)} refunded`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom link */}
        {portalUrl && (
          <div className="mt-10 text-center">
            <a
              href={`${portalUrl}/my-orders`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-opacity hover:opacity-80"
              style={{ color: "color-mix(in srgb, var(--sf-text) 40%, transparent)" }}
            >
              {"Manage all your orders at Ghost Roastery \u2192"}
            </a>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
