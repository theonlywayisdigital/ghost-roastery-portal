"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
} from "@/components/icons";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface DirectMessage {
  id: string;
  external_id: string;
  provider: string;
  from_email: string;
  from_name: string | null;
  to_emails: { email: string; name?: string }[];
  cc_emails: { email: string; name?: string }[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  is_read: boolean;
  has_attachments: boolean;
  attachments: { filename: string; content_type: string; size: number }[];
  folder: string | null;
  received_at: string;
}

interface ConnectionInfo {
  id: string;
  provider: string;
  email_address: string;
  status: string;
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatRecipients(recipients: { email: string; name?: string }[]): string {
  return recipients
    .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
    .join(", ");
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

interface DirectThreadPageProps {
  threadId: string;
}

export function DirectThreadPage({ threadId }: DirectThreadPageProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  const replyRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, messages.length]);

  async function fetchThread() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inbox/direct/${encodeURIComponent(threadId)}`);
      if (!res.ok) {
        setMessages([]);
        return;
      }
      const data = await res.json();
      setMessages(data.messages || []);
      setConnection(data.connection || null);

      // Auto-expand the last message, collapse older ones
      if (data.messages && data.messages.length > 0) {
        const lastId = data.messages[data.messages.length - 1].id;
        setExpandedMessages(new Set([lastId]));
      }
    } catch {
      console.error("Failed to fetch thread");
    } finally {
      setLoading(false);
    }
  }

  function toggleMessage(id: string) {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSendReply() {
    if (!replyBody.trim()) return;

    setSending(true);
    setSendError("");
    setSendSuccess(false);

    try {
      // Wrap plain text in basic HTML paragraphs
      const htmlBody = replyBody
        .split("\n")
        .map((line) => `<p>${line || "&nbsp;"}</p>`)
        .join("");

      const res = await fetch(`/api/inbox/direct/${encodeURIComponent(threadId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyHtml: htmlBody }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSendError(data.error || "Failed to send reply");
        return;
      }

      setReplyBody("");
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);

      // Refresh the thread to show the sent message
      await fetchThread();
    } catch {
      setSendError("Failed to send reply. Please try again.");
    } finally {
      setSending(false);
    }
  }

  // Determine the subject from the first message
  const subject = messages[0]?.subject || "(No subject)";
  const canReply = connection?.status === "connected";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return <div className="text-center py-20 text-slate-400">Thread not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top bar: back link */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/inbox?view=direct"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Direct Comms
        </Link>

        {connection && (
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            via {connection.provider === "gmail" ? "Gmail" : "Outlook"} ({connection.email_address})
          </span>
        )}
      </div>

      {/* Subject header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h1 className="text-xl font-bold text-slate-900">{subject}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {messages.length} message{messages.length === 1 ? "" : "s"} in this conversation
        </p>
      </div>

      {/* Message list */}
      <div className="space-y-3 mb-6">
        {messages.map((msg, idx) => {
          const isExpanded = expandedMessages.has(msg.id);
          const isLast = idx === messages.length - 1;
          const isSent = msg.folder === "SENT" || msg.folder === "Sent Items";

          return (
            <div
              key={msg.id}
              className={`bg-white border rounded-xl overflow-hidden ${
                isSent ? "border-blue-200" : "border-slate-200"
              }`}
            >
              {/* Collapsed header — always visible */}
              <button
                onClick={() => toggleMessage(msg.id)}
                className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                {/* Avatar circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${
                  isSent ? "bg-blue-500" : "bg-slate-500"
                }`}>
                  {(msg.from_name || msg.from_email).charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {isSent ? "You" : (msg.from_name || msg.from_email)}
                    </span>
                    {isSent && (
                      <span className="text-xs text-blue-600 font-medium">Sent</span>
                    )}
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {msg.snippet || ""}
                    </p>
                  )}
                </div>

                <span className="text-xs text-slate-400 flex-shrink-0">
                  {formatShortDate(msg.received_at)}
                </span>

                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-4">
                  {/* From / To / CC / Date */}
                  <div className="space-y-1 mb-4 text-sm">
                    <div className="flex gap-2">
                      <span className="text-slate-500 w-10">From</span>
                      <span className="text-slate-900">
                        {msg.from_name
                          ? `${msg.from_name} <${msg.from_email}>`
                          : msg.from_email}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-500 w-10">To</span>
                      <span className="text-slate-600 truncate">
                        {formatRecipients(msg.to_emails)}
                      </span>
                    </div>
                    {msg.cc_emails.length > 0 && (
                      <div className="flex gap-2">
                        <span className="text-slate-500 w-10">CC</span>
                        <span className="text-slate-600 truncate">
                          {formatRecipients(msg.cc_emails)}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <span className="text-slate-500 w-10">Date</span>
                      <span className="text-slate-600">{formatDateTime(msg.received_at)}</span>
                    </div>
                  </div>

                  {/* Attachments */}
                  {msg.has_attachments && msg.attachments.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {msg.attachments.map((att, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600"
                        >
                          {att.filename}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Body */}
                  {msg.body_html ? (
                    <div
                      className="prose prose-sm max-w-none prose-slate"
                      dangerouslySetInnerHTML={{ __html: msg.body_html }}
                    />
                  ) : msg.body_text ? (
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {msg.body_text}
                    </pre>
                  ) : (
                    <p className="text-slate-400 text-sm italic">No content</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply composer */}
      <div ref={bottomRef} className="bg-white border border-slate-200 rounded-xl p-5">
        {canReply ? (
          <>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Reply</h3>

            {sendSuccess && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                Reply sent successfully.
              </div>
            )}

            {sendError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {sendError}
              </div>
            )}

            <textarea
              ref={replyRef}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Type your reply..."
              rows={5}
              className="w-full px-3 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-y"
            />

            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-slate-400">
                Replying via {connection?.provider === "gmail" ? "Gmail" : "Outlook"} ({connection?.email_address})
              </p>
              <button
                onClick={handleSendReply}
                disabled={sending || !replyBody.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {sending ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 mb-2">
              Your email account is disconnected. Reconnect to reply.
            </p>
            <Link
              href="/settings/integrations?tab=communications"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Reconnect
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
