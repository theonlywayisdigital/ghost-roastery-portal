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
} from "@/components/icons";
import type { Automation, AutomationStep, AutomationEnrollment, StepType, EmailBlock } from "@/types/marketing";
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
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      delay: { delay_days: 1, delay_hours: 0 },
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
}: {
  step: AutomationStep;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const config = step.config || {};

  switch (step.step_type) {
    case "email":
      return <EmailStepConfig config={config} onChange={onChange} />;
    case "delay":
      return <DelayStepConfig config={config} onChange={onChange} />;
    case "condition":
      return <ConditionStepConfig config={config} onChange={onChange} />;
    default:
      return <p className="text-sm text-slate-500">Unknown step type</p>;
  }
}

function EmailStepConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
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
            <EmailMiniPreview blocks={contentBlocks} emailBgColor={emailBgColor} />
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
      </div>
      {days === 0 && hours === 0 && (
        <p className="text-xs text-amber-600">Zero wait means the next step runs immediately.</p>
      )}
    </div>
  );
}

function ConditionStepConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const field = (config.field as string) || "opened_previous";
  const value = config.value !== undefined ? config.value : true;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Check a condition. If true, the automation continues. If false, the contact exits.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Condition</label>
          <select
            value={field}
            onChange={(e) => onChange({ ...config, field: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="opened_previous">Opened previous email</option>
            <option value="clicked_previous">Clicked previous email</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Expected</label>
          <select
            value={String(value)}
            onChange={(e) => onChange({ ...config, value: e.target.value === "true" })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
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
      const parts: string[] = [];
      if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
      if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
      return parts.length > 0 ? `Wait ${parts.join(" ")}` : "No delay";
    }
    case "condition": {
      const field = config.field as string;
      const value = config.value;
      const fieldLabel =
        field === "opened_previous"
          ? "opened previous email"
          : field === "clicked_previous"
          ? "clicked previous email"
          : field;
      return value ? `If ${fieldLabel}` : `If not ${fieldLabel}`;
    }
    default:
      return "Unknown step";
  }
}
