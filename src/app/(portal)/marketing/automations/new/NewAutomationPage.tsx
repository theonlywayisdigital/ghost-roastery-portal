"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  Zap,
  Loader2,
  Plus,
  Clock,
  Sparkles,
  ArrowLeft,
  Mail,
  ShoppingCart,
  Star,
  Gift,
  UserPlus,
  RefreshCw,
  Building,
} from "@/components/icons";
import type { AutomationWithSteps, TriggerType } from "@/types/marketing";

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

export function NewAutomationPage() {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [templates, setTemplates] = useState<AutomationWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/automations?templates=1&page_size=1`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {
      // Templates are optional — don't block the page
    }
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  async function handleCreateBlank() {
    setCreating("blank");
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
        setCreating(null);
      }
    } catch {
      setError("Failed to create automation. Please check your connection.");
      setCreating(null);
    }
  }

  async function handleSetUp(template: AutomationWithSteps) {
    setCreating(template.id);
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
        setCreating(null);
      }
    } catch {
      setError("Failed to create automation. Please check your connection.");
      setCreating(null);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`${pageBase}/automations`)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Automations
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create Automation</h1>
        <p className="text-slate-500 mt-1">Choose how you want to create your automation.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Three creation options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {/* Start from scratch */}
        <button
          onClick={handleCreateBlank}
          disabled={!!creating}
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all text-left disabled:opacity-50 group"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
            {creating === "blank" ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Plus className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Start from Scratch</h3>
          <p className="text-xs text-slate-500">
            Create a blank automation and build your own trigger, emails, delays, and conditions.
          </p>
        </button>

        {/* Choose a template */}
        <a
          href="#templates"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Choose a Template</h3>
          <p className="text-xs text-slate-500">
            Start with a pre-built automation and customise it to fit your needs.
          </p>
        </a>

        {/* Create with AI */}
        <button
          onClick={() => router.push(`${pageBase}/automations/ai-builder`)}
          className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-6 hover:border-violet-300 hover:shadow-sm transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4 group-hover:bg-violet-200 transition-colors">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Create with AI</h3>
          <p className="text-xs text-slate-500">
            Describe what you want and AI builds the entire automation — trigger, emails, delays, and conditions.
          </p>
        </button>
      </div>

      {/* Templates section */}
      <div id="templates">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pre-built automations you can set up with one click, or customise with AI.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 text-center py-12">
            <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No templates available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map((template) => {
              const meta = TRIGGER_META[template.trigger_type] || DEFAULT_TRIGGER_META;
              const Icon = meta.icon;
              const stepCount = template.steps?.length || 0;
              const isLoading = creating === template.id;

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
                      disabled={!!creating}
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
          </div>
        )}
      </div>
    </div>
  );
}
