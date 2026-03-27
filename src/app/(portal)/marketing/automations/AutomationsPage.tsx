"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  Zap,
  Loader2,
  Play,
  Pause,
  Trash2,
  Copy,
  MoreHorizontal,
  Users,
  CheckCircle,
  Mail,
  ShoppingCart,
  Star,
  Clock,
  Gift,
  UserPlus,
  RefreshCw,
  Building,
  Plus,
  X,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "@/components/icons";
import type { Automation, TriggerType } from "@/types/marketing";
import { ActionMenu } from "@/components/admin";

// ─── Trigger icon + color map ───────────────────────────────────────
const TRIGGER_META: Partial<Record<
  TriggerType,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
>> = {
  new_customer: { icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50" },
  post_purchase: { icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
  review_request: { icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  win_back: { icon: RefreshCw, color: "text-purple-600", bg: "bg-purple-50" },
  abandoned_cart: { icon: ShoppingCart, color: "text-red-600", bg: "bg-red-50" },
  wholesale_approved: { icon: Building, color: "text-indigo-600", bg: "bg-indigo-50" },
  birthday: { icon: Gift, color: "text-pink-600", bg: "bg-pink-50" },
  re_engagement: { icon: Mail, color: "text-orange-600", bg: "bg-orange-50" },
  custom: { icon: Zap, color: "text-slate-600", bg: "bg-slate-100" },
};

const DEFAULT_TRIGGER_META = { icon: Zap, color: "text-slate-600", bg: "bg-slate-100" };

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-green-50 text-green-700",
  paused: "bg-amber-50 text-amber-700",
};

const TRIGGER_LABELS: Partial<Record<TriggerType, string>> = {
  new_customer: "New Customer",
  post_purchase: "Post-Purchase",
  review_request: "Review Request",
  win_back: "Win-Back",
  abandoned_cart: "Abandoned Cart",
  wholesale_approved: "Wholesale Approved",
  birthday: "Birthday",
  re_engagement: "Re-engagement",
  custom: "Custom",
};

const PAGE_SIZE = 10;

export function AutomationsPage() {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuAnchors = useRef<Record<string, HTMLButtonElement | null>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      const res = await fetch(`${apiBase}/automations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations || []);
        setTotal(data.total || 0);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load automations.");
      }
    } catch {
      setError("Failed to load automations. Please check your connection.");
    }
    setLoading(false);
  }, [apiBase, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggleStatus(automation: Automation) {
    setMenuOpen(null);
    setActionLoading(automation.id);
    const newStatus = automation.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`${apiBase}/automations/${automation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === automation.id ? { ...a, status: newStatus } : a))
        );
      }
    } catch {
      // silent fail
    }
    setActionLoading(null);
  }

  async function handleDuplicate(automation: Automation) {
    setMenuOpen(null);
    setActionLoading(automation.id);
    try {
      // Fetch full automation with steps
      const detailRes = await fetch(`${apiBase}/automations/${automation.id}`);
      if (!detailRes.ok) return;
      const detail = await detailRes.json();
      const full = detail.automation;
      const steps = detail.steps || [];

      const res = await fetch(`${apiBase}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${full.name} (copy)`,
          description: full.description,
          trigger_type: full.trigger_type,
          trigger_config: full.trigger_config,
          trigger_filters: full.trigger_filters,
        }),
      });
      if (res.ok) {
        const { automation: newAuto } = await res.json();
        // Copy steps
        if (steps.length > 0) {
          for (const step of steps) {
            await fetch(`${apiBase}/automations/${newAuto.id}/steps`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                step_type: step.step_type,
                config: step.config,
              }),
            });
          }
        }
        loadData();
      }
    } catch {
      // silent fail
    }
    setActionLoading(null);
  }

  async function handleDelete(automation: Automation) {
    setMenuOpen(null);
    if (!confirm("Delete this automation? Active enrollments will be cancelled. This cannot be undone.")) return;
    setActionLoading(automation.id);
    try {
      const res = await fetch(`${apiBase}/automations/${automation.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAutomations((prev) => prev.filter((a) => a.id !== automation.id));
        setTotal((t) => t - 1);
      }
    } catch {
      // silent fail
    }
    setActionLoading(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading && automations.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automations</h1>
          <p className="text-slate-500 mt-1">Your active, paused, and draft automations.</p>
        </div>
        <button
          onClick={() => router.push(`${pageBase}/automations/new`)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Automation
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

      {/* Automations table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
        {automations.length === 0 && !loading ? (
          <div className="text-center py-16">
            <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900 mb-1">No automations yet</p>
            <p className="text-sm text-slate-500 mb-4">
              Create your first automation to get started.
            </p>
            <button
              onClick={() => router.push(`${pageBase}/automations/new`)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Automation
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Automation
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Trigger
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Steps
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Enrolled
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Completed
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Created
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 w-10">
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {automations.map((automation) => {
                    const meta = TRIGGER_META[automation.trigger_type] || DEFAULT_TRIGGER_META;
                    const Icon = meta.icon;
                    const isLoadingAction = actionLoading === automation.id;

                    return (
                      <tr
                        key={automation.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => router.push(`${pageBase}/automations/${automation.id}/edit`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg ${meta.bg} ${meta.color} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {automation.name}
                              </p>
                              {automation.description && (
                                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                  {automation.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                            {TRIGGER_LABELS[automation.trigger_type] || automation.trigger_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[automation.status] || STATUS_BADGE.draft}`}>
                            {automation.status === "active" && <Play className="w-3 h-3" />}
                            {automation.status === "paused" && <Pause className="w-3 h-3" />}
                            {automation.status === "draft" && <Pencil className="w-3 h-3" />}
                            {automation.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-slate-600">
                            {(automation as Automation & { step_count?: number }).step_count || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {automation.enrolled_count || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                            {automation.completed_count || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-slate-500">
                            {formatDate(automation.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isLoadingAction ? (
                            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                          ) : (
                            <button
                              ref={(el) => { menuAnchors.current[automation.id] = el; }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(menuOpen === automation.id ? null : automation.id);
                              }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          )}
                          <ActionMenu
                            anchorRef={{ current: menuAnchors.current[automation.id] }}
                            open={menuOpen === automation.id}
                            onClose={() => setMenuOpen(null)}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`${pageBase}/automations/${automation.id}/edit`);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            {automation.status !== "draft" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(automation);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                {automation.status === "active" ? (
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
                                handleDuplicate(automation);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Duplicate
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(automation);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </ActionMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  {`Showing ${(page - 1) * PAGE_SIZE + 1}\u2013${Math.min(page * PAGE_SIZE, total)} of ${total}`}
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
