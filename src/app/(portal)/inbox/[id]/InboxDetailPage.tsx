"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "@/components/icons";

interface Attachment {
  filename: string;
  content_type: string;
  size: number;
  url: string;
}

interface InboxMessage {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  attachments: Attachment[];
  is_read: boolean;
  is_archived: boolean;
  is_converted: boolean;
  converted_order_id: string | null;
  received_at: string;
  prevId: string | null;
  nextId: string | null;
}

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface InboxDetailPageProps {
  messageId: string;
}

export function InboxDetailPage({ messageId }: InboxDetailPageProps) {
  const router = useRouter();
  const [message, setMessage] = useState<InboxMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

  useEffect(() => {
    fetch(`/api/inbox/${messageId}`)
      .then((res) => res.json())
      .then(setMessage)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [messageId]);

  async function handleArchive() {
    if (!message) return;
    setActionLoading(true);
    try {
      await fetch(`/api/inbox/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: !message.is_archived }),
      });
      router.push("/inbox");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this message permanently?")) return;
    setActionLoading(true);
    try {
      await fetch(`/api/inbox/${messageId}`, { method: "DELETE" });
      router.push("/inbox");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleRead() {
    if (!message) return;
    const newRead = !message.is_read;
    await fetch(`/api/inbox/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: newRead }),
    });
    setMessage({ ...message, is_read: newRead });
  }

  async function handleConvertToOrder() {
    setExtracting(true);
    setExtractError("");
    try {
      const res = await fetch(`/api/inbox/${messageId}/extract-order`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setExtractError(data.error || "Extraction failed");
        return;
      }

      const extraction = data.extraction;

      // Check for low confidence with no items
      if (extraction.confidence === "low" && extraction.items.length === 0) {
        setExtractError(
          "Couldn't extract order details from this email. You can create an order manually."
        );
        return;
      }

      // Store extraction data in sessionStorage for the create order page to pick up
      sessionStorage.setItem(
        "inbox_order_extraction",
        JSON.stringify({
          ...extraction,
          inboxMessageId: messageId,
          fromEmail: message?.from_email,
          fromName: message?.from_name,
          subject: message?.subject,
        })
      );

      // Navigate to create order page
      router.push("/orders/new?from=inbox");
    } catch {
      setExtractError("Failed to extract order details. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!message) {
    return <div className="text-center py-20 text-slate-400">Message not found</div>;
  }

  return (
    <div>
      {/* Top bar: back + navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Inbox
        </Link>

        <div className="flex items-center gap-2">
          {message.prevId && (
            <button
              onClick={() => router.push(`/inbox/${message.prevId}`)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
              title="Previous message"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {message.nextId && (
            <button
              onClick={() => router.push(`/inbox/${message.nextId}`)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
              title="Next message"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Extraction error banner */}
      {extractError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800">{extractError}</p>
            <button
              onClick={() => router.push("/orders/new")}
              className="text-sm text-amber-700 underline mt-1 hover:text-amber-900"
            >
              Create order manually
            </button>
          </div>
          <button onClick={() => setExtractError("")} className="text-amber-400 hover:text-amber-600">
            &times;
          </button>
        </div>
      )}

      {/* Email header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 mb-3">
              {message.subject || "(No subject)"}
            </h1>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 w-12">From</span>
                <span className="text-slate-900 font-medium">
                  {message.from_name
                    ? `${message.from_name} <${message.from_email}>`
                    : message.from_email}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 w-12">To</span>
                <span className="text-slate-600">{message.to_email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 w-12">Date</span>
                <span className="text-slate-600">{formatDateTime(message.received_at)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <button
              onClick={handleToggleRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title={message.is_read ? "Mark as unread" : "Mark as read"}
            >
              {message.is_read ? (
                <Mail className="w-4 h-4" />
              ) : (
                <MailOpen className="w-4 h-4" />
              )}
              {message.is_read ? "Unread" : "Read"}
            </button>

            <button
              onClick={handleArchive}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Archive className="w-4 h-4" />
              {message.is_archived ? "Unarchive" : "Archive"}
            </button>

            {message.is_converted ? (
              <Link
                href={`/orders/${message.converted_order_id}?type=wholesale`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                View Order
              </Link>
            ) : (
              <button
                onClick={handleConvertToOrder}
                disabled={extracting || actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Convert to Order
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Attachments */}
      {message.attachments?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {`${message.attachments.length} Attachment${message.attachments.length === 1 ? "" : "s"}`}
          </h3>
          <div className="flex flex-wrap gap-3">
            {message.attachments.map((att, i) => (
              <a
                key={i}
                href={att.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ${
                  !att.url ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-900">{att.filename}</p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(att.size)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Email body */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {message.body_html ? (
          <div
            className="prose prose-sm max-w-none prose-slate"
            dangerouslySetInnerHTML={{ __html: message.body_html }}
          />
        ) : message.body_text ? (
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
            {message.body_text}
          </pre>
        ) : (
          <p className="text-slate-400 text-sm italic">No content</p>
        )}
      </div>
    </div>
  );
}
