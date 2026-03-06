"use client";

import { useState, useEffect, useCallback } from "react";
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
  Users,
  CheckCircle,
  Zap,
  UserPlus,
  ShoppingCart,
  Star,
  RefreshCw,
  Building,
  Gift,
  Pencil,
  Check,
} from "@/components/icons";
import type { Automation, AutomationStep, AutomationEnrollment, TriggerType, StepType } from "@/types/marketing";

const TRIGGER_META: Partial<Record<
  TriggerType,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bg: string }
>> = {
  new_customer: { icon: UserPlus, label: "New Customer", color: "text-emerald-600", bg: "bg-emerald-50" },
  post_purchase: { icon: ShoppingCart, label: "Post-Purchase", color: "text-blue-600", bg: "bg-blue-50" },
  review_request: { icon: Star, label: "Review Request", color: "text-amber-600", bg: "bg-amber-50" },
  win_back: { icon: RefreshCw, label: "Win-Back", color: "text-purple-600", bg: "bg-purple-50" },
  abandoned_cart: { icon: ShoppingCart, label: "Abandoned Cart", color: "text-red-600", bg: "bg-red-50" },
  wholesale_approved: { icon: Building, label: "Wholesale Approved", color: "text-indigo-600", bg: "bg-indigo-50" },
  birthday: { icon: Gift, label: "Birthday", color: "text-pink-600", bg: "bg-pink-50" },
  re_engagement: { icon: Mail, label: "Re-engagement", color: "text-orange-600", bg: "bg-orange-50" },
  custom: { icon: Zap, label: "Custom Trigger", color: "text-slate-600", bg: "bg-slate-100" },
};

const DEFAULT_TRIGGER_META = { icon: Zap, label: "Trigger", color: "text-slate-600", bg: "bg-slate-100" };

const STEP_META: Record<StepType, { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bg: string }> = {
  email: { icon: Mail, label: "Send Email", color: "text-blue-600", bg: "bg-blue-50" },
  delay: { icon: Clock, label: "Wait", color: "text-amber-600", bg: "bg-amber-50" },
  condition: { icon: GitBranch, label: "Condition", color: "text-purple-600", bg: "bg-purple-50" },
};

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-slate-100 text-slate-600",
  failed: "bg-red-50 text-red-600",
};

interface EnrollmentWithContact extends AutomationEnrollment {
  contacts?: { id: string; name: string | null; email: string } | null;
}

export function AutomationDetail({ automationId }: { automationId: string }) {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentFilter, setEnrollmentFilter] = useState<"all" | "active" | "completed" | "cancelled">("all");

  const loadData = useCallback(async () => {
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
      }

      if (enrollRes.ok) {
        const data = await enrollRes.json();
        setEnrollments(data.enrollments || []);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [automationId, apiBase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-red-600">Automation not found.</p>
        <button
          onClick={() => router.push(`${pageBase}/automations`)}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to Automations
        </button>
      </div>
    );
  }

  const triggerMeta = TRIGGER_META[automation.trigger_type] || DEFAULT_TRIGGER_META;
  const TriggerIcon = triggerMeta.icon;

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`${pageBase}/automations`)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">{automation.name}</h1>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
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
        </div>
        <button
          onClick={() => router.push(`${pageBase}/automations/${automationId}/edit`)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Enrolled"
          value={automation.enrolled_count || 0}
          icon={Users}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="Completed"
          value={automation.completed_count || 0}
          icon={CheckCircle}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          label="Steps"
          value={steps.length}
          icon={Zap}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <StatCard
          label="Trigger"
          value={triggerMeta.label}
          icon={TriggerIcon}
          color={triggerMeta.color}
          bg={triggerMeta.bg}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Workflow overview */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Workflow</h2>

          {/* Trigger */}
          <div className={`rounded-lg ${triggerMeta.bg} p-3 flex items-center gap-2.5 mb-0`}>
            <div className={`w-7 h-7 rounded ${triggerMeta.bg} ${triggerMeta.color} flex items-center justify-center`}>
              <TriggerIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase">Trigger</p>
              <p className="text-xs font-semibold text-slate-900">{triggerMeta.label}</p>
            </div>
          </div>

          {steps.map((step, index) => {
            const meta = STEP_META[step.step_type] || STEP_META.email;
            const StepIcon = meta.icon;

            return (
              <div key={step.id}>
                {/* Connector */}
                <div className="flex justify-center">
                  <div className="w-px h-5 bg-slate-200" />
                </div>
                {/* Step */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded ${meta.bg} ${meta.color} flex items-center justify-center flex-shrink-0`}>
                    <StepIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400 uppercase">{`Step ${index + 1}`}</p>
                    <p className="text-xs text-slate-700 truncate">{getStepSummary(step)}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* End */}
          <div className="flex justify-center">
            <div className="w-px h-5 bg-slate-200" />
          </div>
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 flex items-center justify-center gap-1.5 text-slate-400">
            <Check className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">End</span>
          </div>
        </div>

        {/* Right: Enrollments table */}
        <div className="lg:col-span-2">
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
                          {e.contacts?.name || "Unknown"}
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
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${bg} ${color} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function getStepSummary(step: AutomationStep): string {
  const config = step.config || {};

  switch (step.step_type) {
    case "email": {
      const subject = config.subject as string;
      return subject ? `"${subject}"` : "No subject set";
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
