"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  Ticket,
  Search,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MoreHorizontal,
  Trash2,
  Copy,
  Eye,
  Pause,
  Play,
  Archive,
  X,
} from "@/components/icons";
import type { DiscountCode, DiscountCodesListResponse } from "@/types/marketing";
import { ActionMenu } from "@/components/admin";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "expired", label: "Expired" },
  { id: "archived", label: "Archived" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["id"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  paused: "bg-amber-50 text-amber-700",
  expired: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-500",
};

function formatDiscount(code: DiscountCode): string {
  if (code.discount_type === "percentage") {
    return `${code.discount_value}%`;
  }
  if (code.discount_type === "fixed_amount") {
    return `£${Number(code.discount_value).toFixed(2)}`;
  }
  return "Free shipping";
}

function formatUsage(code: DiscountCode): string {
  if (code.usage_limit) {
    return `${code.used_count}/${code.usage_limit}`;
  }
  return `${code.used_count}/∞`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatValidPeriod(code: DiscountCode): string {
  const start = code.starts_at ? formatDate(code.starts_at) : "—";
  const end = code.expires_at ? formatDate(code.expires_at) : "No expiry";
  return `${start} → ${end}`;
}

export function DiscountCodesList() {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [counts, setCounts] = useState({ all: 0, active: 0, paused: 0, expired: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuAnchors = useRef<Record<string, HTMLButtonElement | null>>({});

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      sort: sortField,
      order: sortOrder,
    });
    if (activeTab !== "all") params.set("status", activeTab);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`${apiBase}/discount-codes?${params}`);
      if (res.ok) {
        const data: DiscountCodesListResponse = await res.json();
        setCodes(data.codes);
        setTotal(data.total);
        setCounts(data.counts);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load discount codes.");
      }
    } catch {
      setError("Failed to load discount codes. Please check your connection.");
    }
    setLoading(false);
  }, [page, sortField, sortOrder, activeTab, search, apiBase]);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  async function handleToggleStatus(code: DiscountCode) {
    setMenuOpen(null);
    const newStatus = code.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`${apiBase}/discount-codes/${code.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setError(null);
        loadCodes();
      }
    } catch {
      setError("Failed to toggle discount code status");
    }
  }

  async function handleArchive(id: string) {
    setMenuOpen(null);
    try {
      const res = await fetch(`${apiBase}/discount-codes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (res.ok) {
        setError(null);
        loadCodes();
      }
    } catch {
      setError("Failed to archive discount code");
    }
  }

  async function handleDuplicate(id: string) {
    setMenuOpen(null);
    try {
      const res = await fetch(`${apiBase}/discount-codes/${id}`);
      if (!res.ok) return;
      const { code: original } = await res.json();

      const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const dupeRes = await fetch(`${apiBase}/discount-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: `${original.code}-${randomSuffix}`,
          description: original.description,
          discount_type: original.discount_type,
          discount_value: original.discount_value,
          currency: original.currency,
          minimum_order_value: original.minimum_order_value,
          maximum_discount: original.maximum_discount,
          applies_to: original.applies_to,
          product_ids: original.product_ids,
          usage_limit: original.usage_limit,
          usage_per_customer: original.usage_per_customer,
          starts_at: original.starts_at,
          expires_at: original.expires_at,
          auto_apply: false,
          first_order_only: original.first_order_only,
          status: "paused",
        }),
      });
      if (dupeRes.ok) {
        setError(null);
        loadCodes();
      }
    } catch {
      setError("Failed to duplicate discount code");
    }
  }

  async function handleDelete(id: string) {
    setMenuOpen(null);
    if (!confirm("Delete this discount code? This cannot be undone.")) return;
    try {
      const res = await fetch(`${apiBase}/discount-codes/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadCodes();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete discount code.");
      }
    } catch {
      setError("Failed to delete discount code.");
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm">
            Create and manage promotional discount codes for your storefront.
          </p>
        </div>
        <button
          onClick={() => router.push(`${pageBase}/discount-codes/new`)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Discount Code
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id as keyof typeof counts] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {`${tab.label}${count > 0 ? ` (${count})` : ""}`}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or description..."
            className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900 mb-1">No discount codes yet</p>
            <p className="text-sm text-slate-500 mb-4">
              {search
                ? "No discount codes matching your search."
                : "Create your first discount code to get started."}
            </p>
            {!search && (
              <button
                onClick={() => router.push(`${pageBase}/discount-codes/new`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Discount Code
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <SortableHeader label="Code" field="code" current={sortField} order={sortOrder} onSort={handleSort} />
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Description
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Discount
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Min Order
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Usage
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Valid Period
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 w-10">
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {codes.map((code) => (
                    <tr
                      key={code.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`${pageBase}/discount-codes/${code.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono font-semibold text-slate-800">
                            {code.code}
                          </span>
                          {code.auto_apply && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">
                              AUTO
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-slate-600 truncate max-w-[200px] block">
                          {code.description || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">
                          {formatDiscount(code)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-slate-600">
                          {code.minimum_order_value ? `£${Number(code.minimum_order_value).toFixed(2)}` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {formatUsage(code)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[code.status] || "bg-slate-100 text-slate-600"}`}>
                          {code.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-500">
                          {formatValidPeriod(code)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          ref={(el) => { menuAnchors.current[code.id] = el; }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === code.id ? null : code.id);
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <ActionMenu
                          anchorRef={{ current: menuAnchors.current[code.id] }}
                          open={menuOpen === code.id}
                          onClose={() => setMenuOpen(null)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(null);
                              router.push(`${pageBase}/discount-codes/${code.id}`);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(null);
                              router.push(`${pageBase}/discount-codes/${code.id}/edit`);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          {(code.status === "active" || code.status === "paused") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(code);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(code.id);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Duplicate
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(null);
                              router.push(`${pageBase}/discount-codes/${code.id}#redemptions`);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Redemptions
                          </button>
                          {code.status !== "archived" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(code.id);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              Archive
                            </button>
                          )}
                          {code.used_count === 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(code.id);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </ActionMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  {`Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}`}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
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

function SortableHeader({
  label,
  field,
  current,
  order,
  onSort,
  className = "",
}: {
  label: string;
  field: string;
  current: string;
  order: "asc" | "desc";
  onSort: (field: string) => void;
  className?: string;
}) {
  const isActive = current === field;
  return (
    <th
      className={`text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-slate-700 select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${isActive ? "text-brand-600" : "text-slate-300"}`} />
        {isActive && (
          <span className="text-brand-600">{order === "asc" ? "↑" : "↓"}</span>
        )}
      </div>
    </th>
  );
}
