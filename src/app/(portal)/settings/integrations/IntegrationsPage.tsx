"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface XeroStatus {
  connected: boolean;
  is_active?: boolean;
  tenant_name?: string | null;
  auto_sync?: boolean;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  error?: string | null;
  connected_at?: string | null;
}

export function IntegrationsPage() {
  const [xeroStatus, setXeroStatus] = useState<XeroStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/xero/status");
      const data = await res.json();
      setXeroStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Check URL params for success/error from OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "xero") {
      setSuccessMessage("Xero connected successfully!");
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
    if (params.get("error")) {
      const errorMap: Record<string, string> = {
        unauthorized: "You must be logged in as a roaster to connect Xero.",
        missing_code: "OAuth flow was interrupted. Please try again.",
        invalid_state: "Invalid OAuth state. Please try again.",
        state_mismatch: "Security check failed. Please try again.",
        no_organisation:
          "No Xero organisation found. Make sure you have a Xero account.",
        save_failed: "Failed to save the connection. Please try again.",
        oauth_failed: "OAuth authentication failed. Please try again.",
      };
      const errorCode = params.get("error") || "";
      setSuccessMessage(null);
      setXeroStatus((prev) =>
        prev
          ? { ...prev, error: errorMap[errorCode] || `Error: ${errorCode}` }
          : { connected: false, error: errorMap[errorCode] || `Error: ${errorCode}` }
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadStatus]);

  async function handleDisconnect() {
    if (!confirm("Disconnect Xero? This will stop all automatic syncing."))
      return;
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/xero/disconnect", { method: "POST" });
      setXeroStatus({ connected: false });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleToggleAutoSync() {
    if (!xeroStatus?.connected) return;
    setToggling(true);
    try {
      const newValue = !xeroStatus.auto_sync;
      const res = await fetch("/api/integrations/xero/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_sync: newValue }),
      });
      if (res.ok) {
        setXeroStatus((prev) => (prev ? { ...prev, auto_sync: newValue } : prev));
      }
    } finally {
      setToggling(false);
    }
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500 mt-1">
          Connect external services to automatically sync your data.
        </p>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Error banner from OAuth */}
      {xeroStatus?.error && !xeroStatus.connected && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {xeroStatus.error}
        </div>
      )}

      {/* Xero Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Xero logo placeholder */}
            <div className="w-12 h-12 bg-[#13B5EA] rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">X</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Xero</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Automatically sync invoices, contacts, and payments with your
                Xero accounting software.
              </p>
            </div>
          </div>

          {/* Status badge */}
          {xeroStatus?.connected && (
            <span
              className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                xeroStatus.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {xeroStatus.is_active ? "Connected" : "Reconnect Required"}
            </span>
          )}
        </div>

        {/* Connected state */}
        {xeroStatus?.connected ? (
          <div className="mt-5 space-y-4">
            {/* Connection info */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Organisation</span>
                <span className="font-medium text-slate-900">
                  {xeroStatus.tenant_name || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Connected</span>
                <span className="text-slate-700">
                  {formatDate(xeroStatus.connected_at)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Last sync</span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  {xeroStatus.last_sync_status === "success" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  )}
                  {xeroStatus.last_sync_status === "error" && (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  {formatDate(xeroStatus.last_sync_at)}
                </span>
              </div>
            </div>

            {/* Error message */}
            {xeroStatus.error && xeroStatus.is_active && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{xeroStatus.error}</span>
              </div>
            )}

            {/* Reconnect prompt */}
            {!xeroStatus.is_active && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Reconnection required</p>
                  <p className="mt-0.5">
                    Your Xero access has expired or been revoked. Please
                    reconnect to resume syncing.
                  </p>
                </div>
              </div>
            )}

            {/* Auto-sync toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Auto-sync
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically push invoices, contacts, and payments to Xero
                </p>
              </div>
              <button
                onClick={handleToggleAutoSync}
                disabled={toggling}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                  xeroStatus.auto_sync ? "bg-brand-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    xeroStatus.auto_sync ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {!xeroStatus.is_active ? (
                <a
                  href="/api/integrations/xero/connect"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect Xero
                </a>
              ) : null}
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          /* Not connected state */
          <div className="mt-5">
            <a
              href="/api/integrations/xero/connect"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#13B5EA] text-white rounded-lg text-sm font-semibold hover:bg-[#0e9dcc] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Connect Xero
            </a>
            <p className="text-xs text-slate-400 mt-2">
              You&apos;ll be redirected to Xero to authorise access.
            </p>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          What gets synced?
        </h3>
        <ul className="text-sm text-slate-600 space-y-1.5">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span>
              <strong>Invoices</strong> — automatically created in Xero when you
              generate an invoice
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span>
              <strong>Contacts</strong> — synced when you approve a wholesale
              buyer or create a contact
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span>
              <strong>Payments</strong> — recorded in Xero when invoice payments
              are logged
            </span>
          </li>
        </ul>
      </div>
    </>
  );
}
