"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, CheckCircle2, AlertCircle, Loader2, Trash2 } from "@/components/icons";

interface DomainState {
  domain: string | null;
  verified: boolean;
}

export default function WebsiteDomainPage() {
  const [input, setInput] = useState("");
  const [current, setCurrent] = useState<DomainState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load current domain
  const loadDomain = useCallback(async () => {
    try {
      const res = await fetch("/api/website/domain");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCurrent({ domain: data.domain, verified: data.verified });
      if (data.domain) setInput(data.domain);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDomain();
  }, [loadDomain]);

  // Save domain
  async function handleSave() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await fetch("/api/website/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: input.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save domain");
        return;
      }
      setCurrent({ domain: data.domain, verified: data.verified });
      setSuccess(data.message || "Domain saved successfully");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Verify domain
  async function handleVerify() {
    setError("");
    setSuccess("");
    setVerifying(true);
    try {
      const res = await fetch("/api/website/domain/verify", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      setCurrent({ domain: current!.domain, verified: data.verified });
      if (data.verified) {
        setSuccess("Domain verified successfully! Your site is now live.");
      } else {
        setError(data.message || "DNS not yet propagated. Please wait and try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  // Remove domain
  async function handleRemove() {
    if (!confirm("Remove this custom domain? Your site will only be accessible via your Roastery Platform URL.")) return;
    setError("");
    setSuccess("");
    setRemoving(true);
    try {
      const res = await fetch("/api/website/domain", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to remove domain");
        return;
      }
      setCurrent({ domain: null, verified: false });
      setInput("");
      setSuccess("Domain removed successfully");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const hasDomain = !!current?.domain;
  const isVerified = current?.verified ?? false;
  const domainChanged = hasDomain && input.trim().toLowerCase() !== current?.domain;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Custom Domain</h1>
      <p className="text-slate-500 text-sm mb-6">
        Connect your own domain to your website.
      </p>

      <div className="max-w-xl space-y-6">
        {/* Status banner */}
        {hasDomain && (
          <div
            className={`flex items-start gap-3 rounded-lg border p-4 ${
              isVerified
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            {isVerified ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${isVerified ? "text-emerald-800" : "text-amber-800"}`}>
                {isVerified ? "Domain verified and active" : "Pending DNS verification"}
              </p>
              <p className={`text-xs mt-0.5 ${isVerified ? "text-emerald-600" : "text-amber-600"}`}>
                {isVerified
                  ? `Your site is live at ${current.domain}`
                  : "Add the DNS record below and click Verify to complete setup"}
              </p>
            </div>
          </div>
        )}

        {/* Error / success messages */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-700">{success}</p>
          </div>
        )}

        {/* Domain input */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-slate-400" />
            Domain
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Custom Domain
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                placeholder="www.yourroastery.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Enter the full domain including www if applicable
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!input.trim() || saving || (hasDomain && !domainChanged)}
                className="px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : hasDomain && !domainChanged ? (
                  "Saved"
                ) : (
                  "Save Domain"
                )}
              </button>

              {hasDomain && !isVerified && (
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Verify DNS"
                  )}
                </button>
              )}

              {hasDomain && (
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove domain"
                >
                  {removing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* DNS Setup instructions */}
        {hasDomain && !isVerified && (
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">DNS Setup</h2>
            <p className="text-sm text-slate-500 mb-4">
              Add this DNS record at your domain provider (e.g. GoDaddy, Namecheap, Cloudflare):
            </p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm font-mono">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase">Type</span>
                  <p className="text-slate-900 font-semibold">CNAME</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase">Name</span>
                  <p className="text-slate-900 font-semibold">
                    {current.domain?.startsWith("www.") ? "www" : "@"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase">Value</span>
                  <p className="text-slate-900 font-semibold">cname.vercel-dns.com</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              DNS changes can take up to 48 hours to propagate, but usually complete within a few minutes.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
