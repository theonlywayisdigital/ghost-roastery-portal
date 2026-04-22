"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Calendar,
  Pause,
  Play,
  X,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
} from "@/components/icons";
import { DataTable, FilterBar } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";

// ─── Types ───

interface StandingOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
}

interface BuyerUser {
  full_name: string | null;
  email: string;
}

interface WholesaleAccess {
  id: string;
  business_name: string;
  user_id: string;
  payment_terms: string;
  users: BuyerUser | BuyerUser[];
}

interface StandingOrder {
  id: string;
  roaster_id: string;
  wholesale_access_id: string;
  buyer_user_id: string;
  items: StandingOrderItem[];
  frequency: string;
  next_delivery_date: string;
  delivery_address: Record<string, string> | null;
  payment_terms: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  wholesale_access: WholesaleAccess;
}

interface HistoryEntry {
  id: string;
  standing_order_id: string;
  order_id: string | null;
  generated_at: string;
  status: string;
  error_message: string | null;
  summary: { buyer_name?: string; items_count?: number; total?: number } | null;
}

interface ProductOption {
  id: string;
  name: string;
  wholesale_price: number | null;
  weight_grams: number | null;
  variants: {
    id: string;
    unit: string | null;
    wholesale_price: number | null;
    weight_grams: number | null;
  }[];
}

interface BuyerOption {
  id: string;
  business_name: string;
  user_id: string;
  payment_terms: string;
}

interface StandingOrdersTabProps {
  buyers: BuyerOption[];
}

// ─── Helpers ───

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getBuyerUser(wa: WholesaleAccess): BuyerUser | null {
  if (!wa.users) return null;
  return Array.isArray(wa.users) ? wa.users[0] || null : wa.users;
}

// ─── Filters ───

const filters: FilterConfig[] = [
  { key: "search", label: "Search standing orders...", type: "search" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "paused", label: "Paused" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  {
    key: "frequency",
    label: "Frequency",
    type: "select",
    options: [
      { value: "weekly", label: "Weekly" },
      { value: "fortnightly", label: "Fortnightly" },
      { value: "monthly", label: "Monthly" },
    ],
  },
];

// ─── Main Component ───

export function StandingOrdersTab({ buyers }: StandingOrdersTabProps) {
  const [orders, setOrders] = useState<StandingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState("next_delivery_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{
    generated: number;
    failed: number;
  } | null>(null);

  // Detail panel
  const [selectedOrder, setSelectedOrder] = useState<StandingOrder | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/standing-orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.standingOrders || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/standing-orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.standingOrder);
        setSelectedHistory(data.history || []);
      }
    } catch {
      // ignore
    }
    setDetailLoading(false);
  }, []);

  // ─── Due orders count ───
  const today = new Date().toISOString().split("T")[0];
  const dueCount = orders.filter(
    (o) => o.status === "active" && o.next_delivery_date <= today
  ).length;

  // ─── Filtering & sorting ───
  const filtered = orders.filter((o) => {
    if (filterValues.status && o.status !== filterValues.status) return false;
    if (filterValues.frequency && o.frequency !== filterValues.frequency)
      return false;
    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      const buyerName = o.wholesale_access?.business_name?.toLowerCase() || "";
      if (!buyerName.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: string | number = "";
    let vb: string | number = "";
    switch (sortKey) {
      case "buyer":
        va = a.wholesale_access?.business_name || "";
        vb = b.wholesale_access?.business_name || "";
        break;
      case "frequency":
        va = a.frequency;
        vb = b.frequency;
        break;
      case "next_delivery_date":
        va = a.next_delivery_date;
        vb = b.next_delivery_date;
        break;
      case "items":
        va = Array.isArray(a.items) ? a.items.length : 0;
        vb = Array.isArray(b.items) ? b.items.length : 0;
        break;
      case "status":
        va = a.status;
        vb = b.status;
        break;
      default:
        va = a.next_delivery_date;
        vb = b.next_delivery_date;
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // ─── Actions ───
  async function handlePauseResume(id: string, newStatus: "active" | "paused") {
    await fetch(`/api/standing-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrders();
    if (selectedOrder?.id === id) {
      setSelectedOrder((prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );
    }
  }

  async function handleCancel(id: string) {
    await fetch(`/api/standing-orders/${id}`, { method: "DELETE" });
    fetchOrders();
    if (selectedOrder?.id === id) {
      setSelectedOrder(null);
    }
  }

  async function handleGenerateAll() {
    setGenerating(true);
    try {
      const res = await fetch("/api/standing-orders/generate", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setGenerateResult({ generated: data.generated, failed: data.failed });
        fetchOrders();
      }
    } catch {
      // ignore
    }
    setGenerating(false);
  }

  async function handleGenerateSingle(id: string) {
    const res = await fetch(`/api/standing-orders/${id}/generate`, {
      method: "POST",
    });
    if (res.ok) {
      fetchOrders();
      if (selectedOrder?.id === id) {
        fetchDetail(id);
      }
    }
  }

  // ─── Columns ───
  const columns: Column<StandingOrder>[] = [
    {
      key: "buyer",
      label: "Buyer",
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-900">
            {row.wholesale_access?.business_name || "Unknown"}
          </p>
          <p className="text-xs text-slate-500">
            {getBuyerUser(row.wholesale_access)?.email || ""}
          </p>
        </div>
      ),
    },
    {
      key: "items",
      label: "Items",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => {
        const items = Array.isArray(row.items) ? row.items : [];
        const total = items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );
        return (
          <div>
            <p className="text-sm text-slate-700">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-slate-500">
              {"\u00A3"}
              {total.toFixed(2)}
            </p>
          </div>
        );
      },
    },
    {
      key: "frequency",
      label: "Frequency",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-700">
          {FREQ_LABELS[row.frequency] || row.frequency}
        </span>
      ),
    },
    {
      key: "next_delivery_date",
      label: "Next Delivery",
      sortable: true,
      render: (row) => {
        const isDue = row.status === "active" && row.next_delivery_date <= today;
        return (
          <span
            className={`text-sm ${isDue ? "text-amber-600 font-medium" : "text-slate-700"}`}
          >
            {formatDate(row.next_delivery_date)}
            {isDue && " (due)"}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <StandingOrderStatusBadge status={row.status} />,
    },
  ];

  return (
    <div>
      {/* Header actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {dueCount > 0 && (
            <button
              onClick={() => setShowGenerateConfirm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Generate Due Orders ({dueCount})
            </button>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Standing Order
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <FilterBar
          filters={filters}
          values={filterValues}
          onChange={(key, value) =>
            setFilterValues((prev) => ({ ...prev, [key]: value }))
          }
          onClear={() => setFilterValues({})}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={sorted}
        sortKey={sortKey}
        sortDirection={sortDir}
        onSort={(key) => {
          if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          } else {
            setSortKey(key);
            setSortDir("asc");
          }
        }}
        onRowClick={(row) => {
          setSelectedOrder(row);
          fetchDetail(row.id);
        }}
        isLoading={loading}
        emptyMessage="No standing orders yet. Create one to automate recurring wholesale deliveries."
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateStandingOrderModal
          buyers={buyers}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchOrders();
          }}
        />
      )}

      {/* Generate Confirmation Modal */}
      {showGenerateConfirm && (
        <GenerateConfirmModal
          dueCount={dueCount}
          generating={generating}
          result={generateResult}
          onGenerate={() => {
            setGenerateResult(null);
            handleGenerateAll();
          }}
          onClose={() => {
            setShowGenerateConfirm(false);
            setGenerateResult(null);
          }}
        />
      )}

      {/* Detail Side Panel */}
      {selectedOrder && (
        <StandingOrderDetailPanel
          order={selectedOrder}
          history={selectedHistory}
          loading={detailLoading}
          onClose={() => {
            setSelectedOrder(null);
            setSelectedHistory([]);
          }}
          onPauseResume={(status) =>
            handlePauseResume(selectedOrder.id, status)
          }
          onCancel={() => handleCancel(selectedOrder.id)}
          onGenerate={() => handleGenerateSingle(selectedOrder.id)}
        />
      )}
    </div>
  );
}

// ─── Status Badge ───

function StandingOrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-green-50 text-green-700" },
    paused: { label: "Paused", className: "bg-yellow-50 text-yellow-700" },
    cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
  };
  const c = config[status] || { label: status, className: "bg-slate-100 text-slate-500" };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}
    >
      {c.label}
    </span>
  );
}

// ─── Generate Confirm Modal ───

function GenerateConfirmModal({
  dueCount,
  generating,
  result,
  onGenerate,
  onClose,
}: {
  dueCount: number;
  generating: boolean;
  result: { generated: number; failed: number } | null;
  onGenerate: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Generate Due Orders
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                {result.generated} order(s) generated successfully.
              </p>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  {result.failed} order(s) failed. Check history for details.
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-4">
              This will generate wholesale orders for{" "}
              <strong>{dueCount}</strong> standing order(s) that are due. Each
              will create a new order with stock deduction, invoice, and email.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={generating}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={onGenerate}
                disabled={generating}
                className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Detail Side Panel ───

function StandingOrderDetailPanel({
  order,
  history,
  loading,
  onClose,
  onPauseResume,
  onCancel,
  onGenerate,
}: {
  order: StandingOrder;
  history: HistoryEntry[];
  loading: boolean;
  onClose: () => void;
  onPauseResume: (status: "active" | "paused") => void;
  onCancel: () => void;
  onGenerate: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  // Fetch product names for items
  useEffect(() => {
    const items = Array.isArray(order.items) ? order.items : [];
    const ids = items.map((i) => i.productId).filter(Boolean);
    if (ids.length === 0) return;

    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {};
        for (const p of data.products || []) {
          map[p.id] = p.name;
        }
        setProductNames(map);
      })
      .catch(() => {});
  }, [order.items]);

  const items = Array.isArray(order.items) ? order.items : [];
  const total = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const buyerUser = getBuyerUser(order.wholesale_access);
  const today = new Date().toISOString().split("T")[0];
  const isDue = order.status === "active" && order.next_delivery_date <= today;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Standing Order
            </h2>
            <p className="text-sm text-slate-500">
              {order.wholesale_access?.business_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Status & Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <StandingOrderStatusBadge status={order.status} />
              {order.status === "active" && (
                <>
                  <button
                    onClick={() => onPauseResume("paused")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                  {isDue && (
                    <button
                      onClick={async () => {
                        setGenerating(true);
                        await onGenerate();
                        setGenerating(false);
                      }}
                      disabled={generating}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                    >
                      {generating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      Generate Now
                    </button>
                  )}
                </>
              )}
              {order.status === "paused" && (
                <button
                  onClick={() => onPauseResume("active")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </button>
              )}
              {order.status !== "cancelled" && (
                <button
                  onClick={onCancel}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Buyer</p>
                <p className="text-sm font-medium text-slate-900">
                  {order.wholesale_access?.business_name}
                </p>
                <p className="text-xs text-slate-500">
                  {buyerUser?.email}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Frequency</p>
                <p className="text-sm font-medium text-slate-900">
                  {FREQ_LABELS[order.frequency] || order.frequency}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Next Delivery</p>
                <p
                  className={`text-sm font-medium ${isDue ? "text-amber-600" : "text-slate-900"}`}
                >
                  {formatDate(order.next_delivery_date)}
                  {isDue && " (due)"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Payment Terms</p>
                <p className="text-sm font-medium text-slate-900 uppercase">
                  {order.payment_terms}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Created</p>
                <p className="text-sm text-slate-700">
                  {formatDate(order.created_at)}
                </p>
              </div>
              {order.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Delivery Address */}
            {order.delivery_address && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Delivery Address
                </h3>
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                  {[
                    order.delivery_address.address_line_1,
                    order.delivery_address.address_line_2,
                    order.delivery_address.city,
                    order.delivery_address.county,
                    order.delivery_address.postcode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            )}

            {/* Items */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Items ({items.length})
              </h3>
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {productNames[item.productId] || item.productId.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {"\u00A3"}
                      {(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                  <p className="text-sm font-medium text-slate-700">Total</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {"\u00A3"}
                    {total.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* History */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Generation History
              </h3>
              {history.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No orders generated yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      {h.status === "success" ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : h.status === "failed" ? (
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">
                          {h.status === "success"
                            ? `Order generated${h.summary?.total ? ` — \u00A3${Number(h.summary.total).toFixed(2)}` : ""}`
                            : h.status === "failed"
                              ? `Failed: ${h.error_message || "Unknown error"}`
                              : "Skipped"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(h.generated_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Standing Order Modal ───

function CreateStandingOrderModal({
  buyers,
  onClose,
  onCreated,
}: {
  buyers: BuyerOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [buyerId, setBuyerId] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [nextDate, setNextDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [paymentTerms, setPaymentTerms] = useState("net30");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    { productId: string; variantId: string; quantity: number; unitPrice: number }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Products state
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Addresses state
  const [addresses, setAddresses] = useState<
    { id: string; label: string | null; address_line_1: string; city: string; postcode: string; country: string; address_line_2?: string; county?: string }[]
  >([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");

  // Load products
  useEffect(() => {
    if (productsLoaded) return;
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        const mapped = (data.products || [])
          .filter(
            (p: { is_wholesale: boolean; status: string }) =>
              p.is_wholesale && p.status === "published"
          )
          .map(
            (p: {
              id: string;
              name: string;
              wholesale_price: number | null;
              weight_grams: number | null;
              product_variants: {
                id: string;
                unit: string | null;
                wholesale_price: number | null;
                weight_grams: number | null;
                channel: string;
                is_active: boolean;
              }[];
            }) => ({
              id: p.id,
              name: p.name,
              wholesale_price: p.wholesale_price,
              weight_grams: p.weight_grams,
              variants: (p.product_variants || [])
                .filter(
                  (v: { channel: string; is_active: boolean }) =>
                    v.channel === "wholesale" && v.is_active
                )
                .map(
                  (v: {
                    id: string;
                    unit: string | null;
                    wholesale_price: number | null;
                    weight_grams: number | null;
                  }) => ({
                    id: v.id,
                    unit: v.unit,
                    wholesale_price: v.wholesale_price,
                    weight_grams: v.weight_grams,
                  })
                ),
            })
          );
        setProducts(mapped);
        setProductsLoaded(true);
      })
      .catch(() => {});
  }, [productsLoaded]);

  // Load buyer addresses when buyer changes
  useEffect(() => {
    if (!buyerId) {
      setAddresses([]);
      return;
    }
    fetch(`/api/wholesale-buyers/${buyerId}/addresses`)
      .then((r) => r.json())
      .then((data) => {
        setAddresses(data.addresses || []);
        const defaultAddr = (data.addresses || []).find(
          (a: { is_default: boolean }) => a.is_default
        );
        if (defaultAddr) setSelectedAddress(defaultAddr.id);
      })
      .catch(() => {});

    // Set payment terms from buyer
    const buyer = buyers.find((b) => b.id === buyerId);
    if (buyer?.payment_terms) setPaymentTerms(buyer.payment_terms);
  }, [buyerId, buyers]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { productId: "", variantId: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(
    index: number,
    field: string,
    value: string | number
  ) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };

        // Auto-fill price when product/variant changes
        if (field === "productId") {
          const product = products.find((p) => p.id === value);
          if (product) {
            updated.unitPrice = product.wholesale_price || 0;
            updated.variantId = "";
            if (product.variants.length === 1) {
              updated.variantId = product.variants[0].id;
              if (product.variants[0].wholesale_price != null) {
                updated.unitPrice = product.variants[0].wholesale_price;
              }
            }
          }
        }
        if (field === "variantId" && value) {
          const product = products.find((p) => p.id === updated.productId);
          const variant = product?.variants.find(
            (v) => v.id === value
          );
          if (variant?.wholesale_price != null) {
            updated.unitPrice = variant.wholesale_price;
          }
        }
        return updated;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!buyerId) {
      setError("Please select a buyer");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one item");
      return;
    }
    if (items.some((i) => !i.productId)) {
      setError("Please select a product for each item");
      return;
    }

    setSaving(true);
    try {
      const addr = addresses.find((a) => a.id === selectedAddress);
      const res = await fetch("/api/standing-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wholesaleAccessId: buyerId,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId || undefined,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          frequency,
          nextDeliveryDate: nextDate,
          deliveryAddress: addr
            ? {
                address_line_1: addr.address_line_1,
                address_line_2: addr.address_line_2 || "",
                city: addr.city,
                county: addr.county || "",
                postcode: addr.postcode,
                country: addr.country,
              }
            : undefined,
          paymentTerms,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create standing order");
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
    setSaving(false);
  }

  const total = items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-slate-900">
            New Standing Order
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Buyer */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Wholesale Buyer
            </label>
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Select a buyer...</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.business_name}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency & Next Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                First Delivery Date
              </label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Payment Terms
            </label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="net7">Net 7</option>
              <option value="net14">Net 14</option>
              <option value="net30">Net 30</option>
            </select>
          </div>

          {/* Delivery Address */}
          {buyerId && addresses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Delivery Address
              </label>
              <select
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">No address</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label || a.address_line_1} — {a.city}, {a.postcode}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Order Items
              </label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <button
                type="button"
                onClick={addItem}
                className="w-full p-4 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
              >
                + Add first item
              </button>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const product = products.find(
                    (p) => p.id === item.productId
                  );
                  return (
                    <div
                      key={index}
                      className="bg-slate-50 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex gap-2">
                        <select
                          value={item.productId}
                          onChange={(e) =>
                            updateItem(index, "productId", e.target.value)
                          }
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {product && product.variants.length > 1 && (
                        <select
                          value={item.variantId}
                          onChange={(e) =>
                            updateItem(index, "variantId", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Select variant...</option>
                          {product.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.unit || "Default"} —{" "}
                              {v.wholesale_price != null
                                ? `\u00A3${v.wholesale_price.toFixed(2)}`
                                : "No price"}
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 uppercase">
                            Qty
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 uppercase">
                            Unit Price ({"\u00A3"})
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div className="w-24 text-right">
                          <label className="text-[10px] text-slate-400 uppercase">
                            Subtotal
                          </label>
                          <p className="px-3 py-2 text-sm font-medium text-slate-900">
                            {"\u00A3"}
                            {(item.unitPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <p className="text-sm font-semibold text-slate-900">
                    Total: {"\u00A3"}
                    {total.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
              placeholder="Internal notes for this standing order..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Standing Order"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
