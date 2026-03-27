"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  Mail,
  Clock,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Check,
  RefreshCw,
  Send,
  MessageSquare,
  AlertTriangle,
  Zap,
  Settings2,
  X,
} from "@/components/icons";
import type { EmailBlock } from "@/types/marketing";
import { EmailMiniPreview } from "../[id]/edit/EmailMiniPreview";

// ─── Types ───────────────────────────────────────────────────
interface GeneratedStep {
  step_type: "email" | "delay" | "condition";
  config: Record<string, unknown>;
}

interface GeneratedAutomation {
  name: string;
  description: string;
  trigger: {
    trigger_type: string;
    trigger_config: Record<string, unknown>;
    trigger_filters?: {
      groups: Array<{
        id: string;
        conditions: Array<{ id: string; field: string; operator: string; value: unknown }>;
      }>;
    };
  };
  steps: GeneratedStep[];
  notes?: string[];
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  retail_price: number | null;
}

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
}

const STEP_META: Record<string, { icon: typeof Mail; label: string; color: string; bg: string }> = {
  email: { icon: Mail, label: "Send Email", color: "text-blue-600", bg: "bg-blue-50" },
  delay: { icon: Clock, label: "Wait", color: "text-amber-600", bg: "bg-amber-50" },
  condition: { icon: GitBranch, label: "Condition", color: "text-purple-600", bg: "bg-purple-50" },
};

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "urgent", label: "Urgent" },
  { value: "luxury", label: "Luxury" },
] as const;

const PLACEHOLDER_EXAMPLES = `Examples:
• "Re-engage customers who haven't ordered in 60 days with a 6 week campaign, one email per week"
• "Welcome new wholesale buyers with a 3 email onboarding sequence over 2 weeks"
• "Send a review request 5 days after delivery, follow up once if no response"
• "When someone fills out the contact form, send a thank you immediately then follow up in 3 days"`;

// ─── Main Component ──────────────────────────────────────────
export function AIAutomationBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiBase, pageBase } = useMarketingContext();
  const initialBrief = searchParams.get("brief") || "";

  // Step state
  const [phase, setPhase] = useState<"describe" | "generating" | "review">(initialBrief ? "describe" : "describe");
  const [brief, setBrief] = useState(initialBrief);
  const [tone, setTone] = useState<string>("friendly");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [discountCodeId, setDiscountCodeId] = useState<string>("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [audienceHints, setAudienceHints] = useState("");

  // Context data
  const [products, setProducts] = useState<Product[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);

  // Generation state
  const [automation, setAutomation] = useState<GeneratedAutomation | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Refinement state
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineHistory, setRefineHistory] = useState<string[]>([]);

  // Saving state
  const [saving, setSaving] = useState(false);

  const refineInputRef = useRef<HTMLInputElement>(null);

  // Load context data
  useEffect(() => {
    async function loadContext() {
      const [prodRes, discRes] = await Promise.all([
        fetch("/api/products").then(r => r.ok ? r.json() : { products: [] }).catch(() => ({ products: [] })),
        fetch(`${apiBase}/discount-codes?status=active`).then(r => r.ok ? r.json() : { codes: [] }).catch(() => ({ codes: [] })),
      ]);
      setProducts(prodRes.products || []);
      setDiscountCodes(discRes.codes || []);
    }
    loadContext();
  }, []);

  // ── Generate ─────────────────────────────────────────────
  async function handleGenerate() {
    if (!brief.trim()) {
      setError("Please describe what you want the automation to do.");
      return;
    }

    setPhase("generating");
    setGenerating(true);
    setError(null);
    setRefineHistory([]);

    try {
      const res = await fetch("/api/ai/generate-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief.trim(),
          tone,
          discount_code_id: discountCodeId || undefined,
          product_ids: productIds.length > 0 ? productIds : undefined,
          audience_hints: audienceHints.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate automation.");
        setPhase("describe");
        setGenerating(false);
        return;
      }

      setAutomation(data.automation);
      setNotes(data.automation.notes || []);
      setPhase("review");
    } catch {
      setError("Failed to connect. Please try again.");
      setPhase("describe");
    }
    setGenerating(false);
  }

  // ── Refine ───────────────────────────────────────────────
  async function handleRefine() {
    if (!refineInput.trim() || !automation) return;

    setRefining(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/refine-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: refineInput.trim(),
          automation: {
            name: automation.name,
            description: automation.description,
            trigger: automation.trigger,
            steps: automation.steps,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to refine automation.");
        setRefining(false);
        return;
      }

      setRefineHistory(prev => [...prev, refineInput.trim()]);
      setAutomation(data.automation);
      setNotes(data.automation.notes || []);
      setRefineInput("");
    } catch {
      setError("Failed to connect. Please try again.");
    }
    setRefining(false);
  }

  // ── Regenerate single step ───────────────────────────────
  async function handleRegenerateStep(stepIndex: number) {
    if (!automation) return;

    const step = automation.steps[stepIndex];
    const stepLabel = step.step_type === "email"
      ? `email step ${stepIndex + 1} (subject: "${step.config.subject || "untitled"}")`
      : step.step_type === "delay"
        ? `delay step ${stepIndex + 1}`
        : `condition step ${stepIndex + 1}`;

    setRefining(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/refine-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: `Regenerate ${stepLabel} with fresh content. Keep the same step type and general purpose but rewrite the content completely.`,
          automation: {
            name: automation.name,
            description: automation.description,
            trigger: automation.trigger,
            steps: automation.steps,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.automation) {
        setAutomation(data.automation);
        setNotes(data.automation.notes || []);
      }
    } catch {
      setError("Failed to regenerate step.");
    }
    setRefining(false);
  }

  // ── Save to database ─────────────────────────────────────
  async function handleSave() {
    if (!automation) return;

    setSaving(true);
    setError(null);

    try {
      // 1. Create the automation
      const createRes = await fetch(`${apiBase}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: automation.name,
          description: automation.description,
          trigger_type: automation.trigger.trigger_type,
          trigger_config: automation.trigger.trigger_config,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        setError(data.error || "Failed to create automation.");
        setSaving(false);
        return;
      }

      const { automation: created } = await createRes.json();

      // 2. Save trigger_filters if any
      if (automation.trigger.trigger_filters?.groups?.length) {
        await fetch(`${apiBase}/automations/${created.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trigger_filters: automation.trigger.trigger_filters }),
        });
      }

      // 3. Add steps sequentially
      for (const step of automation.steps) {
        await fetch(`${apiBase}/automations/${created.id}/steps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step_type: step.step_type,
            config: step.config,
          }),
        });
      }

      // Navigate to the editor
      router.push(`${pageBase}/automations/${created.id}/edit`);
    } catch {
      setError("Failed to save automation. Please try again.");
      setSaving(false);
    }
  }

  // ── Describe Phase ───────────────────────────────────────
  if (phase === "describe") {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push(`${pageBase}/automations`)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              Build with AI
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Describe your automation and AI will build it for you</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Brief textarea */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Describe what you want this automation to do
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={5}
              placeholder={PLACEHOLDER_EXAMPLES}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-300 resize-none"
              autoFocus
            />
          </div>

          {/* Advanced options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {showAdvanced ? "Hide advanced options" : "Advanced options"}
              {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                {/* Tone */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          tone === t.value
                            ? "bg-violet-100 text-violet-700 border border-violet-200"
                            : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount code */}
                {discountCodes.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Include discount code</label>
                    <select
                      value={discountCodeId}
                      onChange={(e) => setDiscountCodeId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">None</option>
                      {discountCodes.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} ({d.discount_type === "percentage" ? `${d.discount_value}%` : d.discount_type === "fixed_amount" ? `£${d.discount_value}` : "Free shipping"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Products */}
                {products.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Feature products ({productIds.length} selected)
                    </label>
                    <div className="max-h-32 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2 bg-white">
                      {products.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productIds.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setProductIds(prev => [...prev, p.id]);
                              } else {
                                setProductIds(prev => prev.filter(id => id !== p.id));
                              }
                            }}
                            className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-xs text-slate-700">{p.name}</span>
                          {p.retail_price && <span className="text-xs text-slate-400 ml-auto">{`£${p.retail_price}`}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audience hints */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Target audience (optional)</label>
                  <input
                    value={audienceHints}
                    onChange={(e) => setAudienceHints(e.target.value)}
                    placeholder="e.g. wholesale buyers in London, new subscribers from website..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!brief.trim() || generating}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Build Automation
          </button>
        </div>
      </div>
    );
  }

  // ── Generating Phase ─────────────────────────────────────
  if (phase === "generating") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => { setPhase("describe"); setGenerating(false); }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Building your automation...</h1>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-violet-600 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-2">AI is building your automation</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Choosing the right trigger, writing email content, setting up delays and conditions...
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
              <span className="text-xs text-slate-400">This usually takes 10-20 seconds</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Review Phase ─────────────────────────────────────────
  if (!automation) return null;

  const emailStepCount = automation.steps.filter(s => s.step_type === "email").length;
  const delayStepCount = automation.steps.filter(s => s.step_type === "delay").length;
  const conditionStepCount = automation.steps.filter(s => s.step_type === "condition").length;

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPhase("describe")}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{automation.name}</h1>
            <p className="text-sm text-slate-500">{automation.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPhase("describe"); setAutomation(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? "Saving..." : "Save & Edit"}
          </button>
        </div>
      </div>

      {/* AI banner */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-violet-900">AI-generated automation</p>
          <p className="text-xs text-violet-600 mt-0.5">
            Review and tweak below, then save to open in the full editor. Every part is editable after saving.
          </p>
        </div>
      </div>

      {/* Notes from AI */}
      {notes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 space-y-1">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">AI Notes</p>
          {notes.map((note, i) => (
            <p key={i} className="text-sm text-amber-700">{note}</p>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-4 mb-6 px-1">
        <div className="text-xs text-slate-500">
          <span className="font-medium text-slate-900">{emailStepCount}</span> email{emailStepCount !== 1 ? "s" : ""}
        </div>
        <div className="text-xs text-slate-500">
          <span className="font-medium text-slate-900">{delayStepCount}</span> delay{delayStepCount !== 1 ? "s" : ""}
        </div>
        {conditionStepCount > 0 && (
          <div className="text-xs text-slate-500">
            <span className="font-medium text-slate-900">{conditionStepCount}</span> condition{conditionStepCount !== 1 ? "s" : ""}
          </div>
        )}
        <div className="text-xs text-slate-500">
          Trigger: <span className="font-medium text-slate-900 capitalize">{automation.trigger.trigger_type.replace(/_/g, " ")}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Workflow */}
      <div className="space-y-0">
        {/* Trigger card */}
        <div className="rounded-xl border-2 border-dashed bg-emerald-50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Trigger</p>
            <p className="text-sm font-semibold text-slate-900 capitalize">
              {automation.trigger.trigger_type.replace(/_/g, " ")}
            </p>
            {Object.keys(automation.trigger.trigger_config || {}).length > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                {formatTriggerConfig(automation.trigger.trigger_config)}
              </p>
            )}
          </div>
          {automation.trigger.trigger_filters?.groups && automation.trigger.trigger_filters.groups.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded-full">
              {automation.trigger.trigger_filters.groups.reduce((s, g) => s + g.conditions.length, 0)} filter{automation.trigger.trigger_filters.groups.reduce((s, g) => s + g.conditions.length, 0) !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Steps */}
        {automation.steps.map((step, index) => {
          const meta = STEP_META[step.step_type] || STEP_META.email;
          const StepIcon = meta.icon;
          const isExpanded = expandedStep === index;

          return (
            <div key={index}>
              {/* Connector */}
              <div className="flex justify-center">
                <div className="w-px h-5 bg-slate-200" />
              </div>

              {/* Step card */}
              <div className={`rounded-xl border bg-white transition-all ${
                isExpanded ? "border-brand-300 shadow-sm" : "border-slate-200 hover:border-slate-300"
              }`}>
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedStep(isExpanded ? null : index)}
                >
                  <div className={`w-8 h-8 rounded-lg ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
                    <StepIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400 uppercase">{`Step ${index + 1}`}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-0.5 truncate">
                      {getStepSummary(step)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRegenerateStep(index); }}
                      disabled={refining}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors"
                      title="Regenerate this step"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refining ? "animate-spin" : ""}`} />
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded preview */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4">
                    <StepPreview step={step} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* End marker */}
        <div className="flex justify-center">
          <div className="w-px h-5 bg-slate-200" />
        </div>
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">End of Automation</span>
          </div>
        </div>
      </div>

      {/* Conversational refinement */}
      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-violet-600" />
          <p className="text-sm font-medium text-slate-900">Make changes</p>
        </div>

        {refineHistory.length > 0 && (
          <div className="space-y-2 mb-3">
            {refineHistory.map((msg, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-slate-500">{i + 1}</span>
                </div>
                <p className="text-xs text-slate-500">{msg}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={refineInputRef}
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRefine(); } }}
            placeholder="e.g. Make the emails shorter, add a discount in email 3, change to 4 weeks..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            disabled={refining}
          />
          <button
            onClick={handleRefine}
            disabled={!refineInput.trim() || refining}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {refining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {refining ? "Updating..." : "Update"}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Make emails shorter", "Add a condition to stop if they order", "Make it more casual", "Add one more follow-up email"].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => { setRefineInput(suggestion); refineInputRef.current?.focus(); }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-slate-200 px-6 py-3 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {automation.steps.length} steps ready to save
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPhase("describe"); setAutomation(null); }}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
            >
              Start Over
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {saving ? "Saving..." : "Save & Open in Editor"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step Preview ────────────────────────────────────────────
function StepPreview({ step }: { step: GeneratedStep }) {
  switch (step.step_type) {
    case "email": {
      const subject = (step.config.subject as string) || "";
      const previewText = (step.config.preview_text as string) || "";
      const blocks = (step.config.content as EmailBlock[]) || [];
      const bgColor = (step.config.email_bg_color as string) || "#f8fafc";

      return (
        <div className="space-y-3">
          {subject && (
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Subject</p>
              <p className="text-sm font-medium text-slate-900">{subject}</p>
            </div>
          )}
          {previewText && (
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Preview Text</p>
              <p className="text-xs text-slate-600">{previewText}</p>
            </div>
          )}
          {blocks.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                {`Content Preview (${blocks.length} blocks)`}
              </p>
              <EmailMiniPreview blocks={blocks} emailBgColor={bgColor} />
            </div>
          )}
        </div>
      );
    }
    case "delay": {
      const days = (step.config.delay_days as number) || 0;
      const hours = (step.config.delay_hours as number) || 0;
      return (
        <div>
          <p className="text-sm text-slate-600">
            Wait <span className="font-medium">{days > 0 ? `${days} day${days !== 1 ? "s" : ""}` : ""}{days > 0 && hours > 0 ? " and " : ""}{hours > 0 ? `${hours} hour${hours !== 1 ? "s" : ""}` : ""}</span> before the next step.
          </p>
        </div>
      );
    }
    case "condition": {
      const field = (step.config.field as string) || "";
      const value = step.config.value as string | undefined;
      const fieldLabels: Record<string, string> = {
        has_placed_order: "has placed an order since enrolment",
        opened_previous: "previous email was opened",
        clicked_previous: "previous email was clicked",
        contact_type_is: "contact type is",
        pipeline_stage_is: "pipeline stage is",
      };
      const actionLabels: Record<string, string> = {
        continue: "Continue to next step",
        end_automation: "End automation",
        change_contact_type: "Change contact type",
        change_pipeline_stage: "Change pipeline stage",
      };
      const fieldLabel = fieldLabels[field] || field;
      const yesAction = (step.config.yes_action as string) || "continue";
      const noAction = (step.config.no_action as string) || "end_automation";
      const yesLabel = actionLabels[yesAction] || "Continue to next step";
      const noLabel = actionLabels[noAction] || "End automation";
      return (
        <div>
          <p className="text-sm text-slate-600">
            Check if contact{" "}
            <span className="font-medium">
              {fieldLabel}
              {value ? ` "${value}"` : ""}
            </span>.
            {` If yes, ${yesLabel.toLowerCase()}. If no, ${noLabel.toLowerCase()}.`}
          </p>
        </div>
      );
    }
    default:
      return <p className="text-sm text-slate-500">Unknown step type</p>;
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function getStepSummary(step: GeneratedStep): string {
  switch (step.step_type) {
    case "email": {
      const subject = step.config.subject as string;
      const blocks = (step.config.content as unknown[]) || [];
      const blockInfo = blocks.length > 0 ? ` · ${blocks.length} blocks` : "";
      return subject ? `"${subject}"${blockInfo}` : `No subject${blockInfo}`;
    }
    case "delay": {
      const days = (step.config.delay_days as number) || 0;
      const hours = (step.config.delay_hours as number) || 0;
      const parts: string[] = [];
      if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
      if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
      return parts.length > 0 ? `Wait ${parts.join(" ")}` : "No delay";
    }
    case "condition": {
      const field = step.config.field as string;
      const value = step.config.value;
      const fieldLabels: Record<string, string> = {
        opened_previous: "opened previous email",
        clicked_previous: "clicked previous email",
        contact_type_is: "contact type is",
        has_placed_order: "has placed order since enrolment",
        pipeline_stage_is: "pipeline stage is",
      };
      const label = fieldLabels[field] || field;
      if (typeof value === "boolean") {
        return value ? `If ${label}` : `If not ${label}`;
      }
      return `If ${label} "${value}"`;
    }
    default:
      return "Unknown step";
  }
}

function formatTriggerConfig(config: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (value === "" || value === null || value === undefined) continue;
    const label = key.replace(/_/g, " ");
    parts.push(`${label}: ${value}`);
  }
  return parts.join(", ");
}
