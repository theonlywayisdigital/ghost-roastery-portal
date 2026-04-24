"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  GripVertical,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  Truck,
} from "@/components/icons";
import { DispatchModal } from "@/components/shared/orders/DispatchModal";
import { formatPrice } from "@/components/shared/orders/format";
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

interface DispatchOrder {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerBusiness: string | null;
  customerEmail: string;
  itemSummary: string;
  itemCount: number;
  totalWeightKg: number;
  subtotal: number;
  status: string;
  requiredByDate: string | null;
  confirmedAt: string | null;
  externalSource: string | null;
  orderChannel: string | null;
  scheduledDispatchDate: string | null;
  readiness: "ready" | "partial" | "not_ready";
  readinessDetail: string;
  stockBreakdown: {
    profileName: string;
    neededKg: number;
    availableKg: number;
    sufficient: boolean;
  }[];
}

interface ScheduledDispatch {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerBusiness: string | null;
  scheduledDate: string;
  readiness: DispatchOrder["readiness"];
  totalWeightKg: number;
  itemCount: number;
  subtotal: number;
  dispatched?: boolean;
  dispatchedAt?: number;
}

interface DispatchResponse {
  orders: DispatchOrder[];
  summary: {
    totalOrders: number;
    readyCount: number;
    partialCount: number;
    notReadyCount: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

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

const READINESS_CONFIG = {
  ready: { label: "Ready", bg: "bg-green-50", text: "text-green-700", border: "border-l-green-500" },
  partial: { label: "Partial", bg: "bg-amber-50", text: "text-amber-700", border: "border-l-amber-500" },
  not_ready: { label: "Not Ready", bg: "bg-red-50", text: "text-red-700", border: "border-l-red-500" },
};

// ── Toast ──────────────────────────────────────────────────────────────

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

// ── Sub-components ─────────────────────────────────────────────────────

function DraggableDispatchCard({
  order,
  isOverlay,
  isSelected,
  selectedCount,
  onToggleSelect,
}: {
  order: DispatchOrder;
  isOverlay?: boolean;
  isSelected?: boolean;
  selectedCount?: number;
  onToggleSelect?: (orderId: string) => void;
}) {
  const id = `dispatch-${order.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  const [expanded, setExpanded] = useState(false);
  const rd = READINESS_CONFIG[order.readiness];

  const displayName = order.customerBusiness || order.customerName || order.customerEmail;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      className={`bg-white rounded-lg border ${isSelected ? "border-brand-400 ring-1 ring-brand-200" : "border-slate-200"} border-l-[3px] ${rd.border} transition-all ${
        isDragging ? "opacity-30" : ""
      } ${isOverlay ? "shadow-lg ring-2 ring-brand-200" : ""}`}
    >
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          {!isOverlay && onToggleSelect && (
            <label className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(order.id)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </label>
          )}
          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
          {order.requiredByDate ? (
            <span className={`text-xs font-medium ${
              (() => {
                const today = new Date(); today.setHours(0,0,0,0);
                const d = new Date(order.requiredByDate + "T00:00:00");
                const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
                return diff < 0 ? "text-red-600" : diff <= 2 ? "text-amber-600" : "text-slate-600";
              })()
            }`}>
              Required by {formatDateShort(order.requiredByDate)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">No date set</span>
          )}
          <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${rd.bg} ${rd.text}`}>
            {rd.label}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <button
            {...listeners}
            {...attributes}
            className="mt-0.5 p-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">{order.orderNumber}</span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">{order.itemSummary}</p>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="font-medium text-slate-700">{order.totalWeightKg}kg</span>
              <span>{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</span>
              <span className="text-slate-400">{formatPrice(order.subtotal)}</span>
            </div>
          </div>
        </div>

        {isOverlay && selectedCount && selectedCount > 1 && (
          <div className="absolute -top-2 -right-2 bg-brand-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
            {selectedCount}
          </div>
        )}
      </div>

      {!isOverlay && order.stockBreakdown.length > 0 && (
        <div className="px-3 pb-2 ml-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide" : "Stock"} details
          </button>
          {expanded && (
            <div className="mt-1 space-y-1">
              {order.stockBreakdown.map((s) => (
                <div key={s.profileName} className="flex items-center gap-2 text-[10px]">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.sufficient ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-slate-600 truncate">{s.profileName}</span>
                  <span className="ml-auto shrink-0 text-slate-500">
                    {s.neededKg}kg / {s.availableKg}kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DispatchCalendarCard({
  dispatch,
  isOverlay,
  onMarkDispatched,
  onUnschedule,
  onUndoDispatch,
}: {
  dispatch: ScheduledDispatch;
  isOverlay?: boolean;
  onMarkDispatched: (orderId: string) => void;
  onUnschedule: (orderId: string) => void;
  onUndoDispatch: (orderId: string) => void;
}) {
  const id = `dispatch-cal-${dispatch.orderId}`;
  const isDispatched = !!dispatch.dispatched;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled: isDispatched,
  });
  const rd = READINESS_CONFIG[dispatch.readiness];
  const displayName = dispatch.customerBusiness || dispatch.customerName || dispatch.orderNumber;

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!dispatch.dispatchedAt) {
      setSecondsLeft(null);
      return;
    }
    function tick() {
      const elapsed = (Date.now() - dispatch.dispatchedAt!) / 1000;
      const remaining = Math.ceil(15 - elapsed);
      setSecondsLeft(remaining > 0 ? remaining : null);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [dispatch.dispatchedAt]);

  const isInUndoWindow = isDispatched && secondsLeft != null && secondsLeft > 0;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      className={`group bg-white rounded-lg border border-slate-200 border-l-[3px] ${isDispatched ? "border-l-slate-300" : rd.border} min-h-[64px] transition-all ${
        isDragging ? "opacity-30" : ""
      } ${isOverlay ? "shadow-lg ring-2 ring-brand-200" : ""} ${isDispatched ? "opacity-60" : ""}`}
    >
      <div className="p-2.5 relative">
        {!isOverlay && !isDispatched && (
          <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-0.5 bg-white rounded-md shadow-sm border border-slate-200 p-0.5 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onMarkDispatched(dispatch.orderId); }}
              title="Mark dispatched"
              className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onUnschedule(dispatch.orderId); }}
              title="Unschedule"
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {!isOverlay && isInUndoWindow && (
          <div className="absolute inset-0 rounded-lg bg-slate-900/60 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10 flex items-center justify-center">
            <button
              onClick={(e) => { e.stopPropagation(); onUndoDispatch(dispatch.orderId); }}
              className="px-3 py-1.5 text-xs font-medium bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              Undo
            </button>
          </div>
        )}

        <div className="flex items-start gap-1.5">
          {!isDispatched && (
            <button
              {...listeners}
              {...attributes}
              className="mt-0.5 p-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <div className={`flex-1 min-w-0 ${isDispatched ? "pl-1" : ""}`}>
            <p className={`text-xs font-medium truncate pr-6 ${isDispatched ? "text-slate-500 line-through" : "text-slate-900"}`}>{displayName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-500">{dispatch.totalWeightKg}kg</span>
              <span className="text-[10px] text-slate-400">{dispatch.itemCount} item{dispatch.itemCount !== 1 ? "s" : ""}</span>
              {isDispatched ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                  Dispatched
                </span>
              ) : (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${rd.bg} ${rd.text}`}>
                  {rd.label}
                </span>
              )}
            </div>
            {isInUndoWindow && (
              <p className="text-[10px] text-amber-600 mt-1">
                Sending notification in {secondsLeft}s
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DroppableDispatchDay({
  date,
  isToday,
  dispatches,
  onMarkDispatched,
  onUnschedule,
  onUndoDispatch,
}: {
  date: Date;
  isToday: boolean;
  dispatches: ScheduledDispatch[];
  onMarkDispatched: (orderId: string) => void;
  onUnschedule: (orderId: string) => void;
  onUndoDispatch: (orderId: string) => void;
}) {
  const dateKey = toDateKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: `dispatch-day-${dateKey}` });

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
        {dispatches.map((d) => (
          <DispatchCalendarCard
            key={d.orderId}
            dispatch={d}
            onMarkDispatched={onMarkDispatched}
            onUnschedule={onUnschedule}
            onUndoDispatch={onUndoDispatch}
          />
        ))}

        {isOver && (
          <div className="flex items-center justify-center min-h-[64px] border-2 border-dashed border-brand-300 rounded-lg text-xs text-brand-500 font-medium bg-brand-50/50">
            Drop here
          </div>
        )}

        {dispatches.length === 0 && !isOver && (
          <div className="flex items-center justify-center min-h-[60px] text-xs text-slate-300">
            —
          </div>
        )}
      </div>
    </div>
  );
}

function DispatchUnscheduleZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "dispatch-unschedule" });

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

// ── Main Component ─────────────────────────────────────────────────────

export function DispatchPlanner() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const [dispatchOrders, setDispatchOrders] = useState<DispatchOrder[]>([]);
  const [dispatchSummary, setDispatchSummary] = useState({ totalOrders: 0, readyCount: 0, partialCount: 0, notReadyCount: 0 });
  const [scheduledDispatches, setScheduledDispatches] = useState<ScheduledDispatch[]>([]);
  const [dispatchLoading, setDispatchLoading] = useState(true);
  const [selectedDispatchIds, setSelectedDispatchIds] = useState<Set<string>>(new Set());
  const [dispatchModalOrderId, setDispatchModalOrderId] = useState<string | null>(null);
  const [dispatchModalLoading, setDispatchModalLoading] = useState(false);

  const [activeDrag, setActiveDrag] = useState<{ type: "dispatch-order"; dispatchOrder?: DispatchOrder; scheduledDispatch?: ScheduledDispatch } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const notifyTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  const loadDispatchData = useCallback(async (showLoading = false) => {
    if (showLoading) setDispatchLoading(true);
    try {
      const res = await fetch("/api/tools/production/dispatch");
      if (res.ok) {
        const data: DispatchResponse = await res.json();
        setDispatchOrders(data.orders);
        setDispatchSummary(data.summary);

        setScheduledDispatches((prev) => {
          const dispatched = prev.filter((d) => d.dispatched);
          const fromApi: ScheduledDispatch[] = data.orders
            .filter((o) => o.scheduledDispatchDate)
            .filter((o) => !dispatched.some((d) => d.orderId === o.id))
            .map((o) => ({
              orderId: o.id,
              orderNumber: o.orderNumber,
              customerName: o.customerName,
              customerBusiness: o.customerBusiness,
              scheduledDate: o.scheduledDispatchDate!,
              readiness: o.readiness,
              totalWeightKg: o.totalWeightKg,
              itemCount: o.itemCount,
              subtotal: o.subtotal,
            }));
          return [...dispatched, ...fromApi];
        });
      }
    } catch (err) {
      console.error("Failed to load dispatch data:", err);
    }
    if (showLoading) setDispatchLoading(false);
  }, []);

  useEffect(() => {
    loadDispatchData(true);
  }, [loadDispatchData]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const unscheduledDispatchOrders = dispatchOrders.filter(
    (o) => !scheduledDispatches.some((d) => d.orderId === o.id)
  );

  function toggleDispatchSelect(orderId: string) {
    setSelectedDispatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  function toggleDispatchSelectAll() {
    if (selectedDispatchIds.size === unscheduledDispatchOrders.length) {
      setSelectedDispatchIds(new Set());
    } else {
      setSelectedDispatchIds(new Set(unscheduledDispatchOrders.map((o) => o.id)));
    }
  }

  function getDispatchesForDate(dateKey: string): ScheduledDispatch[] {
    return scheduledDispatches.filter((d) => d.scheduledDate === dateKey);
  }

  function handleDragStart(event: DragStartEvent) {
    setIsDragging(true);
    const idStr = event.active.id as string;

    if (idStr.startsWith("dispatch-cal-")) {
      const orderId = idStr.replace("dispatch-cal-", "");
      const sd = scheduledDispatches.find((d) => d.orderId === orderId);
      if (sd) setActiveDrag({ type: "dispatch-order", scheduledDispatch: sd });
    } else if (idStr.startsWith("dispatch-")) {
      const orderId = idStr.replace("dispatch-", "");
      const order = unscheduledDispatchOrders.find((o) => o.id === orderId);
      if (order) {
        if (selectedDispatchIds.size > 0 && !selectedDispatchIds.has(orderId)) {
          setSelectedDispatchIds(new Set());
        }
        setActiveDrag({ type: "dispatch-order", dispatchOrder: order });
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setIsDragging(false);
    const dragData = activeDrag;
    setActiveDrag(null);

    const { over } = event;
    if (!over || !dragData) return;

    const targetId = over.id as string;

    if (dragData.dispatchOrder) {
      if (targetId === "dispatch-unschedule") return;
      if (!targetId.startsWith("dispatch-day-")) return;

      const dateKey = targetId.replace("dispatch-day-", "");

      const idsToSchedule: string[] = [];
      if (selectedDispatchIds.size > 0 && selectedDispatchIds.has(dragData.dispatchOrder.id)) {
        idsToSchedule.push(...Array.from(selectedDispatchIds));
      } else {
        idsToSchedule.push(dragData.dispatchOrder.id);
      }

      const ordersToSchedule = idsToSchedule
        .map((id) => unscheduledDispatchOrders.find((o) => o.id === id))
        .filter(Boolean) as DispatchOrder[];

      if (ordersToSchedule.length === 0) return;

      const newDispatches: ScheduledDispatch[] = ordersToSchedule.map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerBusiness: o.customerBusiness,
        scheduledDate: dateKey,
        readiness: o.readiness,
        totalWeightKg: o.totalWeightKg,
        itemCount: o.itemCount,
        subtotal: o.subtotal,
      }));

      setScheduledDispatches((prev) => [...prev, ...newDispatches]);
      setSelectedDispatchIds(new Set());

      await Promise.all(
        ordersToSchedule.map((o) =>
          fetch(`/api/orders/${o.id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scheduledDispatchDate: dateKey }),
          })
        )
      );
      return;
    }

    if (dragData.scheduledDispatch) {
      const sd = dragData.scheduledDispatch;

      if (targetId === "dispatch-unschedule") {
        setScheduledDispatches((prev) => prev.filter((d) => d.orderId !== sd.orderId));
        fetch(`/api/orders/${sd.orderId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledDispatchDate: null }),
        });
        return;
      }

      if (!targetId.startsWith("dispatch-day-")) return;
      const dateKey = targetId.replace("dispatch-day-", "");
      if (sd.scheduledDate === dateKey) return;

      setScheduledDispatches((prev) =>
        prev.map((d) => (d.orderId === sd.orderId ? { ...d, scheduledDate: dateKey } : d))
      );
      fetch(`/api/orders/${sd.orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDispatchDate: dateKey }),
      });
    }
  }

  async function handleMarkDispatched(orderId: string, trackingNumber?: string, trackingCarrier?: string) {
    setDispatchModalLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "dispatched",
          trackingNumber: trackingNumber || undefined,
          trackingCarrier: trackingCarrier || undefined,
          skipNotifications: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error || "Failed to mark as dispatched.", type: "error" });
      } else {
        const now = Date.now();
        setDispatchOrders((prev) => prev.filter((o) => o.id !== orderId));
        setScheduledDispatches((prev) =>
          prev.map((d) => (d.orderId === orderId ? { ...d, dispatched: true, dispatchedAt: now } : d))
        );
        setDispatchSummary((prev) => ({ ...prev, totalOrders: prev.totalOrders - 1 }));

        const timer = setTimeout(async () => {
          notifyTimersRef.current.delete(orderId);
          try {
            await fetch(`/api/orders/${orderId}/dispatch-notify`, { method: "POST" });
          } catch {
            // Notification send is best-effort
          }
        }, 15000);
        notifyTimersRef.current.set(orderId, timer);
      }
    } catch {
      setToast({ message: "Failed to mark as dispatched.", type: "error" });
    } finally {
      setDispatchModalLoading(false);
      setDispatchModalOrderId(null);
    }
  }

  async function handleUndoDispatch(orderId: string) {
    const timer = notifyTimersRef.current.get(orderId);
    if (timer) {
      clearTimeout(timer);
      notifyTimersRef.current.delete(orderId);
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed", skipNotifications: true }),
      });

      if (!res.ok) {
        setToast({ message: "Failed to undo dispatch.", type: "error" });
        return;
      }

      setScheduledDispatches((prev) =>
        prev.map((d) => (d.orderId === orderId ? { ...d, dispatched: false, dispatchedAt: undefined } : d))
      );
      setToast({ message: "Dispatch undone — order returned to Confirmed.", type: "success" });
      loadDispatchData();
    } catch {
      setToast({ message: "Failed to undo dispatch.", type: "error" });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  const weekDays = getWeekDays(currentDate);
  const weekLabel = `${formatDateShort(toDateKey(weekDays[0]))} — ${formatDateShort(toDateKey(weekDays[6]))}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispatch</h1>
          <p className="text-slate-500 mt-1">Schedule and manage order dispatch.</p>
        </div>
      </div>

      {/* Summary header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">To Dispatch</p>
          <p className="text-2xl font-bold text-slate-900">{dispatchSummary.totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-green-600 mb-1">Ready</p>
          <p className="text-2xl font-bold text-green-600">{dispatchSummary.readyCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-amber-500 mb-1">Partial Stock</p>
          <p className="text-2xl font-bold text-amber-600">{dispatchSummary.partialCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-red-500 mb-1">Not Ready</p>
          <p className="text-2xl font-bold text-red-600">{dispatchSummary.notReadyCount}</p>
        </div>
      </div>

      {dispatchLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4">
            {/* Left panel — Orders to Dispatch */}
            <div className="w-72 shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-280px)]">
              <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">Orders to Dispatch</h2>
                  {unscheduledDispatchOrders.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-full">
                      {unscheduledDispatchOrders.length}
                    </span>
                  )}
                </div>
              </div>

              {unscheduledDispatchOrders.length > 1 && (
                <div className="px-3 py-1.5 border-b border-slate-50 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDispatchIds.size === unscheduledDispatchOrders.length && unscheduledDispatchOrders.length > 0}
                      onChange={toggleDispatchSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500">Select all</span>
                  </label>
                  {selectedDispatchIds.size > 0 && (
                    <span className="text-[10px] text-brand-600 font-medium">
                      {selectedDispatchIds.size} selected
                    </span>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {unscheduledDispatchOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Check className="w-6 h-6 text-green-400 mb-2" />
                    <p className="text-sm font-medium text-slate-500">All caught up</p>
                    <p className="text-xs text-slate-400 mt-1">Drag to calendar to plan dispatch</p>
                  </div>
                ) : (
                  unscheduledDispatchOrders.map((order) => (
                    <DraggableDispatchCard
                      key={order.id}
                      order={order}
                      isSelected={selectedDispatchIds.has(order.id)}
                      onToggleSelect={toggleDispatchSelect}
                    />
                  ))
                )}
              </div>

              {isDragging && <DispatchUnscheduleZone />}
            </div>

            {/* Right panel — Calendar */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">{weekLabel}</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const d = new Date(currentDate);
                      d.setDate(d.getDate() - 7);
                      setCurrentDate(d);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date(currentDate);
                      d.setDate(d.getDate() + 7);
                      setCurrentDate(d);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7">
                {weekDays.map((date) => {
                  const dateKey = toDateKey(date);
                  const dayDispatches = getDispatchesForDate(dateKey);
                  const isToday = dateKey === todayKey;

                  return (
                    <DroppableDispatchDay
                      key={dateKey}
                      date={date}
                      isToday={isToday}
                      dispatches={dayDispatches}
                      onMarkDispatched={(orderId) => setDispatchModalOrderId(orderId)}
                      onUnschedule={(orderId) => {
                        setScheduledDispatches((prev) => prev.filter((d) => d.orderId !== orderId));
                        fetch(`/api/orders/${orderId}/status`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ scheduledDispatchDate: null }),
                        });
                      }}
                      onUndoDispatch={handleUndoDispatch}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeDrag?.type === "dispatch-order" && activeDrag.dispatchOrder && (
              <div className="w-64">
                <DraggableDispatchCard
                  order={activeDrag.dispatchOrder}
                  isOverlay
                  selectedCount={selectedDispatchIds.size > 1 && selectedDispatchIds.has(activeDrag.dispatchOrder.id) ? selectedDispatchIds.size : undefined}
                />
              </div>
            )}
            {activeDrag?.type === "dispatch-order" && activeDrag.scheduledDispatch && (
              <div className="w-48">
                <DispatchCalendarCard
                  dispatch={activeDrag.scheduledDispatch}
                  isOverlay
                  onMarkDispatched={() => {}}
                  onUnschedule={() => {}}
                  onUndoDispatch={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Dispatch modal */}
      {dispatchModalOrderId && (
        <DispatchModal
          onConfirm={(trackingNumber, trackingCarrier) => {
            handleMarkDispatched(dispatchModalOrderId, trackingNumber, trackingCarrier);
          }}
          onClose={() => setDispatchModalOrderId(null)}
          isLoading={dispatchModalLoading}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
