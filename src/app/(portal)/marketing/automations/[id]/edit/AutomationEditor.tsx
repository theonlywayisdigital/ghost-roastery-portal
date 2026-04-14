"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  Mail,
  Clock,
  GitBranch,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Users,
  TestTube,
  Search,
  Zap,
} from "@/components/icons";
import type { Automation, AutomationStep, AutomationEnrollment, StepType, EmailBlock } from "@/types/marketing";
import { getTriggerDefinition } from "@/lib/trigger-definitions";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import { EmailEditorSlideOver } from "./EmailEditorSlideOver";
import { EmailMiniPreview } from "./EmailMiniPreview";
import { TriggerEditor } from "./triggers/TriggerEditor";

// Trigger metadata is now handled by TriggerEditor + trigger-definitions.ts

const STEP_META: Record<StepType, { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bg: string }> = {
  email: { icon: Mail, label: "Send Email", color: "text-blue-600", bg: "bg-blue-50" },
  delay: { icon: Clock, label: "Wait", color: "text-amber-600", bg: "bg-amber-50" },
  condition: { icon: GitBranch, label: "Condition", color: "text-purple-600", bg: "bg-purple-50" },
};

const ADD_STEP_OPTIONS: { type: StepType; label: string; description: string }[] = [
  { type: "email", label: "Send Email", description: "Send an email to the contact" },
  { type: "delay", label: "Wait", description: "Wait for a period of time" },
  { type: "condition", label: "Condition", description: "Check if a condition is met" },
];

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-slate-100 text-slate-600",
  failed: "bg-red-50 text-red-600",
};

interface EnrollmentWithContact extends AutomationEnrollment {
  contacts?: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
}

export function AutomationEditor({ automationId }: { automationId: string }) {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [addMenuAt, setAddMenuAt] = useState<number | null>(null);
  const [addingStep, setAddingStep] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrollmentWithContact[]>([]);
  const [enrollmentFilter, setEnrollmentFilter] = useState<"all" | "active" | "completed" | "cancelled">("all");
  const [showTestModal, setShowTestModal] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Branding for email previews
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandLogoSize, setBrandLogoSize] = useState<"small" | "medium" | "large">("medium");
  const [brandBusinessName, setBrandBusinessName] = useState<string>("");
  const [brandPrimaryColour, setBrandPrimaryColour] = useState<string | null>(null);
  const [brandAccentColour, setBrandAccentColour] = useState<string | null>(null);
  const [brandBackgroundColour, setBrandBackgroundColour] = useState<string | null>(null);
  const [brandButtonColour, setBrandButtonColour] = useState<string | null>(null);
  const [brandButtonTextColour, setBrandButtonTextColour] = useState<string | null>(null);
  const [brandButtonStyle, setBrandButtonStyle] = useState<"sharp" | "rounded" | "pill" | null>(null);

  useEffect(() => {
    fetch("/api/settings/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.brand_logo_url) setBrandLogoUrl(data.brand_logo_url);
        if (data?.storefront_logo_size) setBrandLogoSize(data.storefront_logo_size);
        if (data?.business_name) setBrandBusinessName(data.business_name);
        if (data?.brand_primary_colour) setBrandPrimaryColour(data.brand_primary_colour);
        if (data?.brand_accent_colour) setBrandAccentColour(data.brand_accent_colour);
        if (data?.storefront_bg_colour) setBrandBackgroundColour(data.storefront_bg_colour);
        if (data?.storefront_button_colour) setBrandButtonColour(data.storefront_button_colour);
        if (data?.storefront_button_text_colour) setBrandButtonTextColour(data.storefront_button_text_colour);
        if (data?.storefront_button_style) setBrandButtonStyle(data.storefront_button_style);
      })
      .catch(() => {});
  }, []);

  const loadAutomation = useCallback(async () => {
    setLoading(true);
    try {
      const [autoRes, enrollRes] = await Promise.all([
        fetch(`${apiBase}/automations/${automationId}`),
        fetch(`${apiBase}/automations/${automationId}/enrollments`),
      ]);

      if (autoRes.ok) {
        const data = await autoRes.json();
        setAutomation(data.automation);
        setSteps(data.steps || []);
        setNameValue(data.automation.name);
      } else {
        setError("Automation not found.");
      }

      if (enrollRes.ok) {
        const data = await enrollRes.json();
        setEnrollments(data.enrollments || []);
      }
    } catch {
      setError("Failed to load automation.");
    }
    setLoading(false);
  }, [automationId, apiBase]);

  useEffect(() => {
    loadAutomation();
  }, [loadAutomation]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  // Reload enrollments when filter changes
  useEffect(() => {
    async function loadEnrollments() {
      const params = enrollmentFilter !== "all" ? `?status=${enrollmentFilter}` : "";
      try {
        const res = await fetch(`${apiBase}/automations/${automationId}/enrollments${params}`);
        if (res.ok) {
          const data = await res.json();
          setEnrollments(data.enrollments || []);
        }
      } catch {
        // silent
      }
    }
    if (!loading) loadEnrollments();
  }, [automationId, enrollmentFilter, loading, apiBase]);

  // Auto-save automation fields
  const saveAutomation = useCallback(
    async (fields: Partial<Automation>) => {
      setSaving(true);
      try {
        const res = await fetch(`${apiBase}/automations/${automationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (res.ok) {
          const { automation: updated } = await res.json();
          setAutomation(updated);
        } else {
          console.error("Failed to save automation:", res.status, await res.text().catch(() => ""));
        }
      } catch (err) {
        console.error("Failed to save automation:", err);
      }
      setSaving(false);
    },
    [automationId, apiBase]
  );

  function handleNameBlur() {
    setEditingName(false);
    if (nameValue.trim() && nameValue !== automation?.name) {
      saveAutomation({ name: nameValue.trim() } as Partial<Automation>);
    }
  }

  async function handleToggleStatus() {
    if (!automation) return;
    const newStatus = automation.status === "active" ? "paused" : "active";
    await saveAutomation({ status: newStatus } as Partial<Automation>);
  }

  async function handleAddStep(type: StepType, afterOrder: number) {
    setAddMenuAt(null);
    setAddingStep(true);

    const defaultConfig: Record<StepType, Record<string, unknown>> = {
      email: { subject: "", from_name: "", content: [] },
      delay: { delay_days: 1, delay_hours: 0, delay_minutes: 0 },
      condition: { field: "opened_previous", value: true },
    };

    try {
      const res = await fetch(`${apiBase}/automations/${automationId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_type: type,
          config: defaultConfig[type],
          after_order: afterOrder,
        }),
      });
      if (res.ok) {
        // Reload steps to get correct ordering
        const stepsRes = await fetch(`${apiBase}/automations/${automationId}/steps`);
        if (stepsRes.ok) {
          const data = await stepsRes.json();
          setSteps(data.steps || []);
          const { step } = await res.json().catch(() => ({ step: null }));
          if (step) setExpandedStep(step.id);
        }
      }
    } catch {
      // silent
    }
    setAddingStep(false);
  }

  async function handleDeleteStep(stepId: string) {
    if (!confirm("Delete this step?")) return;
    try {
      await fetch(`${apiBase}/automations/${automationId}/steps/${stepId}`, {
        method: "DELETE",
      });
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
      if (expandedStep === stepId) setExpandedStep(null);
    } catch {
      // silent
    }
  }

  async function handleUpdateStepConfig(stepId: string, config: Record<string, unknown>) {
    // Debounced save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, config } : s))
    );

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`${apiBase}/automations/${automationId}/steps/${stepId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        });
      } catch {
        // silent
      }
    }, 800);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !automation) {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-red-600">{error || "Automation not found."}</p>
        <button
          onClick={() => router.push(`${pageBase}/automations`)}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to Automations
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`${pageBase}/automations`)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameBlur();
                if (e.key === "Escape") {
                  setNameValue(automation.name);
                  setEditingName(false);
                }
              }}
              className="text-xl font-bold text-slate-900 border-b-2 border-brand-500 outline-none bg-transparent py-0.5 px-1 min-w-[200px]"
            />
          ) : (
            <h1
              className="text-xl font-bold text-slate-900 cursor-pointer hover:text-brand-700 transition-colors"
              onClick={() => setEditingName(true)}
              title="Click to rename"
            >
              {automation.name}
            </h1>
          )}

          {saving && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>

        <div className="flex items-center gap-2">
          {/* Test trigger */}
          <button
            onClick={() => setShowTestModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <TestTube className="w-3.5 h-3.5" />
            Test Trigger
          </button>

          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
              automation.status === "active"
                ? "bg-green-50 text-green-700"
                : automation.status === "paused"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {automation.status === "active" && <Play className="w-3 h-3" />}
            {automation.status === "paused" && <Pause className="w-3 h-3" />}
            {automation.status}
          </span>

          {/* Toggle active/paused */}
          {automation.status !== "draft" && (
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                automation.status === "active"
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
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

          {/* Activate from draft */}
          {automation.status === "draft" && steps.length > 0 && (
            <button
              onClick={() => saveAutomation({ status: "active" } as Partial<Automation>)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Activate
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-6 mb-8 px-1">
        <div className="text-sm">
          <span className="text-slate-500">Enrolled: </span>
          <span className="font-medium text-slate-900">{automation.enrolled_count || 0}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">Completed: </span>
          <span className="font-medium text-slate-900">{automation.completed_count || 0}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">Trigger: </span>
          <span className="font-medium text-slate-700 capitalize">
            {automation.trigger_type.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Workflow */}
      <div className="max-w-xl mx-auto pb-16">
        {/* Trigger card */}
        <TriggerEditor automation={automation} onSave={saveAutomation} />

        {/* Connector + Add button */}
        <AddStepButton
          afterOrder={0}
          addMenuAt={addMenuAt}
          setAddMenuAt={setAddMenuAt}
          addingStep={addingStep}
          onAdd={handleAddStep}
        />

        {/* Steps */}
        {steps.map((step, index) => {
          const meta = STEP_META[step.step_type] || STEP_META.email;
          const StepIcon = meta.icon;
          const isExpanded = expandedStep === step.id;

          return (
            <div key={step.id}>
              {/* Step card */}
              <div
                className={`rounded-xl border bg-white transition-all ${
                  isExpanded ? "border-brand-300 shadow-sm" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Step header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                >
                  <div className="text-slate-300 cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className={`w-8 h-8 rounded-lg ${meta.bg} ${meta.color} flex items-center justify-center flex-shrink-0`}>
                    <StepIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400 uppercase">
                        {`Step ${index + 1}`}
                      </span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStep(step.id);
                      }}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded config */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4">
                    <StepConfigEditor
                      step={step}
                      onChange={(config) => handleUpdateStepConfig(step.id, config)}
                      apiBase={apiBase}
                      brandBusinessName={brandBusinessName}
                      brandLogoUrl={brandLogoUrl}
                      brandLogoSize={brandLogoSize}
                      brandPrimaryColour={brandPrimaryColour}
                      brandAccentColour={brandAccentColour}
                      brandBackgroundColour={brandBackgroundColour}
                      brandButtonColour={brandButtonColour}
                      brandButtonTextColour={brandButtonTextColour}
                      brandButtonStyle={brandButtonStyle}
                    />
                  </div>
                )}
              </div>

              {/* Connector + Add button */}
              <AddStepButton
                afterOrder={step.step_order}
                addMenuAt={addMenuAt}
                setAddMenuAt={setAddMenuAt}
                addingStep={addingStep}
                onAdd={handleAddStep}
              />
            </div>
          );
        })}

        {/* End marker */}
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">End of Automation</span>
          </div>
        </div>
      </div>

      {/* Enrollments section */}
      <div className="max-w-3xl mx-auto pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Enrollments</h2>
          <div className="flex gap-1">
            {(["all", "active", "completed", "cancelled"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setEnrollmentFilter(status)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  enrollmentFilter === status
                    ? "bg-brand-100 text-brand-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {enrollments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No enrollments yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                    Contact
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5 hidden md:table-cell">
                    Current Step
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5 hidden md:table-cell">
                    Enrolled
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-medium text-slate-900">
                        {e.contacts?.first_name || e.contacts?.last_name
                          ? [e.contacts.first_name, e.contacts.last_name].filter(Boolean).join(" ")
                          : "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500">{e.contacts?.email || ""}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ENROLLMENT_STATUS_COLORS[e.status] || ENROLLMENT_STATUS_COLORS.active}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className="text-sm text-slate-600">
                        {e.status === "completed"
                          ? "Done"
                          : e.status === "cancelled"
                          ? "—"
                          : `Step ${e.current_step}`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className="text-xs text-slate-500">
                        {new Date(e.enrolled_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Test trigger modal */}
      {showTestModal && (
        <TestTriggerModal
          automation={automation}
          apiBase={apiBase}
          onClose={() => setShowTestModal(false)}
          onSuccess={() => {
            setShowTestModal(false);
            loadAutomation();
          }}
        />
      )}
    </div>
  );
}

// ─── Test Trigger Modal ─────────────────────────────────────────
interface ContactResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  business_name: string | null;
}

function TestTriggerModal({
  automation,
  apiBase,
  onClose,
  onSuccess,
}: {
  automation: Automation;
  apiBase: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null);
  const [firing, setFiring] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const triggerDef = getTriggerDefinition(automation.trigger_type);
  const triggerLabel = triggerDef?.label || automation.trigger_type.replace(/_/g, " ");

  function handleSearch(value: string) {
    setQuery(value);
    setResult(null);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const contactsApi = apiBase.replace("/marketing", "/contacts");
        const res = await fetch(`${contactsApi}?search=${encodeURIComponent(value.trim())}&status=all&page=1`);
        if (res.ok) {
          const data = await res.json();
          setResults((data.contacts || []).slice(0, 5));
        }
      } catch {
        // silent
      }
      setSearching(false);
    }, 300);
  }

  function selectContact(contact: ContactResult) {
    setSelectedContact(contact);
    setQuery("");
    setResults([]);
    setResult(null);
  }

  async function handleFire() {
    if (!selectedContact) return;
    setFiring(true);
    setResult(null);

    try {
      // Build event_data from the automation's trigger_config so config matching passes
      const eventData: Record<string, unknown> = { ...(automation.trigger_config || {}) };

      const res = await fetch(`${apiBase}/automations/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger_type: automation.trigger_type,
          contact_id: selectedContact.id,
          roaster_id: automation.roaster_id,
          event_data: eventData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.enrolled > 0) {
          setResult({ type: "success", message: `Enrolled in ${data.enrolled} automation(s)` });
          setTimeout(onSuccess, 1500);
        } else {
          setResult({ type: "error", message: "Contact was not enrolled. The automation may be inactive, the contact may already be enrolled, or trigger filters excluded them." });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setResult({ type: "error", message: data.error || "Failed to fire trigger" });
      }
    } catch {
      setResult({ type: "error", message: "Network error" });
    }
    setFiring(false);
  }

  const contactName = selectedContact
    ? [selectedContact.first_name, selectedContact.last_name].filter(Boolean).join(" ") || selectedContact.email || "Unknown"
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">Test Trigger</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Trigger type (read only) */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Trigger Type</label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
              {triggerLabel}
            </div>
          </div>

          {/* Contact picker */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Contact</label>
            {selectedContact ? (
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">{contactName}</p>
                  {selectedContact.email && selectedContact.email !== contactName && (
                    <p className="text-xs text-slate-500">{selectedContact.email}</p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedContact(null); setResult(null); }}
                  className="p-1 rounded hover:bg-slate-200 text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search contacts by name or email..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                  )}
                </div>

                {/* Results dropdown */}
                {results.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 max-h-48 overflow-y-auto">
                    {results.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectContact(c)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {[c.first_name, c.last_name].filter(Boolean).join(" ") || "No name"}
                        </p>
                        <p className="text-xs text-slate-500">{c.email || "No email"}</p>
                      </button>
                    ))}
                  </div>
                )}

                {query.trim().length >= 2 && !searching && results.length === 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-3 text-center">
                    <p className="text-xs text-slate-500">No contacts found</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Result message */}
          {result && (
            <div
              className={`px-3 py-2 rounded-lg text-sm ${
                result.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {result.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleFire}
            disabled={!selectedContact || firing}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {firing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Firing...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Fire Trigger
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Step Button (connector between steps) ─────────────────
function AddStepButton({
  afterOrder,
  addMenuAt,
  setAddMenuAt,
  addingStep,
  onAdd,
}: {
  afterOrder: number;
  addMenuAt: number | null;
  setAddMenuAt: (v: number | null) => void;
  addingStep: boolean;
  onAdd: (type: StepType, afterOrder: number) => void;
}) {
  const isOpen = addMenuAt === afterOrder;

  return (
    <div className="flex flex-col items-center py-2 relative">
      {/* Vertical connector line */}
      <div className="w-px h-4 bg-slate-200" />

      {/* Add button */}
      <button
        onClick={() => setAddMenuAt(isOpen ? null : afterOrder)}
        disabled={addingStep}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          isOpen
            ? "bg-brand-600 text-white shadow-sm"
            : "bg-white border-2 border-slate-200 text-slate-400 hover:border-brand-400 hover:text-brand-600"
        }`}
        title="Add step"
      >
        {addingStep && addMenuAt === afterOrder ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isOpen ? (
          <X className="w-3.5 h-3.5" />
        ) : (
          <Plus className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Add step menu */}
      {isOpen && (
        <div className="absolute top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 w-56">
          {ADD_STEP_OPTIONS.map((opt) => {
            const meta = STEP_META[opt.type];
            const Icon = meta.icon;
            return (
              <button
                key={opt.type}
                onClick={() => onAdd(opt.type, afterOrder)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              >
                <div className={`w-7 h-7 rounded ${meta.bg} ${meta.color} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="w-px h-4 bg-slate-200" />
    </div>
  );
}

// ─── Step Config Editor ─────────────────────────────────────────
function StepConfigEditor({
  step,
  onChange,
  apiBase,
  brandBusinessName,
  brandLogoUrl,
  brandLogoSize,
  brandPrimaryColour,
  brandAccentColour,
  brandBackgroundColour,
  brandButtonColour,
  brandButtonTextColour,
  brandButtonStyle,
}: {
  step: AutomationStep;
  onChange: (config: Record<string, unknown>) => void;
  apiBase: string;
  brandBusinessName: string;
  brandLogoUrl: string | null;
  brandLogoSize: "small" | "medium" | "large";
  brandPrimaryColour: string | null;
  brandAccentColour: string | null;
  brandBackgroundColour: string | null;
  brandButtonColour: string | null;
  brandButtonTextColour: string | null;
  brandButtonStyle: "sharp" | "rounded" | "pill" | null;
}) {
  const config = step.config || {};

  switch (step.step_type) {
    case "email":
      return <EmailStepConfig config={config} onChange={onChange} brandBusinessName={brandBusinessName} brandLogoUrl={brandLogoUrl} brandLogoSize={brandLogoSize} brandPrimaryColour={brandPrimaryColour} brandAccentColour={brandAccentColour} brandBackgroundColour={brandBackgroundColour} brandButtonColour={brandButtonColour} brandButtonTextColour={brandButtonTextColour} brandButtonStyle={brandButtonStyle} />;
    case "delay":
      return <DelayStepConfig config={config} onChange={onChange} />;
    case "condition":
      return <ConditionStepConfig config={config} onChange={onChange} apiBase={apiBase} />;
    default:
      return <p className="text-sm text-slate-500">Unknown step type</p>;
  }
}

function EmailStepConfig({
  config,
  onChange,
  brandBusinessName,
  brandLogoUrl,
  brandLogoSize,
  brandPrimaryColour,
  brandAccentColour,
  brandBackgroundColour,
  brandButtonColour,
  brandButtonTextColour,
  brandButtonStyle,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  brandBusinessName: string;
  brandLogoUrl: string | null;
  brandLogoSize: "small" | "medium" | "large";
  brandPrimaryColour: string | null;
  brandAccentColour: string | null;
  brandBackgroundColour: string | null;
  brandButtonColour: string | null;
  brandButtonTextColour: string | null;
  brandButtonStyle: "sharp" | "rounded" | "pill" | null;
}) {
  const [showEditor, setShowEditor] = useState(false);

  const subject = (config.subject as string) || "";
  const fromName = (config.from_name as string) || "";
  const previewText = (config.preview_text as string) || "";
  const contentBlocks = (config.content as EmailBlock[]) || [];
  const emailBgColor = (config.email_bg_color as string) || "#f8fafc";
  const hasContent = contentBlocks.length > 0;

  function handleSaveContent(blocks: EmailBlock[], bgColor: string) {
    onChange({ ...config, content: blocks, email_bg_color: bgColor });
    setShowEditor(false);
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-slate-600">Subject Line</label>
          <AiGenerateButton
            type="email_subject"
            context={{ existingContent: subject }}
            onSelect={(v) => onChange({ ...config, subject: v })}
          />
        </div>
        <input
          type="text"
          value={subject}
          onChange={(e) => onChange({ ...config, subject: e.target.value })}
          placeholder="e.g. Welcome to our family!"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From Name</label>
          <input
            type="text"
            value={fromName}
            onChange={(e) => onChange({ ...config, from_name: e.target.value })}
            placeholder="Your business name"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-slate-600">Preview Text</label>
            <AiGenerateButton
              type="email_preview"
              context={{ existingContent: previewText }}
              onSelect={(v) => onChange({ ...config, preview_text: v })}
            />
          </div>
          <input
            type="text"
            value={previewText}
            onChange={(e) => onChange({ ...config, preview_text: e.target.value })}
            placeholder="Optional preview text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Email content section */}
      <div className="pt-2 border-t border-slate-100">
        <label className="block text-xs font-medium text-slate-600 mb-2">Email Content</label>
        {hasContent ? (
          <div className="space-y-2">
            <EmailMiniPreview blocks={contentBlocks} emailBgColor={emailBgColor} businessName={brandBusinessName} logoUrl={brandLogoUrl} logoSize={brandLogoSize} primaryColour={brandPrimaryColour} accentColour={brandAccentColour} backgroundColour={brandBackgroundColour} buttonColour={brandButtonColour} buttonTextColour={brandButtonTextColour} buttonStyle={brandButtonStyle} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {`${contentBlocks.length} block${contentBlocks.length !== 1 ? "s" : ""}`}
              </span>
              <button
                onClick={() => setShowEditor(true)}
                className="px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
              >
                Edit Content
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditor(true)}
              className="flex-1 px-3 py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors text-center"
            >
              Start from layout
            </button>
            <button
              onClick={() => setShowEditor(true)}
              className="flex-1 px-3 py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors text-center"
            >
              Create from scratch
            </button>
          </div>
        )}
      </div>

      {/* Full-screen email editor */}
      {showEditor && (
        <EmailEditorSlideOver
          blocks={contentBlocks}
          emailBgColor={emailBgColor}
          onSave={handleSaveContent}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}

function DelayStepConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const days = (config.delay_days as number) || 0;
  const hours = (config.delay_hours as number) || 0;
  const minutes = (config.delay_minutes as number) || 0;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        How long to wait before the next step runs.
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={(e) => onChange({ ...config, delay_days: parseInt(e.target.value) || 0 })}
            className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-600">days</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={23}
            value={hours}
            onChange={(e) => onChange({ ...config, delay_hours: parseInt(e.target.value) || 0 })}
            className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-600">hours</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={59}
            value={minutes}
            onChange={(e) => onChange({ ...config, delay_minutes: parseInt(e.target.value) || 0 })}
            className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-600">mins</span>
        </div>
      </div>
      {days === 0 && hours === 0 && minutes === 0 && (
        <p className="text-xs text-amber-600">Zero wait means the next step runs immediately.</p>
      )}
    </div>
  );
}

const CONDITION_FIELDS = [
  { value: "has_placed_order", label: "Has placed an order since enrolment", picker: null },
  { value: "opened_previous", label: "Previous email was opened", picker: null },
  { value: "clicked_previous", label: "Previous email was clicked", picker: null },
  { value: "contact_type_is", label: "Contact type is...", picker: "contact_types" },
  { value: "pipeline_stage_is", label: "Pipeline stage is...", picker: "pipeline_stages" },
] as const;

const BRANCH_ACTION_OPTIONS = [
  { value: "continue", label: "Continue to next step" },
  { value: "end_automation", label: "End automation" },
  { value: "change_contact_type", label: "Change contact type" },
  { value: "change_pipeline_stage", label: "Change pipeline stage" },
];

function BranchActionPicker({
  label,
  action,
  actionValue,
  onActionChange,
  onValueChange,
  dynamicOptions,
  color,
}: {
  label: string;
  action: string;
  actionValue: string;
  onActionChange: (action: string) => void;
  onValueChange: (value: string) => void;
  dynamicOptions: Record<string, { value: string; label: string }[]>;
  color: "green" | "red";
}) {
  const borderColor = color === "green" ? "border-green-200" : "border-red-200";
  const bgColor = color === "green" ? "bg-green-50" : "bg-red-50";
  const textColor = color === "green" ? "text-green-700" : "text-red-700";
  const selectClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white";

  return (
    <div className={`p-3 rounded-lg border ${borderColor} ${bgColor}`}>
      <label className={`block text-xs font-semibold ${textColor} mb-1.5`}>{label}</label>
      <select
        value={action}
        onChange={(e) => onActionChange(e.target.value)}
        className={selectClass}
      >
        {BRANCH_ACTION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {action === "change_contact_type" && (
        <div className="mt-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Change to type</label>
          <select value={actionValue} onChange={(e) => onValueChange(e.target.value)} className={selectClass}>
            <option value="">Select...</option>
            {(dynamicOptions.contact_types || []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {action === "change_pipeline_stage" && (
        <div className="mt-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Change to stage</label>
          <select value={actionValue} onChange={(e) => onValueChange(e.target.value)} className={selectClass}>
            <option value="">Select...</option>
            {(dynamicOptions.pipeline_stages || []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function ConditionStepConfig({
  config,
  onChange,
  apiBase,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  apiBase: string;
}) {
  const field = (config.field as string) || "has_placed_order";
  const value = (config.value as string) || "";
  const yesAction = (config.yes_action as string) || "continue";
  const yesActionValue = (config.yes_action_value as string) || "";
  const noAction = (config.no_action as string) || "end_automation";
  const noActionValue = (config.no_action_value as string) || "";

  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${apiBase}/automations/triggers`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setDynamicOptions(data.dynamicOptions || {});
        }
      } catch {
        // silent
      }
    }
    load();
    return () => { cancelled = true; };
  }, [apiBase]);

  const fieldDef = CONDITION_FIELDS.find((f) => f.value === field);
  const picker = fieldDef?.picker || null;

  function handleFieldChange(newField: string) {
    onChange({ ...config, field: newField, value: "" });
  }

  const selectClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white";

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Check a condition, then take different actions depending on the result.
      </p>

      {/* Condition picker */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Condition</label>
        <select value={field} onChange={(e) => handleFieldChange(e.target.value)} className={selectClass}>
          {CONDITION_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Value picker for conditions that need one */}
      {picker && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {picker === "contact_types" ? "Type" : "Stage"}
          </label>
          <select
            value={value}
            onChange={(e) => onChange({ ...config, value: e.target.value })}
            className={selectClass}
          >
            <option value="">Select...</option>
            {(dynamicOptions[picker] || []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Branch actions */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
        <BranchActionPicker
          label="If YES"
          action={yesAction}
          actionValue={yesActionValue}
          onActionChange={(a) => onChange({ ...config, yes_action: a, yes_action_value: "" })}
          onValueChange={(v) => onChange({ ...config, yes_action_value: v })}
          dynamicOptions={dynamicOptions}
          color="green"
        />
        <BranchActionPicker
          label="If NO"
          action={noAction}
          actionValue={noActionValue}
          onActionChange={(a) => onChange({ ...config, no_action: a, no_action_value: "" })}
          onValueChange={(v) => onChange({ ...config, no_action_value: v })}
          dynamicOptions={dynamicOptions}
          color="red"
        />
      </div>
    </div>
  );
}

// ─── Helper: step summary text ──────────────────────────────────
function getStepSummary(step: AutomationStep): string {
  const config = step.config || {};

  switch (step.step_type) {
    case "email": {
      const subject = config.subject as string;
      const blocks = (config.content as unknown[]) || [];
      const blockInfo = blocks.length > 0 ? ` · ${blocks.length} blocks` : "";
      return subject ? `"${subject}"${blockInfo}` : `No subject set${blockInfo}`;
    }
    case "delay": {
      const days = (config.delay_days as number) || 0;
      const hours = (config.delay_hours as number) || 0;
      const minutes = (config.delay_minutes as number) || 0;
      const parts: string[] = [];
      if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
      if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
      if (minutes > 0) parts.push(`${minutes} min${minutes !== 1 ? "s" : ""}`);
      return parts.length > 0 ? `Wait ${parts.join(" ")}` : "No delay";
    }
    case "condition": {
      const field = config.field as string;
      const value = config.value as string | undefined;
      const conditionLabels: Record<string, string> = {
        has_placed_order: "has placed an order",
        opened_previous: "previous email was opened",
        clicked_previous: "previous email was clicked",
        contact_type_is: "contact type is",
        pipeline_stage_is: "pipeline stage is",
      };
      const actionLabels: Record<string, string> = {
        continue: "continue",
        end_automation: "end",
        change_contact_type: "change type",
        change_pipeline_stage: "change stage",
      };
      const conditionText = conditionLabels[field] || field;
      const valueSuffix = value ? ` "${value}"` : "";
      const yesAction = (config.yes_action as string) || "continue";
      const noAction = (config.no_action as string) || "end_automation";
      const yesPart = actionLabels[yesAction] || yesAction;
      const noPart = actionLabels[noAction] || noAction;
      return `${conditionText}${valueSuffix} · Yes → ${yesPart} · No → ${noPart}`;
    }
    default:
      return "Unknown step";
  }
}
