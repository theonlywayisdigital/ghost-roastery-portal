"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Send, Loader2, Bot, MessageSquare, X } from "@/components/icons";
import type { TicketType, ChatMessage } from "@/types/support";
import { SupportChatbot } from "../../chat/SupportChatbot";

const CUSTOMER_TYPES: { value: TicketType; label: string }[] = [
  { value: "general", label: "General Question" },
  { value: "order_issue", label: "Order Issue" },
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical Issue" },
];

const ROASTER_TYPES: { value: TicketType; label: string }[] = [
  { value: "general", label: "General Question" },
  { value: "order_issue", label: "Order Issue" },
  { value: "payout", label: "Payout Query" },
  { value: "technical", label: "Technical Issue" },
  { value: "platform", label: "Platform Question" },
];

export function CreateTicket({ isRoaster }: { isRoaster: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showChat = searchParams.get("chat") === "true";
  const preOrderId = searchParams.get("orderId") || "";
  const preOrderNumber = searchParams.get("orderNumber") || "";

  const [subject, setSubject] = useState(
    preOrderNumber ? `Issue with order ${preOrderNumber}` : ""
  );
  const [type, setType] = useState<TicketType>(
    preOrderId ? "order_issue" : "general"
  );
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState(preOrderId);
  const [submitting, setSubmitting] = useState(false);
  const [chatVisible, setChatVisible] = useState(showChat);
  const [chatConversation, setChatConversation] = useState<ChatMessage[] | null>(null);

  const typeOptions = isRoaster ? ROASTER_TYPES : CUSTOMER_TYPES;

  // Fetch recent orders for linking
  const [orders, setOrders] = useState<
    { id: string; order_number: string }[]
  >([]);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/support/tickets?pageSize=1");
    // We'll just use the order selector — fetch from my-orders equivalent
    // For now, use the pre-populated orderId from URL params
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    setSubmitting(true);
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: subject.trim(),
        type,
        priority,
        description: description.trim(),
        order_id: orderId || null,
        chatbot_conversation: chatConversation,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/support/tickets/${data.ticket.id}`);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create ticket");
      setSubmitting(false);
    }
  };

  const handleChatEscalate = (messages: ChatMessage[]) => {
    setChatConversation(messages);
    setChatVisible(false);
    if (!subject) setSubject("Question from chat");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/support")}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">
          {chatVisible ? "Chat with AI Assistant" : "Create Support Ticket"}
        </h1>
      </div>

      {/* Chat toggle */}
      {!chatVisible && (
        <button
          onClick={() => setChatVisible(true)}
          className="flex items-center gap-2 w-full p-4 mb-6 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-700 hover:bg-brand-100 transition-colors"
        >
          <Bot className="w-5 h-5" />
          <span>
            Try our AI assistant first — it might answer your question
            instantly.
          </span>
        </button>
      )}

      {chatVisible ? (
        <div className="space-y-4">
          <SupportChatbot onEscalate={handleChatEscalate} />
          <button
            onClick={() => setChatVisible(false)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <MessageSquare className="w-4 h-4" />
            Skip to ticket form
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Chat context banner */}
          {chatConversation && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <Bot className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">
                {`Chat conversation (${chatConversation.length} messages) will be attached to this ticket.`}
              </span>
              <button
                type="button"
                onClick={() => setChatConversation(null)}
                className="text-blue-400 hover:text-blue-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue..."
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TicketType)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {typeOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Order ID (pre-populated or manual entry) */}
            {(preOrderId || type === "order_issue") && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Related Order
                </label>
                {preOrderNumber ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-sm font-mono text-slate-700">
                      {preOrderNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOrderId("");
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Order ID (optional)"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Describe your issue in detail..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !subject.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit Ticket
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
