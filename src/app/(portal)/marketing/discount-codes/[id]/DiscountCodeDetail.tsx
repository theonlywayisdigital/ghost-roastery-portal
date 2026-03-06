"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMarketingContext } from "@/lib/marketing-context";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pause,
  Play,
  Copy,
  Trash2,
  Archive,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Users,
  TrendingUp,
  Tag,
} from "@/components/icons";
import type { DiscountCode, DiscountRedemption } from "@/types/marketing";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  paused: "bg-amber-50 text-amber-700",
  expired: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-500",
};

interface Stats {
  total_uses: number;
  total_discount_given: number;
  avg_order_value: number;
  total_revenue: number;
  unique_customers: number;
}

interface RedemptionRow extends DiscountRedemption {
  contacts?: { id: string; email: string; first_name: string | null; last_name: string | null } | null;
}

export function DiscountCodeDetail() {
  const params = useParams();
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const id = params.id as string;

  const [code, setCode] = useState<DiscountCode | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [redemptionsTotal, setRedemptionsTotal] = useState(0);
  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/discount-codes/${id}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setCode(data.code);
          setStats(data.stats);
        } else {
          setError("Discount code not found.");
        }
      })
      .catch(() => setError("Failed to load discount code."))
      .finally(() => setLoading(false));
  }, [id]);

  const loadRedemptions = useCallback(async () => {
    setLoadingRedemptions(true);
    try {
      const res = await fetch(
        `${apiBase}/discount-codes/${id}/redemptions?page=${redemptionsPage}`
      );
      if (res.ok) {
        const data = await res.json();
        setRedemptions(data.redemptions);
        setRedemptionsTotal(data.total);
      }
    } catch {
      // silent
    }
    setLoadingRedemptions(false);
  }, [id, redemptionsPage, apiBase]);

  useEffect(() => {
    loadRedemptions();
  }, [loadRedemptions]);

  async function handleToggleStatus() {
    if (!code) return;
    const newStatus = code.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`${apiBase}/discount-codes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setCode(data.code);
      }
    } catch {
      // silent
    }
  }

  async function handleArchive() {
    try {
      const res = await fetch(`${apiBase}/discount-codes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (res.ok) {
        router.push(`${pageBase}/discount-codes`);
      }
    } catch {
      // silent
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this discount code? This cannot be undone.")) return;
    try {
      const res = await fetch(`${apiBase}/discount-codes/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`${pageBase}/discount-codes`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete.");
      }
    } catch {
      setError("Failed to delete.");
    }
  }

  async function handleDuplicate() {
    if (!code) return;
    const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    try {
      const res = await fetch(`${apiBase}/discount-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: `${code.code}-${randomSuffix}`,
          description: code.description,
          discount_type: code.discount_type,
          discount_value: code.discount_value,
          currency: code.currency,
          minimum_order_value: code.minimum_order_value,
          maximum_discount: code.maximum_discount,
          applies_to: code.applies_to,
          product_ids: code.product_ids,
          usage_limit: code.usage_limit,
          usage_per_customer: code.usage_per_customer,
          starts_at: code.starts_at,
          expires_at: code.expires_at,
          auto_apply: false,
          first_order_only: code.first_order_only,
          status: "paused",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`${pageBase}/discount-codes/${data.code.id}`);
      }
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !code) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-600">{error || "Discount code not found."}</p>
      </div>
    );
  }

  function formatDiscount(): string {
    if (!code) return "";
    if (code.discount_type === "percentage") return `${code.discount_value}% off`;
    if (code.discount_type === "fixed_amount") return `£${Number(code.discount_value).toFixed(2)} off`;
    return "Free shipping";
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const redemptionsPages = Math.ceil(redemptionsTotal / 20);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={() => router.push(`${pageBase}/discount-codes`)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 mt-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-lg font-mono font-bold text-slate-900">
              {code.code}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[code.status] || "bg-slate-100 text-slate-600"}`}
            >
              {code.status}
            </span>
            {code.auto_apply && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                AUTO-APPLY
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {formatDiscount()}
            {code.description && ` — ${code.description}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`${pageBase}/discount-codes/${id}/edit`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          {(code.status === "active" || code.status === "paused") && (
            <button
              onClick={handleToggleStatus}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {code.status === "active" ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Activate
                </>
              )}
            </button>
          )}
          <button
            onClick={handleDuplicate}
            className="p-2 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          {code.status !== "archived" && (
            <button
              onClick={handleArchive}
              className="p-2 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50"
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          {code.used_count === 0 && (
            <button
              onClick={handleDelete}
              className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={ShoppingBag}
            label="Total Redemptions"
            value={String(stats.total_uses)}
          />
          <StatCard
            icon={Tag}
            label="Total Discount Given"
            value={`£${stats.total_discount_given.toFixed(2)}`}
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Order Value"
            value={stats.avg_order_value > 0 ? `£${stats.avg_order_value.toFixed(2)}` : "—"}
          />
          <StatCard
            icon={Users}
            label="Unique Customers"
            value={String(stats.unique_customers)}
          />
        </div>
      )}

      {/* Code Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Configuration</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <ConfigItem label="Discount Type" value={code.discount_type.replace("_", " ")} />
          <ConfigItem label="Discount Value" value={formatDiscount()} />
          <ConfigItem
            label="Min Order"
            value={code.minimum_order_value ? `£${Number(code.minimum_order_value).toFixed(2)}` : "None"}
          />
          <ConfigItem
            label="Max Discount"
            value={code.maximum_discount ? `£${Number(code.maximum_discount).toFixed(2)}` : "None"}
          />
          <ConfigItem label="Applies To" value={code.applies_to.replace(/_/g, " ")} />
          <ConfigItem label="First Order Only" value={code.first_order_only ? "Yes" : "No"} />
          <ConfigItem
            label="Usage"
            value={code.usage_limit ? `${code.used_count}/${code.usage_limit}` : `${code.used_count}/Unlimited`}
          />
          <ConfigItem label="Per Customer" value={String(code.usage_per_customer)} />
          <ConfigItem label="Source" value={code.source} />
          <ConfigItem label="Starts" value={formatDate(code.starts_at)} />
          <ConfigItem label="Expires" value={code.expires_at ? formatDate(code.expires_at) : "No expiry"} />
          <ConfigItem label="Created" value={formatDate(code.created_at)} />
        </div>
      </div>

      {/* Redemptions Table */}
      <div id="redemptions" className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Redemptions {redemptionsTotal > 0 && `(${redemptionsTotal})`}
          </h3>
        </div>
        {loadingRedemptions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : redemptions.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No redemptions yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Customer
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Order Value
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Discount
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                      Order
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {redemptions.map((r) => {
                    const contact = r.contacts as RedemptionRow["contacts"];
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-600">
                          {formatDate(r.redeemed_at)}
                        </td>
                        <td className="px-6 py-3">
                          {contact ? (
                            <Link
                              href={`/contacts/${contact.id}`}
                              className="text-sm text-brand-600 hover:underline"
                            >
                              {contact.first_name || contact.last_name
                                ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
                                : contact.email}
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-600">{r.customer_email}</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-900 font-medium">
                          £{Number(r.order_value).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-sm text-green-700 font-medium">
                          -£{Number(r.discount_amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-3">
                          {r.order_id ? (
                            <Link
                              href={`/orders`}
                              className="text-sm text-brand-600 hover:underline"
                            >
                              View order
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {redemptionsPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  {`Page ${redemptionsPage} of ${redemptionsPages}`}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setRedemptionsPage((p) => Math.max(1, p - 1))}
                    disabled={redemptionsPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRedemptionsPage((p) => Math.min(redemptionsPages, p + 1))}
                    disabled={redemptionsPage === redemptionsPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-500" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-900 capitalize">{value}</p>
    </div>
  );
}
