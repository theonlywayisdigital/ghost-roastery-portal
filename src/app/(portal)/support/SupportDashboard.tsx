"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  MessageSquare,
  ChevronRight,
  Loader2,
  LifeBuoy,
  Bot,
} from "@/components/icons";
import type { SupportTicket } from "@/types/support";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-50 text-yellow-700",
  in_progress: "bg-blue-50 text-blue-700",
  waiting_on_customer: "bg-orange-50 text-orange-700",
  waiting_on_roaster: "bg-orange-50 text-orange-700",
  resolved: "bg-green-50 text-green-700",
  closed: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_customer: "Waiting on You",
  waiting_on_roaster: "Waiting on You",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-300",
  medium: "bg-blue-400",
  high: "bg-orange-400",
  urgent: "bg-red-500",
};

export function SupportDashboard() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/support/tickets?pageSize=50");
    if (res.ok) {
      const data = await res.json();
      setTickets(data.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const activeTickets = tickets.filter(
    (t) => t.status !== "resolved" && t.status !== "closed"
  );
  const resolvedTickets = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
          <p className="text-sm text-slate-500 mt-1">
            Get help, report issues, or chat with our AI assistant.
          </p>
        </div>
        <Link
          href="/support/tickets/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </Link>
      </div>

      {/* AI Chatbot CTA */}
      <div className="bg-gradient-to-r from-brand-50 to-blue-50 rounded-xl border border-brand-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white shadow-sm">
            <Bot className="w-6 h-6 text-brand-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Need quick help?
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Chat with our AI assistant for instant answers about orders,
              billing, and more. It can search our knowledge base and help
              resolve common questions.
            </p>
            <Link
              href="/support/tickets/new?chat=true"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Start Chat
            </Link>
          </div>
        </div>
      </div>

      {/* Active tickets */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          {`Active Tickets (${activeTickets.length})`}
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
          </div>
        ) : activeTickets.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <LifeBuoy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              No active tickets. Create one if you need help.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>

      {/* Resolved tickets */}
      {resolvedTickets.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 mb-3">
            {`Resolved (${resolvedTickets.length})`}
          </h2>
          <div className="space-y-2">
            {resolvedTickets.slice(0, 10).map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  return (
    <Link
      href={`/support/tickets/${ticket.id}`}
      className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
    >
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          PRIORITY_DOT[ticket.priority] || "bg-slate-300"
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400">
            {ticket.ticket_number}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              STATUS_COLORS[ticket.status] || ""
            }`}
          >
            {STATUS_LABELS[ticket.status] || ticket.status}
          </span>
        </div>
        <p className="text-sm font-medium text-slate-900 mt-0.5 line-clamp-1">
          {ticket.subject}
        </p>
      </div>
      <span className="text-xs text-slate-400 flex-shrink-0">
        {new Date(ticket.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}
      </span>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </Link>
  );
}
