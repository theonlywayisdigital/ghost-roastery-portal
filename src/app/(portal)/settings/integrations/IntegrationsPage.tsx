"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface IntegrationStatus {
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
  const [xeroStatus, setXeroStatus] = useState<IntegrationStatus | null>(null);
  const [sageStatus, setSageStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const [xeroRes, sageRes] = await Promise.all([
        fetch("/api/integrations/xero/status"),
        fetch("/api/integrations/sage/status"),
      ]);
      const [xeroData, sageData] = await Promise.all([
        xeroRes.json(),
        sageRes.json(),
      ]);
      setXeroStatus(xeroData);
      setSageStatus(sageData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Check URL params for success/error from OAuth callback
    const params = new URLSearchParams(window.location.search);
    const successParam = params.get("success");
    if (successParam === "xero") {
      setSuccessMessage("Xero connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else if (successParam === "sage") {
      setSuccessMessage("Sage connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSuccessMessage(null), 5000);
    }

    if (params.get("error")) {
      const errorMap: Record<string, string> = {
        unauthorized: "You must be logged in as a roaster to connect.",
        missing_code: "OAuth flow was interrupted. Please try again.",
        invalid_state: "Invalid OAuth state. Please try again.",
        state_mismatch: "Security check failed. Please try again.",
        no_organisation:
          "No organisation found. Make sure you have an account.",
        save_failed: "Failed to save the connection. Please try again.",
        oauth_failed: "OAuth authentication failed. Please try again.",
      };
      const errorCode = params.get("error") || "";
      setSuccessMessage(null);
      // Show error on the appropriate provider or generically
      const errorMsg = errorMap[errorCode] || `Error: ${errorCode}`;
      setXeroStatus((prev) =>
        prev
          ? { ...prev, error: prev.connected ? prev.error : errorMsg }
          : { connected: false, error: errorMsg }
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadStatus]);

  async function handleDisconnect(provider: "xero" | "sage") {
    const label = provider === "xero" ? "Xero" : "Sage";
    if (!confirm(`Disconnect ${label}? This will stop all automatic syncing.`))
      return;
    setDisconnecting(provider);
    try {
      await fetch(`/api/integrations/${provider}/disconnect`, {
        method: "POST",
      });
      const setter = provider === "xero" ? setXeroStatus : setSageStatus;
      setter({ connected: false });
    } finally {
      setDisconnecting(null);
    }
  }

  async function handleToggleAutoSync(provider: "xero" | "sage") {
    const status = provider === "xero" ? xeroStatus : sageStatus;
    if (!status?.connected) return;
    setToggling(provider);
    try {
      const newValue = !status.auto_sync;
      const res = await fetch(`/api/integrations/${provider}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_sync: newValue }),
      });
      if (res.ok) {
        const setter = provider === "xero" ? setXeroStatus : setSageStatus;
        setter((prev) => (prev ? { ...prev, auto_sync: newValue } : prev));
      }
    } finally {
      setToggling(null);
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
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  function renderIntegrationCard(
    provider: "xero" | "sage",
    status: IntegrationStatus | null,
    config: {
      label: string;
      description: string;
      bgColor: string;
      hoverColor: string;
      logoLetter: string;
    }
  ) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-white font-bold text-lg">
                {config.logoLetter}
              </span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {config.label}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {config.description}
              </p>
            </div>
          </div>

          {status?.connected && (
            <span
              className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                status.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {status.is_active ? "Connected" : "Reconnect Required"}
            </span>
          )}
        </div>

        {status?.connected ? (
          <div className="mt-5 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Organisation</span>
                <span className="font-medium text-slate-900">
                  {status.tenant_name || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Connected</span>
                <span className="text-slate-700">
                  {formatDate(status.connected_at)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Last sync</span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  {status.last_sync_status === "success" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  )}
                  {status.last_sync_status === "error" && (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  {formatDate(status.last_sync_at)}
                </span>
              </div>
            </div>

            {status.error && status.is_active && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{status.error}</span>
              </div>
            )}

            {!status.is_active && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Reconnection required</p>
                  <p className="mt-0.5">
                    Your {config.label} access has expired or been revoked.
                    Please reconnect to resume syncing.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">Auto-sync</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically push invoices, contacts, and payments to{" "}
                  {config.label}
                </p>
              </div>
              <button
                onClick={() => handleToggleAutoSync(provider)}
                disabled={toggling === provider}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                  status.auto_sync ? "bg-brand-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    status.auto_sync ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {!status.is_active ? (
                <a
                  href={`/api/integrations/${provider}/connect`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect {config.label}
                </a>
              ) : null}
              <button
                onClick={() => handleDisconnect(provider)}
                disabled={disconnecting === provider}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {disconnecting === provider
                  ? "Disconnecting..."
                  : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <a
              href={`/api/integrations/${provider}/connect`}
              className={`inline-flex items-center gap-2 px-4 py-2 ${config.bgColor} text-white rounded-lg text-sm font-semibold ${config.hoverColor} transition-colors`}
            >
              <ExternalLink className="w-4 h-4" />
              Connect {config.label}
            </a>
            <p className="text-xs text-slate-400 mt-2">
              You&apos;ll be redirected to {config.label} to authorise access.
            </p>
          </div>
        )}
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

      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {xeroStatus?.error && !xeroStatus.connected && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {xeroStatus.error}
        </div>
      )}

      {sageStatus?.error && !sageStatus.connected && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {sageStatus.error}
        </div>
      )}

      <div className="space-y-4">
        {renderIntegrationCard("xero", xeroStatus, {
          label: "Xero",
          description:
            "Automatically sync invoices, contacts, and payments with your Xero accounting software.",
          bgColor: "bg-[#13B5EA]",
          hoverColor: "hover:bg-[#0e9dcc]",
          logoLetter: "X",
        })}

        {renderIntegrationCard("sage", sageStatus, {
          label: "Sage",
          description:
            "Automatically sync invoices, contacts, and payments with your Sage accounting software.",
          bgColor: "bg-[#00DC82]",
          hoverColor: "hover:bg-[#00c070]",
          logoLetter: "S",
        })}
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
              <strong>Invoices</strong> — automatically created when you generate
              an invoice
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
              <strong>Payments</strong> — recorded when invoice payments are
              logged
            </span>
          </li>
        </ul>
      </div>
    </>
  );
}
