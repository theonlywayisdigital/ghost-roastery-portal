"use client";

import { useState, useEffect, useCallback } from "react";
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
  Sparkles,
} from "@/components/icons";
import type { Automation, AutomationWithSteps, TriggerType } from "@/types/marketing";

// ─── Template icon + color map ───────────────────────────────────────
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

export function AutomationsPage() {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [templates, setTemplates] = useState<AutomationWithSteps[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/automations`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        setAutomations(data.automations || []);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load automations.");
      }
    } catch {
      setError("Failed to load automations. Please check your connection.");
    }
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

  async function handleSetUp(template: AutomationWithSteps) {
    setSettingUp(template.id);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: template.id }),
      });
      if (res.ok) {
        const { automation } = await res.json();
        router.push(`${pageBase}/automations/${automation.id}/edit`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create automation.");
        setSettingUp(null);
      }
    } catch {
      setError("Failed to create automation. Please check your connection.");
      setSettingUp(null);
    }
  }

  async function handleCreateBlank() {
    setSettingUp("blank");
    setError(null);
    try {
      const res = await fetch(`${apiBase}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Automation", trigger_type: "custom" }),
      });
      if (res.ok) {
        const { automation } = await res.json();
        router.push(`${pageBase}/automations/${automation.id}/edit`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create automation.");
        setSettingUp(null);
      }
    } catch {
      setError("Failed to create automation. Please check your connection.");
      setSettingUp(null);
    }
  }

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
      const { automation: full } = await detailRes.json();

      const res = await fetch(`${apiBase}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${full.name} (copy)`,
          description: full.description,
          trigger_type: full.trigger_type,
          trigger_config: full.trigger_config,
        }),
      });
      if (res.ok) {
        const { automation: newAuto } = await res.json();
        // Copy steps
        if (full.steps && full.steps.length > 0) {
          for (const step of full.steps) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Builder CTA */}
      <div className="mb-8 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
          <Sparkles className="w-6 h-6 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Build with AI</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Describe what you want in plain English and AI builds the entire automation — trigger, emails, delays, and conditions.
          </p>
        </div>
        <button
          onClick={() => router.push(`${pageBase}/automations/ai-builder`)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Build with AI
        </button>
      </div>

      {/* Section 1: Templates */}
      <div className="mb-10">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Automation Templates</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pre-built automations you can set up with one click, or customise with AI.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((template) => {
            const meta = TRIGGER_META[template.trigger_type] || DEFAULT_TRIGGER_META;
            const Icon = meta.icon;
            const stepCount = template.steps?.length || 0;
            const isLoading = settingUp === template.id;

            return (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${meta.bg} ${meta.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                      {template.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {`${stepCount} step${stepCount !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                  {template.description || "Automated email sequence"}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSetUp(template)}
                    disabled={!!settingUp}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {isLoading ? "Setting up..." : "Set Up"}
                  </button>
                  <button
                    onClick={() => router.push(`${pageBase}/automations/ai-builder?brief=${encodeURIComponent(template.description || template.name)}`)}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 border border-violet-200 text-violet-600 rounded-lg text-xs font-medium hover:bg-violet-50 transition-colors"
                    title="Customise with AI"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Blank automation card */}
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-5 hover:border-slate-400 transition-all flex flex-col items-center justify-center text-center min-h-[180px]">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Start from Scratch</h3>
            <p className="text-xs text-slate-500 mb-4">Build a custom automation</p>
            <button
              onClick={handleCreateBlank}
              disabled={!!settingUp}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {settingUp === "blank" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {settingUp === "blank" ? "Creating..." : "Create Blank"}
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: My Automations */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">My Automations</h2>
          <p className="text-sm text-slate-500 mt-1">
            Your active, paused, and draft automations.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
          {automations.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-1">No automations yet</p>
              <p className="text-sm text-slate-500">
                Set up a template above or create a blank automation to get started.
              </p>
            </div>
          ) : (
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
                          <div className="relative">
                            {isLoadingAction ? (
                              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpen(menuOpen === automation.id ? null : automation.id);
                                }}
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            )}
                            {menuOpen === automation.id && (
                              <div
                                className="absolute right-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 w-44"
                                onClick={(e) => e.stopPropagation()}
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
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
