"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Coffee,
  CalendarDays,
  List,
  GripVertical,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  Scale,
  X,
} from "@/components/icons";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

// ── Types ──────────────────────────────────────────────────────────────

interface ContributingOrder {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerBusiness: string | null;
  kgNeeded: number;
  requiredByDate: string | null;
  status: string;
}

interface SuggestedBatch {
  roastedStockId: string;
  profileName: string;
  greenBeanId: string | null;
  greenBeanName: string | null;
  greenBeanOrigin: string | null;
  greenStockKg: number | null;
  roastedStockKg: number;
  weightLossPercent: number | null;
  batchSizeKg: number;
  batchNumber: number;
  totalBatches: number;
  totalShortfallKg: number;
  totalDemandKg: number;
  currentStockKg: number;
  earliestRequiredBy: string | null;
  urgency: "overdue" | "urgent" | "normal";
  contributingOrders: ContributingOrder[];
}

interface ExistingPlan {
  id: string;
  planned_date: string;
  green_bean_id: string | null;
  green_bean_name: string | null;
  roasted_stock_id: string | null;
  roast_log_id: string | null;
  planned_weight_kg: number;
  expected_roasted_kg: number | null;
  expected_loss_percent: number;
  status: string;
  notes: string | null;
  priority: number;
  green_beans: { name: string } | null;
  roasted_stock: { name: string } | null;
}

interface SuggestedResponse {
  suggestions: SuggestedBatch[];
  existingPlans: ExistingPlan[];
  summary: {
    totalBatchesNeeded: number;
    profilesWithShortfall: number;
    overdueCount: number;
    urgentCount: number;
  };
}

type DraggableType = "suggestion" | "plan";

function parseDraggableId(id: string): { type: DraggableType; key: string } {
  if (id.startsWith("suggestion-")) return { type: "suggestion", key: id.replace("suggestion-", "") };
  return { type: "plan", key: id.replace("plan-", "") };
}

// ── Week helpers ───────────────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const wd = new Date(monday);
    wd.setDate(monday.getDate() + i);
    days.push(wd);
  }
  return days;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Urgency helpers ────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  overdue: { label: "Overdue", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", leftBorder: "border-l-red-500" },
  urgent: { label: "Urgent", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", leftBorder: "border-l-amber-500" },
  normal: { label: "On Track", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", leftBorder: "border-l-green-500" },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  planned: { label: "Planned", bg: "bg-yellow-50", text: "text-yellow-700" },
  in_progress: { label: "In Progress", bg: "bg-blue-50", text: "text-blue-700" },
  completed: { label: "Completed", bg: "bg-green-50", text: "text-green-700" },
  cancelled: { label: "Cancelled", bg: "bg-slate-100", text: "text-slate-500" },
};

function parseRequiredByFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Required by: (\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function deriveUrgency(requiredBy: string | null): "overdue" | "urgent" | "normal" {
  if (!requiredBy) return "normal";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reqDate = new Date(requiredBy + "T00:00:00");
  const diffDays = Math.ceil((reqDate.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 2) return "urgent";
  return "normal";
}

// ── Toast notification ─────────────────────────────────────────────────

function Toast({ message, type, onClose }: {
  message: string;
  type?: "error" | "success";
  onClose: () => void;
}) {
  const isSuccess = type === "success";
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 ${isSuccess ? "bg-green-600" : "bg-red-600"} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium`}>
      {isSuccess ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      {message}
      <button onClick={onClose} className={`ml-2 ${isSuccess ? "text-green-200" : "text-red-200"} hover:text-white`}>&times;</button>
    </div>
  );
}

// ── Log & Complete Overlay ─────────────────────────────────────────────

function LogCompleteOverlay({
  plan,
  suggestion,
  onClose,
  onComplete,
}: {
  plan: ExistingPlan;
  suggestion: SuggestedBatch | null;
  onClose: () => void;
  onComplete: (planId: string, roastLogId: string, greenKg: number, roastedKg: number) => void;
}) {
  const wlp = suggestion?.weightLossPercent;
  const defaultLoss = wlp != null ? wlp : 14;
  const initialGreen = String(plan.planned_weight_kg);
  const initialRoasted = (plan.planned_weight_kg * (1 - defaultLoss / 100)).toFixed(2);

  const [greenUsed, setGreenUsed] = useState(initialGreen);
  const [roastedOutput, setRoastedOutput] = useState(initialRoasted);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasExistingLog = !!plan.roast_log_id;

  const profileName = plan.roasted_stock?.name || plan.green_beans?.name || plan.green_bean_name || "Unnamed";

  // Recalculate roasted output when green weight changes
  function handleGreenChange(value: string) {
    setGreenUsed(value);
    const gk = parseFloat(value);
    if (gk && gk > 0) {
      setRoastedOutput((gk * (1 - defaultLoss / 100)).toFixed(2));
    }
  }

  const lossLabel = wlp != null
    ? `Based on ${wlp.toFixed(1)}% average weight loss`
    : "Using system default (14%)";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const greenKg = parseFloat(greenUsed);
    const roastedKg = parseFloat(roastedOutput);
    if (!greenKg || greenKg <= 0 || !roastedKg || roastedKg <= 0) {
      setError("Both values must be greater than 0.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/tools/roast-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roast_date: plan.planned_date,
          green_bean_id: plan.green_bean_id || null,
          green_bean_name: plan.green_bean_name || plan.green_beans?.name || null,
          green_weight_kg: greenKg,
          roasted_weight_kg: roastedKg,
          roasted_stock_id: plan.roasted_stock_id || null,
          roasted_stock_qty_kg: roastedKg,
          notes: `From production plan. ${profileName}`.trim(),
          status: "completed",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update stock.");
        setSaving(false);
        return;
      }

      const logData = await res.json();
      await fetch(`/api/tools/production/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          roast_log_id: logData.roastLog?.id || null,
        }),
      });

      onComplete(plan.id, logData.roastLog?.id, greenKg, roastedKg);
      onClose();
    } catch {
      setError("Failed to update stock. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md mx-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Log & Complete</h3>
            <p className="text-xs text-slate-500 mt-0.5">{profileName} — {plan.planned_weight_kg}kg planned</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {hasExistingLog ? (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-medium text-amber-800 mb-1">A roast log has already been recorded for this batch.</p>
              <Link
                href={`/tools/roast-log/${plan.roast_log_id}`}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 underline underline-offset-2"
              >
                View roast log
              </Link>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Current stock info */}
            {suggestion && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {suggestion.greenStockKg != null && (
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-[10px] font-medium text-slate-400 uppercase mb-0.5">Green Stock</p>
                    <p className="text-sm font-semibold text-slate-900">{suggestion.greenStockKg.toFixed(1)}kg</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-[10px] font-medium text-slate-400 uppercase mb-0.5">Roasted Stock</p>
                  <p className="text-sm font-semibold text-slate-900">{suggestion.roastedStockKg.toFixed(1)}kg</p>
                </div>
              </div>
            )}

            {/* Weight loss explanation */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
              <p className="text-[10px] font-medium text-slate-600 mb-1">{lossLabel}</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                We pre-fill the roasted output using your average weight loss. For accurate stock tracking, enter the actual output from your roast or import logs from your roasting tool.
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-600 mb-3">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Actual Green Used (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={greenUsed}
                  onChange={(e) => handleGreenChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Actual Roasted Output (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={roastedOutput}
                  onChange={(e) => setRoastedOutput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Updating..." : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function DraggableBatchCard({
  batch,
  index,
  isOverlay,
  isSelected,
  selectedCount,
  onToggleSelect,
}: {
  batch: SuggestedBatch;
  index: number;
  isOverlay?: boolean;
  isSelected?: boolean;
  selectedCount?: number;
  onToggleSelect?: (index: number) => void;
}) {
  const id = `suggestion-${index}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  const [expanded, setExpanded] = useState(false);
  const urg = URGENCY_CONFIG[batch.urgency];

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      className={`bg-white rounded-lg border ${isSelected ? "border-brand-400 ring-1 ring-brand-200" : "border-slate-200"} border-l-[3px] ${urg.leftBorder} transition-all ${
        isDragging ? "opacity-30" : ""
      } ${isOverlay ? "shadow-lg ring-2 ring-brand-200" : ""}`}
    >
      <div className="p-3">
        {/* Required By — first line */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {!isOverlay && onToggleSelect && (
            <label
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(index)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </label>
          )}
          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
          {batch.earliestRequiredBy ? (
            <span className={`text-xs font-medium ${batch.urgency === "overdue" ? "text-red-600" : batch.urgency === "urgent" ? "text-amber-600" : "text-slate-600"}`}>
              Required by {formatDateShort(batch.earliestRequiredBy)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">No date set</span>
          )}
          <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${urg.bg} ${urg.text}`}>
            {urg.label}
          </span>
        </div>

        {/* Drag handle + profile info */}
        <div className="flex items-start gap-2">
          <button
            {...listeners}
            {...attributes}
            className="mt-0.5 p-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{batch.profileName}</p>
            {batch.greenBeanName && (
              <p className="text-xs text-slate-500 truncate">{batch.greenBeanName}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="font-medium text-slate-700">{batch.batchSizeKg}kg</span>
              <span>{batch.contributingOrders.length} order{batch.contributingOrders.length !== 1 ? "s" : ""}</span>
            </div>
            {batch.totalBatches > 1 && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                Batch {batch.batchNumber} of {batch.totalBatches} ({batch.totalShortfallKg}kg shortfall)
              </p>
            )}
          </div>
        </div>

        {/* Multi-select badge on overlay */}
        {isOverlay && selectedCount && selectedCount > 1 && (
          <div className="absolute -top-2 -right-2 bg-brand-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
            {selectedCount}
          </div>
        )}
      </div>

      {/* Expandable order details */}
      {!isOverlay && batch.contributingOrders.length > 0 && (
        <div className="px-3 pb-2 ml-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide" : "Show"} orders
          </button>
          {expanded && (
            <div className="mt-1 space-y-1">
              {batch.contributingOrders.map((o) => (
                <div key={o.orderId} className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-mono font-medium text-slate-600">{o.orderNumber}</span>
                  <span className="truncate">{o.customerName || o.customerBusiness || "—"}</span>
                  <span className="ml-auto shrink-0">{o.kgNeeded.toFixed(1)}kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DraggablePlanCard({
  plan,
  urgency,
  requiredBy,
  suggestion,
  isOverlay,
  onStatusChange,
  onDelete,
  onStockUpdate,
}: {
  plan: ExistingPlan;
  urgency: "overdue" | "urgent" | "normal";
  requiredBy: string | null;
  suggestion: SuggestedBatch | null;
  isOverlay?: boolean;
  onStatusChange: (planId: string, newStatus: string) => void;
  onDelete: (planId: string) => void;
  onStockUpdate: (planId: string) => void;
}) {
  const id = `plan-${plan.id}`;
  const isCompleted = plan.status === "completed";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled: isCompleted,
  });
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.planned;
  const name = plan.roasted_stock?.name || plan.green_beans?.name || plan.green_bean_name || "Unnamed";
  const urg = URGENCY_CONFIG[urgency];

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      className={`group bg-white rounded-lg border border-slate-200 border-l-[3px] ${isCompleted ? "border-l-slate-300" : urg.leftBorder} min-h-[72px] transition-all ${
        isDragging ? "opacity-30" : ""
      } ${isOverlay ? "shadow-lg ring-2 ring-brand-200" : ""} ${isCompleted ? "opacity-60" : ""}`}
    >
      <div className="p-2.5 relative">
        {/* Hover-reveal action buttons — top right (non-completed only) */}
        {!isOverlay && !isCompleted && (
          <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-0.5 bg-white rounded-md shadow-sm border border-slate-200 p-0.5 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(plan.id, "completed"); }}
              title="Mark complete"
              className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onStockUpdate(plan.id); }}
              title="Log & complete"
              className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
            >
              <Scale className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }}
              title="Unschedule"
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Completed card hover overlay */}
        {!isOverlay && isCompleted && (
          <div className="absolute inset-0 rounded-lg bg-slate-900/60 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10 flex items-center justify-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onStockUpdate(plan.id); }}
              className="px-3 py-1.5 text-xs font-medium bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" />
              Log Roast
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(plan.id, "planned"); }}
              className="px-3 py-1.5 text-xs font-medium bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              Undo
            </button>
          </div>
        )}

        {/* Drag handle + content */}
        <div className="flex items-start gap-1.5">
          {!isCompleted && (
            <button
              {...listeners}
              {...attributes}
              className="mt-0.5 p-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <div className={`flex-1 min-w-0 ${isCompleted ? "pl-1" : ""}`}>
            {/* Required By — first line */}
            <div className="flex items-center gap-1 mb-1">
              <Clock className={`w-3 h-3 shrink-0 ${isCompleted ? "text-slate-300" : "text-slate-400"}`} />
              {requiredBy ? (
                <span className={`text-[10px] font-medium ${isCompleted ? "text-slate-400" : urgency === "overdue" ? "text-red-600" : urgency === "urgent" ? "text-amber-600" : "text-slate-500"}`}>
                  {formatDateShort(requiredBy)}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">No date set</span>
              )}
            </div>

            {/* Profile name */}
            <p className={`text-xs font-medium truncate pr-6 ${isCompleted ? "text-slate-500 line-through" : "text-slate-900"}`}>{name}</p>

            {/* Batch size + status */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-500">{plan.planned_weight_kg}kg</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        {!isOverlay && suggestion && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1.5 ml-5 text-[10px] text-slate-400 hover:text-slate-600"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Less" : "More"}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {!isOverlay && expanded && suggestion && (
        <div className="px-2.5 pb-2.5 border-t border-slate-100 mt-0.5 pt-2 space-y-1.5">
          {/* Green bean info */}
          {suggestion.greenBeanName && (
            <div className="text-[10px] text-slate-500">
              <span className="font-medium text-slate-600">Green:</span> {suggestion.greenBeanName}
              {suggestion.greenBeanOrigin && <span className="text-slate-400"> — {suggestion.greenBeanOrigin}</span>}
            </div>
          )}

          {/* Stock & loss info */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
            {suggestion.weightLossPercent != null && (
              <>
                <span className="text-slate-400">Avg loss</span>
                <span className="text-slate-600 font-medium">{suggestion.weightLossPercent.toFixed(1)}%</span>
              </>
            )}
            {suggestion.greenStockKg != null && (
              <>
                <span className="text-slate-400">Green stock</span>
                <span className="text-slate-600 font-medium">{suggestion.greenStockKg.toFixed(1)}kg</span>
              </>
            )}
            <span className="text-slate-400">Roasted stock</span>
            <span className="text-slate-600 font-medium">{suggestion.roastedStockKg.toFixed(1)}kg</span>
          </div>

          {/* Contributing orders */}
          {suggestion.contributingOrders.length > 0 && (
            <div className="pt-1 border-t border-slate-50">
              <p className="text-[10px] font-medium text-slate-500 mb-1">
                {suggestion.contributingOrders.length} order{suggestion.contributingOrders.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-0.5">
                {suggestion.contributingOrders.map((o) => (
                  <div key={o.orderId} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="truncate">{o.customerName || o.customerBusiness || o.orderNumber}</span>
                    <span className="shrink-0 text-slate-600 font-medium">{o.kgNeeded.toFixed(1)}kg</span>
                    {o.requiredByDate && (
                      <span className="shrink-0 text-slate-400">by {formatDateShort(o.requiredByDate)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DroppableDay({
  date,
  isToday,
  plans,
  getSuggestionForPlan,
  getUrgencyForPlan,
  getRequiredByForPlan,
  onStatusChange,
  onDelete,
  onStockUpdate,
}: {
  date: Date;
  isToday: boolean;
  plans: ExistingPlan[];
  getSuggestionForPlan: (plan: ExistingPlan) => SuggestedBatch | null;
  getUrgencyForPlan: (plan: ExistingPlan) => "overdue" | "urgent" | "normal";
  getRequiredByForPlan: (plan: ExistingPlan) => string | null;
  onStatusChange: (planId: string, newStatus: string) => void;
  onDelete: (planId: string) => void;
  onStockUpdate: (planId: string) => void;
}) {
  const dateKey = toDateKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-h-[280px] border-r border-slate-100 last:border-r-0 transition-all ${
        isOver ? "bg-brand-50 ring-2 ring-inset ring-brand-300" : ""
      }`}
    >
      <div className={`text-center py-2 border-b ${isOver ? "border-brand-200" : "border-slate-100"}`}>
        <p className="text-[10px] font-medium text-slate-400 uppercase">
          {DAY_NAMES[((date.getDay() + 6) % 7)]}
        </p>
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
            isToday ? "bg-brand-600 text-white" : "text-slate-700"
          }`}
        >
          {date.getDate()}
        </span>
      </div>

      <div className="flex-1 p-2 space-y-2">
        {plans.map((plan) => (
          <DraggablePlanCard
            key={plan.id}
            plan={plan}
            urgency={getUrgencyForPlan(plan)}
            requiredBy={getRequiredByForPlan(plan)}
            suggestion={getSuggestionForPlan(plan)}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onStockUpdate={onStockUpdate}
          />
        ))}

        {isOver && (
          <div className="flex items-center justify-center min-h-[72px] border-2 border-dashed border-brand-300 rounded-lg text-xs text-brand-500 font-medium bg-brand-50/50">
            Drop here
          </div>
        )}

        {plans.length === 0 && !isOver && (
          <div className="flex items-center justify-center min-h-[60px] text-xs text-slate-300">
            —
          </div>
        )}
      </div>
    </div>
  );
}

function UnscheduleDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "unschedule" });

  return (
    <div ref={setNodeRef} className="mt-auto pt-3 border-t border-slate-100">
      <div className={`flex items-center justify-center py-3 border-2 border-dashed rounded-lg text-xs font-medium transition-colors ${
        isOver ? "border-red-300 bg-red-50 text-red-600" : "border-slate-200 text-slate-400"
      }`}>
        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
        Drop to unschedule
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

interface ProductionPlannerProps {
  initialPlans: ExistingPlan[];
}

export function ProductionPlanner({ initialPlans }: ProductionPlannerProps) {
  const router = useRouter();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SuggestedBatch[]>([]);
  const [plans, setPlans] = useState<ExistingPlan[]>(initialPlans);
  const [summary, setSummary] = useState({ totalBatchesNeeded: 0, profilesWithShortfall: 0, overdueCount: 0, urgentCount: 0 });
  const [activeDrag, setActiveDrag] = useState<{ type: DraggableType; index?: number; plan?: ExistingPlan } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [stockUpdatePlanId, setStockUpdatePlanId] = useState<string | null>(null);

  // Multi-select state
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const snapshotRef = useRef<{ plans: ExistingPlan[]; suggestions: SuggestedBatch[] } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const weekDays = getWeekDays(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  const weekLabel = `${formatDateShort(toDateKey(weekDays[0]))} — ${formatDateShort(toDateKey(weekDays[6]))}`;

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/tools/production/suggested");
      if (res.ok) {
        const data: SuggestedResponse = await res.json();
        setSuggestions(data.suggestions);
        setPlans(data.existingPlans);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load production data:", err);
    }
    if (showLoading) setLoading(false);
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Build lookup: roasted_stock_id → suggestion
  const suggestionByStockId = new Map<string, SuggestedBatch>();
  for (const s of suggestions) {
    if (!suggestionByStockId.has(s.roastedStockId)) {
      suggestionByStockId.set(s.roastedStockId, s);
    }
  }

  function getSuggestionForPlan(plan: ExistingPlan): SuggestedBatch | null {
    if (plan.roasted_stock_id) {
      return suggestionByStockId.get(plan.roasted_stock_id) || null;
    }
    return null;
  }

  function getUrgencyForPlan(plan: ExistingPlan): "overdue" | "urgent" | "normal" {
    const notesDate = parseRequiredByFromNotes(plan.notes);
    if (notesDate) return deriveUrgency(notesDate);
    if (plan.roasted_stock_id) {
      const suggestion = suggestionByStockId.get(plan.roasted_stock_id);
      if (suggestion) return suggestion.urgency;
    }
    return "normal";
  }

  function getRequiredByForPlan(plan: ExistingPlan): string | null {
    const notesDate = parseRequiredByFromNotes(plan.notes);
    if (notesDate) return notesDate;
    if (plan.roasted_stock_id) {
      const suggestion = suggestionByStockId.get(plan.roasted_stock_id);
      if (suggestion) return suggestion.earliestRequiredBy;
    }
    return null;
  }

  // Filter plans by current week
  const weekKeys = new Set(weekDays.map(toDateKey));
  const plansThisWeek = plans.filter((p) => weekKeys.has(p.planned_date));
  const scheduledBatchCount = plansThisWeek.length;

  function getPlansForDate(dateKey: string): ExistingPlan[] {
    return plans.filter((p) => p.planned_date === dateKey);
  }

  // Count how many plans exist per roasted_stock_id (only active ones)
  const planCountByStock: Record<string, number> = {};
  for (const p of plans) {
    if (p.roasted_stock_id && (p.status === "planned" || p.status === "in_progress" || p.status === "completed")) {
      planCountByStock[p.roasted_stock_id] = (planCountByStock[p.roasted_stock_id] || 0) + 1;
    }
  }

  const unscheduledSuggestions = suggestions.filter((s) => {
    const scheduled = planCountByStock[s.roastedStockId] || 0;
    return s.batchNumber > scheduled;
  });

  // Multi-select handlers
  function toggleSelect(index: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIndices.size === unscheduledSuggestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(unscheduledSuggestions.map((_, i) => i)));
    }
  }

  // Navigation
  function navigateWeek(delta: number) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  function goToThisWeek() {
    setCurrentDate(new Date());
  }

  function saveSnapshot() {
    snapshotRef.current = { plans: [...plans], suggestions: [...suggestions] };
  }

  function rollback(errorMsg: string) {
    if (snapshotRef.current) {
      setPlans(snapshotRef.current.plans);
      setSuggestions(snapshotRef.current.suggestions);
      snapshotRef.current = null;
    }
    setToast({ message: errorMsg, type: "error" });
  }

  // Drag and drop handlers
  function handleDragStart(event: DragStartEvent) {
    setIsDragging(true);
    const { type, key } = parseDraggableId(event.active.id as string);
    if (type === "suggestion") {
      const idx = parseInt(key);
      if (selectedIndices.size > 0 && !selectedIndices.has(idx)) {
        setSelectedIndices(new Set());
      }
      setActiveDrag({ type: "suggestion", index: idx });
    } else {
      const plan = plans.find((p) => p.id === key);
      if (plan) setActiveDrag({ type: "plan", plan });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setIsDragging(false);
    const dragData = activeDrag;
    setActiveDrag(null);

    const { over } = event;
    if (!over || !dragData) return;

    const targetId = over.id as string;

    if (dragData.type === "suggestion") {
      if (targetId === "unschedule") return;

      const indicesToSchedule: number[] = [];
      if (selectedIndices.size > 0 && selectedIndices.has(dragData.index!)) {
        indicesToSchedule.push(...Array.from(selectedIndices).sort((a, b) => a - b));
      } else {
        indicesToSchedule.push(dragData.index!);
      }

      const batchesToSchedule = indicesToSchedule
        .map((i) => unscheduledSuggestions[i])
        .filter(Boolean);

      if (batchesToSchedule.length === 0) return;

      saveSnapshot();
      const tempPlans: ExistingPlan[] = batchesToSchedule.map((batch, i) => ({
        id: `temp-${Date.now()}-${i}`,
        planned_date: targetId,
        green_bean_id: batch.greenBeanId,
        green_bean_name: batch.greenBeanName || batch.profileName,
        roasted_stock_id: batch.roastedStockId,
        roast_log_id: null,
        planned_weight_kg: batch.batchSizeKg,
        expected_roasted_kg: Math.round(batch.batchSizeKg * 0.85 * 1000) / 1000,
        expected_loss_percent: 15,
        status: "planned",
        notes: batch.earliestRequiredBy
          ? `Required by: ${batch.earliestRequiredBy}. Auto-scheduled for ${batch.contributingOrders.length} order(s).`
          : `Auto-scheduled for ${batch.contributingOrders.length} order(s). Shortfall: ${batch.totalShortfallKg}kg.`,
        priority: 0,
        green_beans: batch.greenBeanName ? { name: batch.greenBeanName } : null,
        roasted_stock: { name: batch.profileName },
      }));

      setPlans((prev) => [...prev, ...tempPlans]);
      setSelectedIndices(new Set());

      try {
        const results = await Promise.all(
          batchesToSchedule.map((batch) =>
            fetch("/api/tools/production", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                planned_date: targetId,
                roasted_stock_id: batch.roastedStockId,
                green_bean_id: batch.greenBeanId || null,
                green_bean_name: batch.greenBeanName || batch.profileName,
                planned_weight_kg: String(batch.batchSizeKg),
                expected_loss_percent: "15",
                notes: batch.earliestRequiredBy
                  ? `Required by: ${batch.earliestRequiredBy}. Auto-scheduled for ${batch.contributingOrders.length} order(s).`
                  : `Auto-scheduled for ${batch.contributingOrders.length} order(s). Shortfall: ${batch.totalShortfallKg}kg.`,
              }),
            })
          )
        );

        const allOk = results.every((r) => r.ok);
        if (allOk) {
          loadData();
        } else {
          rollback("Some batches failed to schedule. Changes reverted.");
        }
      } catch {
        rollback("Failed to schedule batches. Changes reverted.");
      }
    } else if (dragData.type === "plan" && dragData.plan) {
      const plan = dragData.plan;

      if (targetId === "unschedule") {
        saveSnapshot();
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));

        try {
          const res = await fetch(`/api/tools/production/${plan.id}`, { method: "DELETE" });
          if (res.ok) {
            loadData();
          } else {
            rollback("Failed to unschedule batch. Changes reverted.");
          }
        } catch {
          rollback("Failed to unschedule batch. Changes reverted.");
        }
        return;
      }

      if (plan.planned_date === targetId) return;

      saveSnapshot();
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, planned_date: targetId } : p))
      );

      try {
        const res = await fetch(`/api/tools/production/${plan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planned_date: targetId }),
        });
        if (!res.ok) {
          rollback("Failed to reschedule batch. Changes reverted.");
        }
      } catch {
        rollback("Failed to reschedule batch. Changes reverted.");
      }
    }
  }

  async function handleStatusChange(planId: string, newStatus: string) {
    saveSnapshot();
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, status: newStatus } : p))
    );

    try {
      const res = await fetch(`/api/tools/production/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        rollback("Failed to update status. Changes reverted.");
      } else {
        loadData();
      }
    } catch {
      rollback("Failed to update status. Changes reverted.");
    }
  }

  async function handleDelete(planId: string) {
    saveSnapshot();
    setPlans((prev) => prev.filter((p) => p.id !== planId));

    try {
      const res = await fetch(`/api/tools/production/${planId}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      } else {
        rollback("Failed to delete plan. Changes reverted.");
      }
    } catch {
      rollback("Failed to delete plan. Changes reverted.");
    }
  }

  function handleStockUpdate(planId: string) {
    setStockUpdatePlanId(planId);
  }

  function handleStockUpdateComplete(planId: string, _roastLogId: string, _greenKg: number, _roastedKg: number) {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, status: "completed" } : p))
    );
    setToast({ message: "Roast logged and stock updated.", type: "success" });
    loadData();
  }

  // View toggle
  if (view === "list") {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Production Planner</h1>
            <p className="text-slate-500 mt-1">Plan and schedule your roasting production.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setView("calendar")}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <CalendarDays className="w-4 h-4" />
                Calendar
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 text-white font-medium">
                <List className="w-4 h-4" />
                List
              </button>
            </div>
            <Link
              href="/tools/production/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </Link>
          </div>
        </div>
        <ListViewFallback plans={plans} loading={loading} router={router} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production Planner</h1>
          <p className="text-slate-500 mt-1">Plan and schedule your roasting production.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 text-white font-medium">
              <CalendarDays className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>
          <Link
            href="/tools/production/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </Link>
        </div>
      </div>

      {/* Summary header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Batches Needed</p>
          <p className="text-2xl font-bold text-slate-900">{summary.totalBatchesNeeded}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-red-500 mb-1">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{summary.overdueCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-amber-500 mb-1">Urgent</p>
          <p className="text-2xl font-bold text-amber-600">{summary.urgentCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Scheduled This Week</p>
          <p className="text-2xl font-bold text-brand-600">{scheduledBatchCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4">
            {/* Left panel — Batches Needed */}
            <div className="w-[30%] shrink-0">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-4 max-h-[calc(100vh-220px)] flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Coffee className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-900">Batches Needed</h2>
                  {unscheduledSuggestions.length > 0 && (
                    <span className="ml-auto text-xs font-medium text-slate-400">
                      {unscheduledSuggestions.length}
                    </span>
                  )}
                </div>

                {/* Select all + selection count */}
                {unscheduledSuggestions.length > 1 && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                    <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIndices.size === unscheduledSuggestions.length && unscheduledSuggestions.length > 0}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">Select all</span>
                    </label>
                    {selectedIndices.size > 0 && (
                      <span className="ml-auto text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                        {selectedIndices.size} selected
                      </span>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  {unscheduledSuggestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Check className="w-8 h-8 text-green-400 mb-2" />
                      <p className="text-sm text-slate-500">All batches scheduled</p>
                      <p className="text-xs text-slate-400 mt-1">No shortfalls detected</p>
                    </div>
                  ) : (
                    unscheduledSuggestions.map((batch, i) => (
                      <div key={`${batch.roastedStockId}-${batch.batchNumber}`} className="group/item">
                        <DraggableBatchCard
                          batch={batch}
                          index={i}
                          isSelected={selectedIndices.has(i)}
                          onToggleSelect={toggleSelect}
                        />
                      </div>
                    ))
                  )}
                </div>

                {isDragging && <UnscheduleDropZone />}
              </div>
            </div>

            {/* Right panel — Week calendar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">{weekLabel}</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigateWeek(-1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goToThisWeek}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => navigateWeek(1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <div className="grid grid-cols-7" style={{ minWidth: "1120px" }}>
                  {weekDays.map((date) => {
                    const dateKey = toDateKey(date);
                    const dayPlans = getPlansForDate(dateKey);
                    const isToday = dateKey === todayKey;

                    return (
                      <DroppableDay
                        key={dateKey}
                        date={date}
                        isToday={isToday}
                        plans={dayPlans}
                        getSuggestionForPlan={getSuggestionForPlan}
                        getUrgencyForPlan={getUrgencyForPlan}
                        getRequiredByForPlan={getRequiredByForPlan}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onStockUpdate={handleStockUpdate}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeDrag?.type === "suggestion" && activeDrag.index != null && unscheduledSuggestions[activeDrag.index] && (
              <div className="w-[280px] relative">
                <DraggableBatchCard
                  batch={unscheduledSuggestions[activeDrag.index]}
                  index={activeDrag.index}
                  isOverlay
                  selectedCount={selectedIndices.size > 1 && selectedIndices.has(activeDrag.index) ? selectedIndices.size : undefined}
                />
              </div>
            )}
            {activeDrag?.type === "plan" && activeDrag.plan && (
              <div className="w-[200px]">
                <DraggablePlanCard
                  plan={activeDrag.plan}
                  urgency={getUrgencyForPlan(activeDrag.plan)}
                  requiredBy={getRequiredByForPlan(activeDrag.plan)}
                  suggestion={getSuggestionForPlan(activeDrag.plan)}
                  isOverlay
                  onStatusChange={() => {}}
                  onDelete={() => {}}
                  onStockUpdate={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Log & Complete overlay */}
      {stockUpdatePlanId && (() => {
        const plan = plans.find((p) => p.id === stockUpdatePlanId);
        if (!plan) return null;
        const suggestion = getSuggestionForPlan(plan);
        return (
          <LogCompleteOverlay
            plan={plan}
            suggestion={suggestion}
            onClose={() => setStockUpdatePlanId(null)}
            onComplete={handleStockUpdateComplete}
          />
        );
      })()}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── List view fallback ─────────────────────────────────────────────────

function ListViewFallback({
  plans,
  loading,
  router,
}: {
  plans: ExistingPlan[];
  loading: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Coffee className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No production plans yet — create your first plan to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Planned Date</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Profile / Bean</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Weight (kg)</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Expected Output</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((plan) => {
              const name = plan.roasted_stock?.name || plan.green_beans?.name || plan.green_bean_name || "—";
              const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.planned;
              return (
                <tr
                  key={plan.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/tools/production/${plan.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-900">
                      {new Date(plan.planned_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-900">{name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">{Number(plan.planned_weight_kg).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-slate-600">
                      {plan.expected_roasted_kg != null ? `${Number(plan.expected_roasted_kg).toFixed(2)}kg` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
