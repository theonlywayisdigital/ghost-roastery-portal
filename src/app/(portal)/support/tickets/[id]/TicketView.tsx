"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  Clock,
  User,
} from "@/components/icons";
import type { SupportTicket, TicketMessage } from "@/types/support";

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

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

const SENDER_COLORS: Record<string, string> = {
  customer: "bg-blue-100 text-blue-700",
  roaster: "bg-purple-100 text-purple-700",
  admin: "bg-brand-100 text-brand-700",
  system: "bg-slate-100 text-slate-500",
};

export function TicketView({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/support/tickets/${ticketId}`);
    if (res.ok) {
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: replyText.trim() }),
    });
    if (res.ok) {
      setReplyText("");
      fetchTicket();
    }
    setSending(false);
  };

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  const isClosed = ticket.status === "closed";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/support")}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-slate-500">
              {ticket.ticket_number}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUS_COLORS[ticket.status] || ""
              }`}
            >
              {STATUS_LABELS[ticket.status] || ticket.status}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                PRIORITY_COLORS[ticket.priority] || ""
              }`}
            >
              {ticket.priority}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            {ticket.subject}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(ticket.created_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Resolution notes */}
      {ticket.resolution_notes && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-green-800 mb-1">
            Resolution
          </p>
          <p className="text-sm text-green-700">{ticket.resolution_notes}</p>
        </div>
      )}

      {/* Messages */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="divide-y divide-slate-100">
          {messages.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              No messages yet. Our team will respond shortly.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                      SENDER_COLORS[msg.sender_type] || ""
                    }`}
                  >
                    {msg.sender_type === "admin" ? "Support" : msg.sender_type}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {msg.sender_name}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {new Date(msg.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {msg.message}
                </p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.attachments.map(
                      (att: { url: string; name: string }, i: number) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:underline"
                        >
                          {att.name}
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Reply box */}
        {!isClosed && (
          <div className="px-6 py-4 border-t border-slate-200">
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    sendReply();
                  }
                }}
              />
              <button
                onClick={sendReply}
                disabled={sending || !replyText.trim()}
                className="self-end px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
