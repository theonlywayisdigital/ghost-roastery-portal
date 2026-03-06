"use client";

import { FileEdit, Clock, Loader2, CheckCircle, AlertCircle, AlertTriangle } from "@/components/icons";
import type { PostStatus } from "@/types/social";

const STATUS_CONFIG: Record<PostStatus, { label: string; icon: typeof FileEdit; color: string }> = {
  draft: { label: "Draft", icon: FileEdit, color: "bg-slate-100 text-slate-600" },
  scheduled: { label: "Scheduled", icon: Clock, color: "bg-blue-50 text-blue-700" },
  publishing: { label: "Publishing", icon: Loader2, color: "bg-amber-50 text-amber-700" },
  published: { label: "Published", icon: CheckCircle, color: "bg-green-50 text-green-700" },
  failed: { label: "Failed", icon: AlertCircle, color: "bg-red-50 text-red-600" },
  partially_failed: { label: "Partial", icon: AlertTriangle, color: "bg-orange-50 text-orange-700" },
};

export function StatusBadge({ status }: { status: PostStatus }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className={`w-3 h-3 ${status === "publishing" ? "animate-spin" : ""}`} />
      {config.label}
    </span>
  );
}

export function getStatusDotColor(status: PostStatus): string {
  switch (status) {
    case "draft": return "bg-slate-400";
    case "scheduled": return "bg-blue-500";
    case "publishing": return "bg-amber-500";
    case "published": return "bg-green-500";
    case "failed": return "bg-red-500";
    case "partially_failed": return "bg-orange-500";
    default: return "bg-slate-400";
  }
}
