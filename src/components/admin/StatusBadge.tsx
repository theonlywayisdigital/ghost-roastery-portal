"use client";

import { STAGE_COLOURS } from "@/lib/pipeline";

type BadgeType = "order" | "payment" | "artwork" | "orderType" | "ticketStatus" | "ticketType" | "ticketPriority" | "payoutBatch" | "payoutItem" | "invoiceStatus" | "payoutStatus" | "labelPrint" | "roasterOrder" | "refundStatus" | "refundType" | "subscriptionTier" | "certificationStatus" | "roastLogStatus" | "stockAlert" | "leadStatus";

const colorMap: Record<string, Record<string, string>> = {
  order: {
    Pending: "bg-yellow-50 text-yellow-700",
    "Artwork Review": "bg-amber-50 text-amber-700",
    Approved: "bg-teal-50 text-teal-700",
    Allocated: "bg-cyan-50 text-cyan-700",
    Accepted: "bg-sky-50 text-sky-700",
    "In Production": "bg-blue-50 text-blue-700",
    Processing: "bg-blue-50 text-blue-700",
    Dispatched: "bg-purple-50 text-purple-700",
    Delivered: "bg-green-50 text-green-700",
    Cancelled: "bg-red-50 text-red-700",
    Disputed: "bg-orange-50 text-orange-700",
    pending: "bg-yellow-50 text-yellow-700",
    confirmed: "bg-teal-50 text-teal-700",
    processing: "bg-blue-50 text-blue-700",
    dispatched: "bg-purple-50 text-purple-700",
    shipped: "bg-purple-50 text-purple-700",
    delivered: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
    paid: "bg-green-50 text-green-700",
  },
  payment: {
    paid: "bg-green-50 text-green-700",
    pending: "bg-slate-100 text-slate-600",
    failed: "bg-red-50 text-red-700",
    refunded: "bg-slate-100 text-slate-600",
    partial: "bg-yellow-50 text-yellow-700",
    overdue: "bg-red-50 text-red-700",
    "awaiting payment": "bg-orange-50 text-orange-700",
    "invoice draft": "bg-slate-100 text-slate-500",
    "awaiting invoice": "bg-slate-100 text-slate-500",
  },
  artwork: {
    pending_review: "bg-yellow-50 text-yellow-700",
    approved: "bg-green-50 text-green-700",
    needs_edit: "bg-orange-50 text-orange-700",
    sent_to_print: "bg-blue-50 text-blue-700",
  },
  orderType: {
    ghost: "bg-amber-50 text-amber-700",
    storefront: "bg-blue-50 text-blue-700",
    wholesale: "bg-purple-50 text-purple-700",
  },
  ticketStatus: {
    open: "bg-yellow-50 text-yellow-700",
    in_progress: "bg-blue-50 text-blue-700",
    waiting_on_customer: "bg-orange-50 text-orange-700",
    waiting_on_roaster: "bg-orange-50 text-orange-700",
    resolved: "bg-green-50 text-green-700",
    closed: "bg-slate-100 text-slate-500",
  },
  ticketType: {
    general: "bg-slate-100 text-slate-600",
    order_issue: "bg-blue-50 text-blue-700",
    billing: "bg-green-50 text-green-700",
    technical: "bg-purple-50 text-purple-700",
    dispute: "bg-red-50 text-red-700",
    payout: "bg-amber-50 text-amber-700",
    platform: "bg-cyan-50 text-cyan-700",
  },
  ticketPriority: {
    low: "bg-slate-100 text-slate-500",
    medium: "bg-blue-50 text-blue-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-red-50 text-red-700",
  },
  payoutBatch: {
    draft: "bg-slate-100 text-slate-600",
    reviewing: "bg-yellow-50 text-yellow-700",
    approved: "bg-blue-50 text-blue-700",
    processing: "bg-purple-50 text-purple-700",
    completed: "bg-green-50 text-green-700",
    partially_completed: "bg-orange-50 text-orange-700",
  },
  payoutItem: {
    pending: "bg-yellow-50 text-yellow-700",
    approved: "bg-blue-50 text-blue-700",
    paid: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
  },
  invoiceStatus: {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-50 text-blue-700",
    viewed: "bg-cyan-50 text-cyan-700",
    paid: "bg-green-50 text-green-700",
    partially_paid: "bg-orange-50 text-orange-700",
    overdue: "bg-red-50 text-red-700",
    void: "bg-slate-100 text-slate-500",
    cancelled: "bg-slate-100 text-slate-500",
    unpaid: "bg-yellow-50 text-yellow-700",
    pending: "bg-yellow-50 text-yellow-700",
    refunded: "bg-slate-100 text-slate-600",
  },
  payoutStatus: {
    unpaid: "bg-yellow-50 text-yellow-700",
    batched: "bg-blue-50 text-blue-700",
    paid: "bg-green-50 text-green-700",
  },
  labelPrint: {
    pending: "bg-yellow-50 text-yellow-700",
    sent_to_partner: "bg-blue-50 text-blue-700",
    printed: "bg-green-50 text-green-700",
    not_applicable: "bg-slate-100 text-slate-500",
  },
  roasterOrder: {
    pending: "bg-yellow-50 text-yellow-700",
    accepted: "bg-teal-50 text-teal-700",
    in_production: "bg-blue-50 text-blue-700",
    dispatched: "bg-purple-50 text-purple-700",
    delivered: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
  },
  refundStatus: {
    pending: "bg-yellow-50 text-yellow-700",
    processing: "bg-blue-50 text-blue-700",
    completed: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
    none: "bg-slate-100 text-slate-500",
    partial: "bg-orange-50 text-orange-700",
    full: "bg-red-50 text-red-700",
  },
  refundType: {
    full: "bg-red-50 text-red-700",
    partial: "bg-orange-50 text-orange-700",
    store_credit: "bg-purple-50 text-purple-700",
  },
  subscriptionTier: {
    growth: "bg-purple-50 text-purple-700",
    pro: "bg-amber-50 text-amber-700",
    scale: "bg-green-50 text-green-700",
  },
  certificationStatus: {
    active: "bg-green-50 text-green-700",
    expiring_soon: "bg-orange-50 text-orange-700",
    expired: "bg-red-50 text-red-700",
    pending: "bg-yellow-50 text-yellow-700",
    revoked: "bg-slate-100 text-slate-500",
  },
  roastLogStatus: {
    draft: "bg-slate-100 text-slate-600",
    completed: "bg-green-50 text-green-700",
    void: "bg-red-50 text-red-700",
  },
  stockAlert: {
    ok: "bg-green-50 text-green-700",
    low: "bg-orange-50 text-orange-700",
    out: "bg-red-50 text-red-700",
  },
  leadStatus: {
    new: "bg-blue-50 text-blue-700",
    contacted: "bg-yellow-50 text-yellow-700",
    qualified: "bg-purple-50 text-purple-700",
    won: "bg-green-50 text-green-700",
    lost: "bg-red-50 text-red-600",
  },
};

const labelMap: Record<string, Record<string, string>> = {
  payment: {
    paid: "Paid",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
    partial: "Partial",
    overdue: "Overdue",
    "awaiting payment": "Awaiting Payment",
    "invoice draft": "Invoice Draft",
    "awaiting invoice": "Awaiting Invoice",
  },
  artwork: {
    pending_review: "Pending Review",
    approved: "Approved",
    needs_edit: "Needs Edit",
    sent_to_print: "Sent to Print",
  },
  orderType: {
    ghost: "Roastery Platform",
    storefront: "Retail",
    wholesale: "Wholesale",
  },
  ticketStatus: {
    open: "Open",
    in_progress: "In Progress",
    waiting_on_customer: "Waiting on Customer",
    waiting_on_roaster: "Waiting on Roaster",
    resolved: "Resolved",
    closed: "Closed",
  },
  ticketType: {
    general: "General",
    order_issue: "Order Issue",
    billing: "Billing",
    technical: "Technical",
    dispute: "Dispute",
    payout: "Payout",
    platform: "Platform",
  },
  ticketPriority: {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  },
  payoutBatch: {
    draft: "Draft",
    reviewing: "Reviewing",
    approved: "Approved",
    processing: "Processing",
    completed: "Completed",
    partially_completed: "Partially Completed",
  },
  payoutItem: {
    pending: "Pending",
    approved: "Approved",
    paid: "Paid",
    failed: "Failed",
  },
  invoiceStatus: {
    draft: "Draft",
    sent: "Sent",
    viewed: "Viewed",
    paid: "Paid",
    partially_paid: "Partially Paid",
    overdue: "Overdue",
    void: "Void",
    cancelled: "Cancelled",
    unpaid: "Unpaid",
    pending: "Pending",
    refunded: "Refunded",
  },
  payoutStatus: {
    unpaid: "Unpaid",
    batched: "Batched",
    paid: "Paid",
  },
  labelPrint: {
    pending: "Pending",
    sent_to_partner: "Sent to Partner",
    printed: "Printed",
    not_applicable: "N/A",
  },
  roasterOrder: {
    pending: "Pending",
    accepted: "Accepted",
    in_production: "In Production",
    dispatched: "Dispatched",
    delivered: "Delivered",
    cancelled: "Cancelled",
  },
  refundStatus: {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    none: "None",
    partial: "Partial Refund",
    full: "Full Refund",
  },
  refundType: {
    full: "Full Refund",
    partial: "Partial Refund",
    store_credit: "Store Credit",
  },
  subscriptionTier: {
    growth: "Growth",
    pro: "Pro",
    scale: "Scale",
  },
  certificationStatus: {
    active: "Active",
    expiring_soon: "Expiring Soon",
    expired: "Expired",
    pending: "Pending",
    revoked: "Revoked",
  },
  roastLogStatus: {
    draft: "Draft",
    completed: "Completed",
    void: "Void",
  },
  stockAlert: {
    ok: "In Stock",
    low: "Low Stock",
    out: "Out of Stock",
  },
  leadStatus: {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    won: "Won",
    lost: "Lost",
  },
};

interface StatusBadgeProps {
  status: string;
  type?: BadgeType;
  className?: string;
  /** For leadStatus: the colour key from pipeline_stages (e.g. "blue", "green"). Used to style custom stages dynamically. */
  stageColour?: string;
  /** For leadStatus: human-readable stage name. Falls back to status slug if not provided. */
  stageLabel?: string;
}

export function StatusBadge({ status, type = "order", className, stageColour, stageLabel }: StatusBadgeProps) {
  let colors = colorMap[type]?.[status] || "bg-slate-100 text-slate-600";
  let label = labelMap[type]?.[status] || status;

  // For leadStatus, support custom stages via STAGE_COLOURS lookup
  if (type === "leadStatus" && !colorMap[type]?.[status] && stageColour) {
    const sc = STAGE_COLOURS[stageColour];
    if (sc) colors = sc.badge;
  }
  if (type === "leadStatus" && stageLabel) {
    label = stageLabel;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap ${colors} ${className || ""}`}
    >
      {label}
    </span>
  );
}
