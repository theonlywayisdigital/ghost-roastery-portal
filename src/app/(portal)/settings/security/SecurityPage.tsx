"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  ShieldOff,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
} from "@/components/icons";
import { SettingsHeader } from "@/components/SettingsHeader";
import { createBrowserClient } from "@/lib/supabase";

type MfaState = "loading" | "disabled" | "setup" | "enabled";

interface FactorInfo {
  id: string;
  friendlyName: string | null;
  createdAt: string;
}

export function SecurityPage() {
  const [state, setState] = useState<MfaState>("loading");
  const [factor, setFactor] = useState<FactorInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Setup state
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [setupFactorId, setSetupFactorId] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Disable state
  const [disabling, setDisabling] = useState(false);

  const loadFactors = useCallback(async () => {
    setState("loading");
    try {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.mfa.listFactors();

      const verified = data?.totp?.filter((f) => f.status === "verified") || [];

      if (verified.length > 0) {
        setFactor({
          id: verified[0].id,
          friendlyName: verified[0].friendly_name ?? null,
          createdAt: verified[0].created_at,
        });
        setState("enabled");
      } else {
        setState("disabled");
      }
    } catch {
      setState("disabled");
    }
  }, []);

  useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  async function handleEnroll() {
    setError(null);
    try {
      const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to set up 2FA");
        return;
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setSetupFactorId(data.factorId);
      setState("setup");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  async function handleVerifySetup() {
    if (code.length !== 6) return;
    setVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/mfa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: setupFactorId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        setCode("");
        setVerifying(false);
        return;
      }

      // Reload factors to show enabled state
      setCode("");
      setQrCode("");
      setSecret("");
      setSetupFactorId("");
      await loadFactors();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setVerifying(false);
  }

  async function handleDisable() {
    if (!factor) return;
    setDisabling(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/mfa/unenroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: factor.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to disable 2FA");
        setDisabling(false);
        return;
      }

      setFactor(null);
      setState("disabled");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setDisabling(false);
  }

  function handleCopySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state === "loading") {
    return (
      <div>
        <SettingsHeader
          title="Security"
          description="Manage two-factor authentication."
          breadcrumb="Security"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SettingsHeader
        title="Security"
        description="Manage two-factor authentication."
        breadcrumb="Security"
      />

      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              {state === "enabled" ? (
                <ShieldCheck className="w-5 h-5 text-green-600" />
              ) : (
                <ShieldOff className="w-5 h-5 text-slate-400" />
              )}
              <h2 className="text-lg font-semibold text-slate-900">
                Two-Factor Authentication
              </h2>
              {state === "enabled" && (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Enabled
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* ─── Disabled State ─── */}
            {state === "disabled" && (
              <>
                <p className="text-sm text-slate-600 mb-4">
                  Add an extra layer of security to your account by requiring a verification code
                  from an authenticator app (such as Google Authenticator, Authy, or 1Password) when you sign in.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleEnroll}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  Enable 2FA
                </button>
              </>
            )}

            {/* ─── Setup State ─── */}
            {state === "setup" && (
              <div className="max-w-md">
                <p className="text-sm text-slate-600 mb-4">
                  Scan the QR code below with your authenticator app, then enter the 6-digit code to verify.
                </p>

                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-xl">
                    <img
                      src={qrCode}
                      alt="2FA QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {/* Secret key */}
                <div className="mb-6">
                  <p className="text-xs text-slate-500 mb-1.5">
                    {"Can't scan? Enter this key manually:"}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono break-all">
                      {secret}
                    </code>
                    <button
                      onClick={handleCopySecret}
                      className="p-2 border border-slate-300 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                      title="Copy secret"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Verification code input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-center text-lg tracking-widest"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setState("disabled");
                      setQrCode("");
                      setSecret("");
                      setSetupFactorId("");
                      setCode("");
                      setError(null);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifySetup}
                    disabled={verifying || code.length !== 6}
                    className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {verifying ? "Verifying..." : "Verify & Enable"}
                  </button>
                </div>
              </div>
            )}

            {/* ─── Enabled State ─── */}
            {state === "enabled" && factor && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    Two-factor authentication is enabled. You will be asked for a verification code
                    from your authenticator app each time you sign in.
                  </p>
                </div>

                <div className="text-sm text-slate-500 mb-4">
                  <p>
                    <span className="font-medium text-slate-700">Method:</span>{" "}
                    Authenticator app (TOTP)
                  </p>
                  {factor.createdAt && (
                    <p>
                      <span className="font-medium text-slate-700">Enabled:</span>{" "}
                      {new Date(factor.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleDisable}
                  disabled={disabling}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {disabling ? "Disabling..." : "Disable 2FA"}
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
