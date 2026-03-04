"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/admin";
import {
  FulfilmentStepper,
  GHOST_STEPS,
  WHOLESALE_STEPS,
  CancellationDialog,
  OrderSummaryCard,
  DeliveryAddressCard,
  TrackingCard,
  formatDateTime,
  formatPrice,
} from "@/components/shared/orders";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CustomerOrderDetailProps {
  orderId: string;
  orderType: string;
}

export function CustomerOrderDetail({ orderId, orderType: initialType }: CustomerOrderDetailProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch(`/api/my-orders/${orderId}?type=${initialType}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId, initialType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.error) {
    return <div className="text-center py-20 text-slate-400">Order not found</div>;
  }

  const { order, orderType, roasterOrder, invoice } = data;
  const isGhost = orderType === "ghost";
  const orderNumber = isGhost ? order.order_number : order.id.slice(0, 8).toUpperCase();
  const status = isGhost ? order.order_status : order.status;
  const totalPrice = isGhost ? order.total_price : order.subtotal;
  const isCancelled = status === "cancelled" || status === "Cancelled";

  // Customer can only cancel Pending orders
  const canCancel = isGhost ? status === "Pending" : status === "pending";

  async function handleCancel({ reason, reasonCategory }: { reason: string; reasonCategory: string }) {
    setCancelling(true);
    try {
      const res = await fetch(`/api/my-orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderType, reason, reasonCategory }),
      });
      if (res.ok) {
        router.push("/my-orders");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to cancel order");
      }
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  }

  // Tracking info
  const trackingNumber = isGhost ? roasterOrder?.tracking_number : order.tracking_number;
  const trackingCarrier = isGhost ? roasterOrder?.tracking_carrier : order.tracking_carrier;
  const hasTracking = !!trackingNumber;

  return (
    <div>
      {/* Back link */}
      <Link href="/my-orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to My Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{orderNumber}</h1>
            <StatusBadge status={orderType} type="orderType" />
            <StatusBadge status={status} type="order" />
          </div>
          <p className="text-sm text-slate-500">
            {`Placed ${formatDateTime(order.created_at)} · ${formatPrice(totalPrice)}`}
          </p>
          {isCancelled && order.cancellation_reason && (
            <p className="text-sm text-red-600 mt-1">
              {`Reason: ${order.cancellation_reason}`}
            </p>
          )}
        </div>
      </div>

      {/* Fulfilment Stepper */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Order Status</h3>
        <FulfilmentStepper
          steps={isGhost ? GHOST_STEPS : WHOLESALE_STEPS}
          currentStatus={status}
          isCancelled={isCancelled}
          cancellationReason={order.cancellation_reason}
          timestamps={isGhost ? {
            Pending: order.created_at,
            "In Production": roasterOrder?.accepted_at,
            Dispatched: roasterOrder?.dispatched_at || order.dispatched_at,
            Delivered: roasterOrder?.delivered_at || order.delivered_at,
          } : {
            pending: order.created_at,
            confirmed: order.confirmed_at,
            dispatched: order.dispatched_at,
            delivered: order.delivered_at,
          }}
        />
      </div>

      {/* Layout: main + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <OrderSummaryCard order={order} orderType={orderType} />

          <DeliveryAddressCard address={order.delivery_address} />

          {/* Tracking (read-only for customers) */}
          {hasTracking && (
            <TrackingCard
              trackingNumber={trackingNumber}
              trackingCarrier={trackingCarrier}
            />
          )}

          {/* Invoice info */}
          {invoice && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Invoice</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-900">{invoice.invoice_number}</span>
                  <StatusBadge status={invoice.status} type="invoiceStatus" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-sm text-slate-900">{formatPrice(invoice.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Amount Due</p>
                    <p className="text-sm text-slate-900">{formatPrice(invoice.amount_due || 0)}</p>
                  </div>
                </div>
                {invoice.invoice_access_token && (
                  <a
                    href={`/invoice/${invoice.invoice_access_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
                  >
                    View Invoice
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Artwork preview (Ghost orders only, read-only) */}
          {isGhost && order.mockup_image_url && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Your Label</h3>
              <img
                src={order.mockup_image_url}
                alt="Label preview"
                className="w-32 h-32 object-contain rounded-lg bg-slate-50 border border-slate-200"
              />
              {order.artwork_status && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-slate-500">Status:</span>
                  <StatusBadge status={order.artwork_status} type="artwork" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Help */}
          {/* Actions */}
          {canCancel && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Actions</h3>
              <button
                onClick={() => setShowCancelDialog(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <XCircle className="w-4 h-4" /> Cancel Order
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Need Help?</h3>
            <div className="space-y-2">
              <Link
                href={`/support/tickets/new?orderId=${orderId}&orderNumber=${orderNumber}`}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <AlertCircle className="w-4 h-4" /> Report an Issue
              </Link>
              {isGhost && (
                <a
                  href={`${process.env.NEXT_PUBLIC_SITE_URL || ""}/build`}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-brand-600 hover:bg-brand-50 transition-colors"
                >
                  Reorder
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCancelDialog && (
        <CancellationDialog
          orderNumber={orderNumber}
          onConfirm={handleCancel}
          onCancel={() => setShowCancelDialog(false)}
          isLoading={cancelling}
        />
      )}
    </div>
  );
}
