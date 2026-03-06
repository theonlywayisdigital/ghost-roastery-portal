"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  Clock,
  User,
  Shield,
  MessageSquare,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Package,
  History,
} from "@/components/icons";
import type {
  SupportTicket,
  TicketMessage,
  TicketHistoryEntry,
  TicketStatus,
  TicketPriority,
} from "@/types/support";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_customer", label: "Waiting on Customer" },
  { value: "waiting_on_roaster", label: "Waiting on Roaster" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-50 text-yellow-700",
  in_progress: "bg-blue-50 text-blue-700",
  waiting_on_customer: "bg-orange-50 text-orange-700",
  waiting_on_roaster: "bg-orange-50 text-orange-700",
  resolved: "bg-green-50 text-green-700",
  closed: "bg-slate-100 text-slate-500",
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

interface Admin {
  id: string;
  name: string;
}

interface OrderInfo {
  id: string;
  order_number: string;
  order_status: string;
  total_price: number;
  created_at: string;
}

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [disputeAction, setDisputeAction] = useState(false);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/support/tickets/${ticketId}`);
    if (res.ok) {
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages);
      setOrder(data.order);
      setAdmins(data.admins);
      setResolutionNotes(data.ticket.resolution_notes || "");
    }
    setLoading(false);
  }, [ticketId]);

  const fetchHistory = useCallback(async () => {
    const res = await fetch(
      `/api/admin/support/tickets/${ticketId}/history`
    );
    if (res.ok) {
      const data = await res.json();
      setHistory(data.history);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory, fetchHistory]);

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    const res = await fetch(
      `/api/admin/support/tickets/${ticketId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyText.trim(),
          is_internal: isInternal,
        }),
      }
    );
    if (res.ok) {
      setReplyText("");
      fetchTicket();
    }
    setSending(false);
  };

  const updateTicket = async (updates: Record<string, unknown>) => {
    setUpdating(true);
    const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setTicket((prev) => (prev ? { ...prev, ...data.ticket } : prev));
    }
    setUpdating(false);
  };

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/admin/support")}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-slate-500">
              {ticket.ticket_number}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUS_COLORS[ticket.status] || ""
              }`}
            >
              {STATUS_OPTIONS.find((s) => s.value === ticket.status)?.label}
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content — conversation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chatbot conversation (collapsible) */}
          {ticket.chatbot_conversation &&
            Array.isArray(ticket.chatbot_conversation) &&
            ticket.chatbot_conversation.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200">
                <button
                  onClick={() => setShowChatbot(!showChatbot)}
                  className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    Chatbot Conversation ({ticket.chatbot_conversation.length}{" "}
                    messages)
                  </span>
                  {showChatbot ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showChatbot && (
                  <div className="px-6 pb-4 space-y-2 border-t border-slate-100 pt-3">
                    {ticket.chatbot_conversation.map(
                      (
                        msg: { role: string; content: string },
                        i: number
                      ) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg text-sm ${
                            msg.role === "user"
                              ? "bg-blue-50 text-blue-900 ml-8"
                              : "bg-slate-50 text-slate-700 mr-8"
                          }`}
                        >
                          <p className="text-[10px] font-medium text-slate-400 mb-1 uppercase">
                            {msg.role === "user" ? "User" : "AI Assistant"}
                          </p>
                          {msg.content}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

          {/* Messages thread */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                Conversation
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {messages.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  No messages yet.
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`px-6 py-4 ${
                      msg.is_internal ? "bg-amber-50/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                          SENDER_COLORS[msg.sender_type] || ""
                        }`}
                      >
                        {msg.sender_type}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {msg.sender_name}
                      </span>
                      {msg.is_internal && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                          <EyeOff className="w-3 h-3" />
                          Internal Note
                        </span>
                      )}
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
                          (
                            att: { url: string; name: string },
                            i: number
                          ) => (
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
            {ticket.status !== "closed" && (
              <div className="px-6 py-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <EyeOff className="w-3.5 h-3.5" />
                    Internal note
                  </label>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      isInternal
                        ? "Add an internal note (not visible to user)..."
                        : "Type your reply..."
                    }
                    rows={3}
                    className={`flex-1 px-4 py-3 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 resize-none ${
                      isInternal
                        ? "border-amber-300 bg-amber-50/50 focus:ring-amber-500"
                        : "border-slate-300 focus:ring-brand-500"
                    }`}
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

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Ticket info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Details</h3>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Created by
              </label>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-700">
                  {ticket.creator_name}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                    SENDER_COLORS[ticket.created_by_type] || ""
                  }`}
                >
                  {ticket.created_by_type}
                </span>
              </div>
              {ticket.creator_email && (
                <p className="text-xs text-slate-400 mt-0.5 ml-5">
                  {ticket.creator_email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Created
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-700">
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

          {/* Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Actions</h3>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Status
              </label>
              <select
                value={ticket.status}
                onChange={(e) =>
                  updateTicket({ status: e.target.value })
                }
                disabled={updating}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Priority
              </label>
              <select
                value={ticket.priority}
                onChange={(e) =>
                  updateTicket({ priority: e.target.value })
                }
                disabled={updating}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Assigned to
              </label>
              <select
                value={ticket.assigned_to || ""}
                onChange={(e) =>
                  updateTicket({
                    assigned_to: e.target.value || null,
                  })
                }
                disabled={updating}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Unassigned</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution notes (show when resolving/resolved) */}
            {(ticket.status === "resolved" ||
              ticket.status === "closed") && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  onBlur={() =>
                    resolutionNotes !== ticket.resolution_notes &&
                    updateTicket({
                      resolution_notes: resolutionNotes,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="How was this resolved?"
                />
              </div>
            )}
          </div>

          {/* Dispute actions */}
          {ticket.type === "dispute" && ticket.order_id && ticket.status !== "resolved" && ticket.status !== "closed" && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6 space-y-3">
              <h3 className="text-sm font-semibold text-red-900">
                Resolve Dispute
              </h3>
              <div className="space-y-2">
                {(["resolved_customer", "resolved_roaster", "resolved_split"] as const).map((resolution) => {
                  const labels: Record<string, string> = {
                    resolved_customer: "In favour of customer",
                    resolved_roaster: "In favour of roaster",
                    resolved_split: "Split resolution",
                  };
                  return (
                    <button
                      key={resolution}
                      onClick={async () => {
                        if (!confirm(`Resolve dispute ${labels[resolution]}?`)) return;
                        setDisputeAction(true);
                        const res = await fetch(`/api/admin/support/tickets/${ticketId}/dispute`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ resolution, notes: resolutionNotes }),
                        });
                        if (res.ok) fetchTicket();
                        setDisputeAction(false);
                      }}
                      disabled={disputeAction}
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 text-left"
                    >
                      {labels[resolution]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Escalate to dispute */}
          {ticket.type !== "dispute" && ticket.order_id && ticket.status !== "resolved" && ticket.status !== "closed" && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <button
                onClick={async () => {
                  if (!confirm("Escalate this ticket to a dispute?")) return;
                  setDisputeAction(true);
                  const res = await fetch(`/api/admin/support/tickets/${ticketId}/dispute`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                  });
                  if (res.ok) fetchTicket();
                  setDisputeAction(false);
                }}
                disabled={disputeAction}
                className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Escalate to Dispute
              </button>
            </div>
          )}

          {/* Linked order */}
          {order && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                Linked Order
              </h3>
              <div className="space-y-1">
                <p className="text-sm font-mono text-slate-600">
                  {order.order_number}
                </p>
                <p className="text-xs text-slate-500">
                  {`Status: ${order.order_status}`}
                </p>
                <p className="text-xs text-slate-500">
                  {`Total: £${order.total_price}`}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(order.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
              <button
                onClick={() =>
                  router.push(`/admin/orders?search=${order.order_number}`)
                }
                className="text-xs text-brand-600 hover:underline"
              >
                View order
              </button>
            </div>
          )}

          {/* History */}
          <div className="bg-white rounded-xl border border-slate-200">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900"
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                History
              </span>
              {showHistory ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {showHistory && (
              <div className="px-6 pb-4 space-y-2 border-t border-slate-100 pt-3">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-400">No changes recorded.</p>
                ) : (
                  history.map((h) => (
                    <div key={h.id} className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        {h.changed_by_name}
                      </span>{" "}
                      changed{" "}
                      <span className="font-medium">{h.field_changed}</span>{" "}
                      from{" "}
                      <span className="line-through">{h.old_value || "—"}</span>{" "}
                      to{" "}
                      <span className="font-medium text-slate-900">
                        {h.new_value}
                      </span>
                      <span className="text-slate-400 ml-1">
                        {new Date(h.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
