"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { RefreshCw, Pause, Play, X, Settings, Package } from "@/components/icons";
import { StatusBadge } from "@/components/admin";

interface StandingOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  name?: string;
}

interface StandingOrder {
  id: string;
  roaster_id: string;
  items: StandingOrderItem[];
  frequency: string;
  next_delivery_date: string;
  status: string;
  buyer_managed: boolean;
  preferred_delivery_day: string | null;
  created_by: string;
  payment_terms: string;
  created_at: string;
  roasters: {
    id: string;
    business_name: string;
    brand_logo_url: string | null;
  };
  wholesale_access: {
    id: string;
    business_name: string;
    payment_terms: string;
  };
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

export function MyStandingOrdersClient() {
  const [orders, setOrders] = useState<StandingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: "pause" | "resume" | "cancel";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/my-standing-orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.standingOrders || []);
      }
    } catch (err) {
      console.error("[my-standing-orders] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleAction(id: string, action: "pause" | "resume" | "cancel") {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/my-standing-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await loadOrders();
        setConfirmAction(null);
      }
    } catch (err) {
      console.error("[my-standing-orders] Action error:", err);
    } finally {
      setActionLoading(false);
    }
  }

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
        <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No standing orders</h3>
        <p className="text-slate-500">
          Standing orders will appear here when you set up recurring deliveries at checkout.
        </p>
      </div>
    );
  }

  const filtered =
    filter === "all"
      ? orders
      : orders.filter((o) => o.status === filter);

  const statusCounts = {
    all: orders.length,
    active: orders.filter((o) => o.status === "active").length,
    paused: orders.filter((o) => o.status === "paused").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "active", "paused", "cancelled"] as const).map((f) => {
          if (f !== "all" && statusCounts[f] === 0) return null;
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
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-xs opacity-70">{statusCounts[f]}</span>
            </button>
          );
        })}
      </div>

      {/* Standing order cards */}
      <div className="space-y-4">
        {filtered.map((so) => (
          <StandingOrderCard
            key={so.id}
            order={so}
            onPause={() => setConfirmAction({ id: so.id, action: "pause" })}
            onResume={() => setConfirmAction({ id: so.id, action: "resume" })}
            onCancel={() => setConfirmAction({ id: so.id, action: "cancel" })}
            onAdjust={() => setAdjustingId(so.id)}
          />
        ))}
      </div>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction.action}
          onConfirm={() => handleAction(confirmAction.id, confirmAction.action)}
          onClose={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}

      {/* Adjust Modal */}
      {adjustingId && (
        <AdjustModal
          order={orders.find((o) => o.id === adjustingId)!}
          onClose={() => setAdjustingId(null)}
          onSaved={() => {
            setAdjustingId(null);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}

function StandingOrderCard({
  order,
  onPause,
  onResume,
  onCancel,
  onAdjust,
}: {
  order: StandingOrder;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onAdjust: () => void;
}) {
  const totalPerOrder = order.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const firstItem = order.items[0];
  const itemSummary =
    order.items.length === 1
      ? `${firstItem?.name || "Product"} x ${firstItem?.quantity}`
      : `${order.items.length} products, ${totalItems} units`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start gap-4">
        {/* Roaster Logo */}
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {order.roasters?.brand_logo_url ? (
            <Image
              src={order.roasters.brand_logo_url}
              alt={order.roasters.business_name}
              width={48}
              height={48}
              className="w-full h-full object-contain"
            />
          ) : (
            <Package className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-slate-900">
              {order.roasters?.business_name || "Roaster"}
            </h3>
            <StatusBadge status={order.status} type="standingOrder" />
            {order.created_by === "buyer" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                Created by you
              </span>
            )}
          </div>

          <p className="text-sm text-slate-600 mb-1">{itemSummary}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>
              {FREQUENCY_LABELS[order.frequency] || order.frequency}
            </span>
            <span>&pound;{totalPerOrder.toFixed(2)} per order</span>
            {order.status === "active" && order.next_delivery_date && (
              <span>
                Next:{" "}
                {new Date(order.next_delivery_date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
            {order.preferred_delivery_day && (
              <span>
                {DAY_LABELS[order.preferred_delivery_day] || order.preferred_delivery_day}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {order.status === "active" && (
            <>
              {order.buyer_managed && (
                <button
                  onClick={onAdjust}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  title="Adjust"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onPause}
                className="p-2 rounded-lg text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
              <button
                onClick={onCancel}
                className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {order.status === "paused" && (
            <>
              <button
                onClick={onResume}
                className="p-2 rounded-lg text-green-500 hover:text-green-600 hover:bg-green-50"
                title="Resume"
              >
                <Play className="w-4 h-4" />
              </button>
              <button
                onClick={onCancel}
                className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  action,
  onConfirm,
  onClose,
  loading,
}: {
  action: "pause" | "resume" | "cancel";
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const config = {
    pause: {
      title: "Pause Standing Order",
      body: "This standing order will be paused. No new orders will be generated until you resume it.",
      confirm: "Pause",
      style: "bg-yellow-500 hover:bg-yellow-600 text-white",
    },
    resume: {
      title: "Resume Standing Order",
      body: "This standing order will be resumed and orders will be generated on schedule.",
      confirm: "Resume",
      style: "bg-green-600 hover:bg-green-700 text-white",
    },
    cancel: {
      title: "Cancel Standing Order",
      body: "This standing order will be permanently cancelled. This cannot be undone.",
      confirm: "Cancel Standing Order",
      style: "bg-red-600 hover:bg-red-700 text-white",
    },
  };

  const c = config[action];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{c.title}</h3>
        <p className="text-sm text-slate-600 mb-6">{c.body}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${c.style} disabled:opacity-50`}
          >
            {loading ? "Processing..." : c.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustModal({
  order,
  onClose,
  onSaved,
}: {
  order: StandingOrder;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quantity, setQuantity] = useState(
    order.items[0]?.quantity || 1
  );
  const [frequency, setFrequency] = useState(order.frequency);
  const [deliveryDay, setDeliveryDay] = useState(
    order.preferred_delivery_day || "none"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/my-standing-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          frequency,
          preferredDeliveryDay: deliveryDay !== "none" ? deliveryDay : "",
        }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Adjust Standing Order</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Quantity */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Quantity (per item)
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Frequency
            </label>
            <div className="flex gap-2">
              {([
                { value: "weekly", label: "Weekly" },
                { value: "fortnightly", label: "Fortnightly" },
                { value: "monthly", label: "Monthly" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    frequency === opt.value
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Day */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Preferred Delivery Day
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: "none", label: "No Preference" },
                { value: "monday", label: "Mon" },
                { value: "tuesday", label: "Tue" },
                { value: "wednesday", label: "Wed" },
                { value: "thursday", label: "Thu" },
                { value: "friday", label: "Fri" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDeliveryDay(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    deliveryDay === opt.value
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
