"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Coffee, ArrowRight, Check, Clock, Loader2 } from "@/components/icons";

interface SuggestedBatch {
  roastedStockId: string;
  profileName: string;
  batchSizeKg: number;
  batchNumber: number;
  earliestRequiredBy: string | null;
  urgency: "overdue" | "urgent" | "normal";
}

interface ProductionSummary {
  totalBatchesNeeded: number;
  profilesWithShortfall: number;
  overdueCount: number;
  urgentCount: number;
}

const URGENCY_CONFIG = {
  overdue: { label: "Overdue", bg: "bg-red-50", text: "text-red-700" },
  urgent: { label: "Urgent", bg: "bg-amber-50", text: "text-amber-700" },
  normal: { label: "On Track", bg: "bg-green-50", text: "text-green-700" },
};

function formatDateShort(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function DashboardProductionWidget() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [topBatches, setTopBatches] = useState<SuggestedBatch[]>([]);
  const [scheduledThisWeek, setScheduledThisWeek] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tools/production/suggested");
        if (!res.ok) return;
        const data = await res.json();
        setSummary(data.summary);
        setTopBatches((data.suggestions || []).slice(0, 3));

        // Count plans scheduled for the current week
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const plans = data.existingPlans || [];
        const weekCount = plans.filter((p: { planned_date: string }) => {
          const d = new Date(p.planned_date + "T00:00:00");
          return d >= monday && d <= sunday;
        }).length;
        setScheduledThisWeek(weekCount);
      } catch {
        // Silently fail — widget is non-critical
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
            <Coffee className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Production</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const hasBatches = summary.totalBatchesNeeded > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
            <Coffee className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Production</p>
            <p className="text-2xl font-bold text-slate-900">{summary.totalBatchesNeeded}</p>
          </div>
        </div>
        <Link href="/tools/production" className="text-sm text-brand-600 hover:underline">
          View all
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center py-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-900">{summary.totalBatchesNeeded}</p>
          <p className="text-[10px] text-slate-500 font-medium">Needed</p>
        </div>
        <div className="text-center py-2 bg-red-50 rounded-lg">
          <p className="text-lg font-bold text-red-600">{summary.overdueCount}</p>
          <p className="text-[10px] text-red-600 font-medium">Overdue</p>
        </div>
        <div className="text-center py-2 bg-amber-50 rounded-lg">
          <p className="text-lg font-bold text-amber-600">{summary.urgentCount}</p>
          <p className="text-[10px] text-amber-600 font-medium">Urgent</p>
        </div>
        <div className="text-center py-2 bg-brand-50 rounded-lg">
          <p className="text-lg font-bold text-brand-600">{scheduledThisWeek}</p>
          <p className="text-[10px] text-brand-600 font-medium">This Week</p>
        </div>
      </div>

      {/* Batch list or all-caught-up */}
      {hasBatches ? (
        <div className="space-y-2 mb-4">
          {topBatches.map((batch) => {
            const urg = URGENCY_CONFIG[batch.urgency];
            return (
              <div
                key={`${batch.roastedStockId}-${batch.batchNumber}`}
                className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{batch.profileName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{batch.batchSizeKg}kg</span>
                    {batch.earliestRequiredBy && (
                      <span className="flex items-center gap-0.5 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatDateShort(batch.earliestRequiredBy)}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${urg.bg} ${urg.text}`}>
                  {urg.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-4 justify-center mb-4">
          <Check className="w-5 h-5 text-green-500" />
          <p className="text-sm text-green-700 font-medium">All caught up</p>
        </div>
      )}

      {/* Footer link */}
      <Link
        href="/tools/production"
        className="text-sm text-brand-600 hover:underline flex items-center gap-1"
      >
        View Production Planner <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
