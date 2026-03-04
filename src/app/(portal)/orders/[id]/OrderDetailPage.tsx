"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, FileText } from "lucide-react";
import { StatusBadge } from "@/components/admin";
import {
  FulfilmentStepper,
  GHOST_STEPS,
  WHOLESALE_STEPS,
  VALID_TRANSITIONS,
  DispatchModal,
  CancellationDialog,
  OrderSummaryCard,
  DeliveryAddressCard,
  CustomerDetailsCard,
  InvoiceCard,
  TrackingCard,
  ArtworkCard,
  ActivityTimeline,
  formatDateTime,
  formatPrice,
} from "@/components/shared/orders";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface OrderDetailPageProps {
  orderId: string;
  orderType: string;
}

export function OrderDetailPage({ orderId, orderType: initialType }: OrderDetailPageProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}?type=${initialType}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId, initialType]);

  async function refreshData() {
    const res = await fetch(`/api/orders/${orderId}?type=${initialType}`);
    setData(await res.json());
  }

  async function updateStatus(newStatus: string, extra?: { trackingNumber?: string; trackingCarrier?: string }) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      if (res.ok) await refreshData();
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDispatch(trackingNumber?: string, trackingCarrier?: string) {
    await updateStatus("dispatched", { trackingNumber, trackingCarrier });
    setShowDispatchModal(false);
  }

  async function handleTrackingSave(trackingNumber: string, trackingCarrier: string) {
    await fetch(`/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber, trackingCarrier }),
    });
    await refreshData();
  }

  async function handleCancel({ reason, reasonCategory }: { reason: string; reasonCategory: string }) {
    setUpdatingStatus(true);
    try {
      await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, reasonCategory }),
      });
      setShowCancelDialog(false);
      await refreshData();
    } finally {
      setUpdatingStatus(false);
    }
  }

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

  const { order, orderType, roasterOrder, invoice, activities = [] } = data;
  const isGhost = orderType === "ghost";
  const orderNumber = isGhost ? order.order_number : order.id.slice(0, 8).toUpperCase();
  const customerName = order.customer_name;
  const customerEmail = order.customer_email;
  const status = isGhost ? order.order_status : order.status;
  const totalPrice = isGhost ? order.partner_payout_total : order.roaster_payout || order.subtotal;
  const transitions = isGhost ? [] : (VALID_TRANSITIONS[status] || []);
  const isCancelled = status === "cancelled" || status === "Cancelled";

  return (
    <div>
      {/* Back link */}
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
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
            {`${formatDateTime(order.created_at)} · ${customerName || "Unknown"} · ${customerEmail} · ${formatPrice(totalPrice)}`}
          </p>
          {isCancelled && order.cancellation_reason && (
            <p className="text-sm text-red-600 mt-1">
              {`Cancellation reason: ${order.cancellation_reason}`}
            </p>
          )}
        </div>
      </div>

      {/* Fulfilment Stepper */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Fulfilment</h3>
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

        {/* Ghost order partner details */}
        {isGhost && roasterOrder && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            {roasterOrder.tracking_number && (
              <div>
                <p className="text-xs text-slate-500">Tracking</p>
                <p className="text-sm text-slate-900">
                  {`${roasterOrder.tracking_number}${roasterOrder.tracking_carrier ? ` (${roasterOrder.tracking_carrier})` : ""}`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Ghost payout info */}
        {isGhost && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Your Payout</p>
            <p className="text-lg font-semibold text-slate-900">{formatPrice(order.partner_payout_total || 0)}</p>
          </div>
        )}
      </div>

      {/* Layout: main + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <OrderSummaryCard order={order} orderType={orderType} showPayoutInfo />

          <DeliveryAddressCard address={order.delivery_address} />

          {isGhost && (
            <ArtworkCard order={order} />
          )}

          {!isGhost && (
            <InvoiceCard
              invoice={invoice}
              orderId={orderId}
              paymentMethod={order.payment_method}
              paymentTerms={order.payment_terms}
              createHref={`/orders/${orderId}/create-invoice?type=${orderType}`}
            />
          )}

          {/* Tracking (for wholesale dispatched/delivered) */}
          {!isGhost && (status === "dispatched" || status === "delivered") && (
            <TrackingCard
              trackingNumber={order.tracking_number}
              trackingCarrier={order.tracking_carrier}
              editable
              onSave={handleTrackingSave}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {!isCancelled && transitions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {transitions.filter((s) => s !== "cancelled").map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          if (s === "dispatched") {
                            setShowDispatchModal(true);
                          } else {
                            updateStatus(s);
                          }
                        }}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-brand-600 text-white hover:bg-brand-700"
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                    {!isGhost && transitions.includes("cancelled") && (
                      <button
                        onClick={() => setShowCancelDialog(true)}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {!isGhost && !invoice && (
                  <Link
                    href={`/orders/${orderId}/create-invoice?type=${orderType}`}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Create Invoice
                  </Link>
                )}

                <Link
                  href={`/support/tickets/new?orderId=${orderId}`}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <AlertCircle className="w-4 h-4" /> Report Issue
                </Link>
              </div>
            </div>
          )}

          <CustomerDetailsCard
            name={customerName}
            email={customerEmail}
            business={order.customer_business}
          />

          {activities.length > 0 && (
            <ActivityTimeline activities={activities} />
          )}
        </div>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <DispatchModal
          onConfirm={handleDispatch}
          onClose={() => setShowDispatchModal(false)}
          isLoading={updatingStatus}
        />
      )}

      {showCancelDialog && (
        <CancellationDialog
          orderNumber={orderNumber}
          onConfirm={handleCancel}
          onCancel={() => setShowCancelDialog(false)}
          isLoading={updatingStatus}
        />
      )}
    </div>
  );
}
