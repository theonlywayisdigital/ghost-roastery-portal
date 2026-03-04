"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Send,
  MessageSquare,
  XCircle,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { StatusBadge } from "@/components/admin";
import {
  FulfilmentStepper,
  GHOST_STEPS,
  WHOLESALE_STEPS,
  OrderSummaryCard,
  DeliveryAddressCard,
  CustomerDetailsCard,
  ArtworkCard,
  InvoiceCard,
  TrackingCard,
  PayoutCard,
  PartnerAllocationCard,
  ActivityTimeline,
  EmailDialog,
  DispatchModal,
  RefundModal,
  CancellationDialog,
  formatDateTime,
  formatPrice,
} from "@/components/shared/orders";
import type { OrderType } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface OrderDetailClientProps {
  orderType: OrderType;
  order: any;
  roaster?: any;
  roasterOrder?: any;
  label?: any;
  invoice?: any;
  activities: any[];
  communications: any[];
  refunds?: any[];
}

export function OrderDetailClient({
  orderType,
  order,
  roaster,
  roasterOrder,
  label,
  invoice,
  activities,
  communications,
  refunds = [],
}: OrderDetailClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isGhost = orderType === "ghost";
  const orderNumber = isGhost ? order.order_number : order.id.slice(0, 8).toUpperCase();
  const customerEmail = order.customer_email;
  const customerName = order.customer_name;
  const status = isGhost ? order.order_status : order.status;
  const totalPrice = isGhost ? order.total_price : order.subtotal;
  const isCancelled = status === "cancelled" || status === "Cancelled";

  const ghostStatuses = [
    "Pending", "Artwork Review", "Approved", "Allocated", "Accepted",
    "In Production", "Processing", "Dispatched", "Delivered", "Cancelled", "Disputed",
  ];
  const wholesaleStatuses = [
    "pending", "confirmed", "processing", "dispatched", "delivered", "cancelled",
  ];

  async function handleStatusChange(newStatus: string) {
    setIsSaving(true);
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderType, status: newStatus }),
      });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArtworkAction(artworkStatus: string) {
    setIsSaving(true);
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderType, artworkStatus }),
      });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddNote(text: string) {
    const res = await fetch(`/api/admin/orders/${order.id}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: text, orderType }),
    });
    const data = await res.json();
    return data.activity;
  }

  async function handleDispatch(trackingNumber?: string, trackingCarrier?: string) {
    setIsSaving(true);
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          status: isGhost ? "Dispatched" : "dispatched",
          trackingNumber,
          trackingCarrier,
        }),
      });
      setShowDispatchModal(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTrackingSave(trackingNumber: string, trackingCarrier: string) {
    await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderType, trackingNumber, trackingCarrier }),
    });
    router.refresh();
  }

  async function handleCancel({ reason, reasonCategory }: { reason: string; reasonCategory: string }) {
    setIsSaving(true);
    try {
      await fetch(`/api/admin/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderType, reason, reasonCategory }),
      });
      setShowCancelDialog(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{orderNumber}</h1>
            <StatusBadge status={orderType} type="orderType" />
            <StatusBadge status={status} type="order" />
            {order.refund_status && order.refund_status !== "none" && (
              <StatusBadge status={order.refund_status} type="refundStatus" />
            )}
          </div>
          <p className="text-sm text-slate-500">
            {`${formatDateTime(order.created_at)} · ${customerName || "Unknown"} · ${customerEmail} · ${formatPrice(totalPrice)}`}
          </p>
          {roaster && (
            <p className="text-sm text-slate-400 mt-0.5">
              {`Roaster: ${roaster.business_name}${roasterOrder?.status ? ` (${roasterOrder.status})` : ""}`}
            </p>
          )}
          {isCancelled && order.cancellation_reason && (
            <p className="text-sm text-red-600 mt-1">
              {`Cancellation reason: ${order.cancellation_reason}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isSaving}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {(isGhost ? ghostStatuses : wholesaleStatuses).map((s) => (
              <option key={s} value={s}>
                {isGhost ? s : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
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
      </div>

      {/* Layout: main + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <OrderSummaryCard order={order} orderType={orderType} showPayoutInfo />

          <DeliveryAddressCard address={order.delivery_address} />

          {isGhost && (
            <ArtworkCard
              order={order}
              label={label}
              showActions
              onArtworkAction={handleArtworkAction}
              isLoading={isSaving}
            />
          )}

          {isGhost && (
            <PartnerAllocationCard
              roaster={roaster}
              roasterOrder={roasterOrder}
              orderId={order.id}
              onAllocate={() => router.refresh()}
            />
          )}

          {!isGhost && (
            <InvoiceCard
              invoice={invoice}
              orderId={order.id}
              paymentMethod={order.payment_method}
              paymentTerms={order.payment_terms}
              createHref={`/admin/orders/${order.id}/create-invoice?type=${orderType}`}
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

          {/* Refund History */}
          {refunds.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Refund History</h3>
              <div className="space-y-3">
                {refunds.map((refund: any) => (
                  <div key={refund.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{formatPrice(refund.amount)}</span>
                        <StatusBadge status={refund.refund_type} type="refundType" />
                        <StatusBadge status={refund.status} type="refundStatus" />
                      </div>
                      <span className="text-xs text-slate-400">{formatDateTime(refund.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600">{refund.reason}</p>
                    {refund.stripe_refund_id && (
                      <p className="text-xs text-slate-400 mt-1">{`Stripe: ${refund.stripe_refund_id}`}</p>
                    )}
                    {refund.failed_reason && (
                      <p className="text-xs text-red-600 mt-1">{`Failed: ${refund.failed_reason}`}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Communications */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Communications</h3>
            <button
              onClick={() => setShowEmailDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm hover:bg-brand-100 transition-colors mb-4"
            >
              <Send className="w-4 h-4" /> Send Email
            </button>
            {communications.length === 0 ? (
              <p className="text-sm text-slate-400">No messages sent yet.</p>
            ) : (
              <div className="space-y-3">
                {communications.map((comm: any) => (
                  <div key={comm.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-900">{comm.subject}</p>
                      <span className="text-xs text-slate-400">{formatDateTime(comm.sent_at)}</span>
                    </div>
                    <p className="text-xs text-slate-500">{`To: ${comm.recipient_email}`}</p>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{comm.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <CustomerDetailsCard
            name={customerName}
            email={customerEmail}
            business={order.customer_business}
            userId={order.user_id}
            showAdminLink
          />

          {isGhost && (
            <PayoutCard
              payoutAmount={order.partner_payout_total}
              payoutStatus={order.payout_status}
              payoutBatchId={order.payout_batch_id}
              roasterName={roaster?.business_name}
            />
          )}

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-1">
              {isGhost && order.label_file_url && (
                <SidebarAction
                  label="Download Label"
                  icon={<Download className="w-4 h-4" />}
                  href={order.label_file_url}
                  external
                />
              )}
              {order.stripe_payment_id && (
                <SidebarAction
                  label="View in Stripe"
                  icon={<ExternalLink className="w-4 h-4" />}
                  href={`https://dashboard.stripe.com/payments/${order.stripe_payment_id}`}
                  external
                />
              )}
              {order.refund_status !== "full" && (
                <SidebarAction
                  label="Issue Refund"
                  icon={<RotateCcw className="w-4 h-4" />}
                  danger
                  onClick={() => setShowRefundModal(true)}
                />
              )}
              <SidebarAction
                label="Contact Customer"
                icon={<MessageSquare className="w-4 h-4" />}
                onClick={() => setShowEmailDialog(true)}
              />
              {!isCancelled && (
                <>
                  {!isGhost && status !== "dispatched" && status !== "delivered" && (
                    <SidebarAction
                      label="Mark Dispatched"
                      icon={<Download className="w-4 h-4" />}
                      onClick={() => setShowDispatchModal(true)}
                    />
                  )}
                  {status !== "Delivered" && status !== "delivered" && (
                    <SidebarAction
                      label="Cancel Order"
                      icon={<XCircle className="w-4 h-4" />}
                      danger
                      onClick={() => setShowCancelDialog(true)}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <ActivityTimeline
            activities={activities}
            allowNotes
            onAddNote={handleAddNote}
          />
        </div>
      </div>

      {/* Modals */}
      {showEmailDialog && (
        <EmailDialog
          orderId={order.id}
          orderType={orderType}
          recipientEmail={customerEmail}
          onClose={() => setShowEmailDialog(false)}
          onSent={() => { setShowEmailDialog(false); router.refresh(); }}
        />
      )}

      {showDispatchModal && (
        <DispatchModal
          onConfirm={handleDispatch}
          onClose={() => setShowDispatchModal(false)}
          isLoading={isSaving}
        />
      )}

      {showCancelDialog && (
        <CancellationDialog
          orderNumber={orderNumber}
          onConfirm={handleCancel}
          onCancel={() => setShowCancelDialog(false)}
          isLoading={isSaving}
        />
      )}

      {showRefundModal && (
        <RefundModal
          orderId={order.id}
          orderType={isGhost ? "ghost_roastery" : orderType}
          orderTotal={totalPrice}
          existingRefundTotal={order.refund_total || 0}
          hasStripePayment={!!order.stripe_payment_id}
          onClose={() => setShowRefundModal(false)}
          onRefunded={() => { setShowRefundModal(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function SidebarAction({ label, icon, onClick, href, external, danger }: {
  label: string; icon: React.ReactNode; onClick?: () => void;
  href?: string; external?: boolean; danger?: boolean;
}) {
  const cls = `flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left ${
    danger ? "text-red-600 hover:bg-red-50" : "text-slate-600 hover:bg-slate-50"
  }`;

  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={cls}>
        {icon} {label}
      </a>
    );
  }
  return <button onClick={onClick} className={cls}>{icon} {label}</button>;
}
