"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LifeBuoy, ArrowRight, Loader2, Clock } from "@/components/icons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatRelativeTime } from "@/components/shared/orders/format";

interface TicketRow {
  id: string;
  ticket_number: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
}

interface TicketStats {
  open: number;
  unassigned: number;
  urgent: number;
  avgResolutionHours: number;
}

export function AdminSupportWidget() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          "/api/admin/support/tickets?pageSize=5&sort=created_at&order=desc"
        );
        if (!res.ok) return;
        const json = await res.json();
        setTickets(json.data || []);
        setStats(json.stats || null);
      } catch {
        // Widget is non-critical
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-sm text-slate-500">Support & Disputes</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const avgDisplay =
    stats.avgResolutionHours > 0 ? `${stats.avgResolutionHours}h` : "N/A";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-sm text-slate-500">Support & Disputes</p>
        </div>
        <Link href="/admin/support" className="text-sm text-brand-600 hover:underline">
          View all
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center py-2 bg-yellow-50 rounded-lg">
          <p className="text-lg font-bold text-yellow-700">{stats.open}</p>
          <p className="text-[10px] text-yellow-700 font-medium">Open</p>
        </div>
        <div className="text-center py-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-700">{stats.unassigned}</p>
          <p className="text-[10px] text-slate-500 font-medium">Unassigned</p>
        </div>
        <div className="text-center py-2 bg-red-50 rounded-lg">
          <p className="text-lg font-bold text-red-600">{stats.urgent}</p>
          <p className="text-[10px] text-red-600 font-medium">Urgent</p>
        </div>
        <div className="text-center py-2 bg-blue-50 rounded-lg">
          <p className="text-lg font-bold text-blue-600">{avgDisplay}</p>
          <p className="text-[10px] text-blue-600 font-medium">Avg Resolution</p>
        </div>
      </div>

      {/* Recent tickets */}
      {tickets.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">No recent tickets.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {tickets.slice(0, 5).map((ticket) => (
            <Link
              key={ticket.id}
              href={`/admin/support/tickets/${ticket.id}`}
              className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {ticket.subject}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-mono">
                    {ticket.ticket_number}
                  </span>
                  <span className="flex items-center gap-0.5 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(ticket.created_at)}
                  </span>
                </div>
              </div>
              <StatusBadge status={ticket.priority} type="ticketPriority" />
            </Link>
          ))}
        </div>
      )}

      {/* Footer link */}
      <Link
        href="/admin/support"
        className="text-sm text-brand-600 hover:underline flex items-center gap-1"
      >
        View Support Dashboard <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
