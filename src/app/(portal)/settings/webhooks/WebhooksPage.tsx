"use client";

import { useState, useEffect } from "react";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/webhooks";
import { Plus, Trash2, Pencil, X, Copy, Check, Zap } from "lucide-react";

interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: string[] | null;
  is_active: boolean;
  created_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  "invoice.created": "Invoice Created",
  "invoice.paid": "Invoice Paid",
  "order.placed": "Order Placed",
  "order.cancelled": "Order Cancelled",
  "buyer.approved": "Buyer Approved",
  "contact.created": "Contact Created",
};

export function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [allEvents, setAllEvents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  async function loadWebhooks() {
    try {
      const res = await fetch("/api/settings/webhooks");
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingId(null);
    setUrl("");
    setSelectedEvents([]);
    setAllEvents(true);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(wh: Webhook) {
    setEditingId(wh.id);
    setUrl(wh.url);
    if (wh.events && wh.events.length > 0) {
      setSelectedEvents(wh.events);
      setAllEvents(false);
    } else {
      setSelectedEvents([]);
      setAllEvents(true);
    }
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setUrl("");
    setSelectedEvents([]);
    setAllEvents(true);
    setError(null);
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  }

  async function handleSave() {
    if (!url) {
      setError("URL is required");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setSaving(true);
    setError(null);

    const events = allEvents ? null : selectedEvents;

    try {
      if (editingId) {
        const res = await fetch(`/api/settings/webhooks/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, events }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to update");
          return;
        }
        const data = await res.json();
        setWebhooks((prev) =>
          prev.map((w) => (w.id === editingId ? data.webhook : w))
        );
      } else {
        const res = await fetch("/api/settings/webhooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, events }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to create");
          return;
        }
        const data = await res.json();
        setWebhooks((prev) => [...prev, data.webhook]);
      }
      closeForm();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this webhook?")) return;
    await fetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleToggleActive(wh: Webhook) {
    const res = await fetch(`/api/settings/webhooks/${wh.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !wh.is_active }),
    });
    if (res.ok) {
      const data = await res.json();
      setWebhooks((prev) =>
        prev.map((w) => (w.id === wh.id ? data.webhook : w))
      );
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    setTestResult(null);

    try {
      const res = await fetch(`/api/settings/webhooks/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult({
        id,
        success: data.success,
        message: data.success
          ? `OK (${data.status} ${data.statusText})`
          : data.error || "Failed",
      });
    } catch {
      setTestResult({ id, success: false, message: "Request failed" });
    } finally {
      setTestingId(null);
    }
  }

  function copySecret(id: string, secret: string) {
    navigator.clipboard.writeText(secret);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-32 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-slate-500 mt-1">
            Send real-time event data to external services like Zapier or your
            accounting system.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {/* Webhook list */}
      {webhooks.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-1">No webhooks configured</p>
          <p className="text-sm text-slate-400">
            Add a webhook to send event notifications to external services.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {webhooks.map((wh) => (
          <div
            key={wh.id}
            className={`bg-white rounded-xl border p-5 ${
              wh.is_active
                ? "border-slate-200"
                : "border-slate-200 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono text-slate-900 truncate block">
                    {wh.url}
                  </code>
                  <span
                    className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      wh.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {wh.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-2">
                  {wh.events && wh.events.length > 0
                    ? wh.events.map((e) => EVENT_LABELS[e] || e).join(", ")
                    : "All events"}
                </p>

                {/* Secret */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Secret:</span>
                  <code className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                    {`${wh.secret.slice(0, 8)}...${wh.secret.slice(-4)}`}
                  </code>
                  <button
                    onClick={() => copySecret(wh.id, wh.secret)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Copy full secret"
                  >
                    {copiedId === wh.id ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Test result */}
                {testResult?.id === wh.id && (
                  <p
                    className={`text-xs mt-2 ${
                      testResult.success
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {testResult.success ? "Test sent: " : "Test failed: "}
                    {testResult.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleTest(wh.id)}
                  disabled={testingId === wh.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {testingId === wh.id ? "Sending..." : "Test"}
                </button>
                <button
                  onClick={() => handleToggleActive(wh)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title={wh.is_active ? "Disable" : "Enable"}
                >
                  <Zap
                    className={`w-4 h-4 ${wh.is_active ? "text-green-500" : ""}`}
                  />
                </button>
                <button
                  onClick={() => openEditForm(wh)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(wh.id)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingId ? "Edit Webhook" : "New Webhook"}
            </h3>
            <button
              onClick={closeForm}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Endpoint URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Events
              </label>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allEvents}
                  onChange={(e) => {
                    setAllEvents(e.target.checked);
                    if (e.target.checked) setSelectedEvents([]);
                  }}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">All events</span>
              </label>

              {!allEvents && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  {WEBHOOK_EVENTS.map((event) => (
                    <label
                      key={event}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-600">
                        {EVENT_LABELS[event] || event}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={closeForm}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Webhook"
                  : "Create Webhook"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
