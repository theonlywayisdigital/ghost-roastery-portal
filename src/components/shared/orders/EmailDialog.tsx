"use client";

import { useState } from "react";
import { Send } from "@/components/icons";
import type { OrderType } from "@/types/admin";

interface EmailDialogProps {
  orderId: string;
  orderType: OrderType;
  recipientEmail: string;
  onClose: () => void;
  onSent: () => void;
}

const templates: Record<string, { subject: string; body: string }> = {
  artwork_approved: {
    subject: "Your label artwork has been approved",
    body: "Great news! Your label artwork has been reviewed and approved. We'll now proceed with printing and production.",
  },
  artwork_needs_changes: {
    subject: "Artwork revision needed",
    body: "We've reviewed your label artwork and have some feedback. Please review the notes below and submit an updated version.",
  },
  order_shipped: {
    subject: "Your order has been dispatched",
    body: "Your order has been dispatched and is on its way! You can track your delivery using the tracking information provided.",
  },
  order_delayed: {
    subject: "Order update",
    body: "We wanted to let you know about a delay with your order. We're working to get things back on track.",
  },
};

export function EmailDialog({ orderId, orderType, recipientEmail, onClose, onSent }: EmailDialogProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState("");

  function handleTemplateChange(key: string) {
    setTemplate(key);
    if (key && templates[key]) {
      setSubject(templates[key].subject);
      setBody(templates[key].body);
    }
  }

  async function handleSend() {
    if (!subject || !body) return;
    setSending(true);
    try {
      await fetch(`/api/admin/orders/${orderId}/communicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: template || "custom",
          subject,
          bodyText: body,
          recipientEmail,
          orderType,
        }),
      });
      onSent();
    } catch {
      alert("Failed to send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Send Email</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 font-medium">Template</label>
            <select
              value={template}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Custom message</option>
              <option value="artwork_approved">Artwork Approved</option>
              <option value="artwork_needs_changes">Artwork Needs Changes</option>
              <option value="order_shipped">Order Shipped</option>
              <option value="order_delayed">Order Delayed</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">To</label>
            <p className="text-sm text-slate-700 mt-1">{recipientEmail}</p>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!subject || !body || sending}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
