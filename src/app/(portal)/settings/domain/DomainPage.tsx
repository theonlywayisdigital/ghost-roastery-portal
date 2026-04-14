"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Globe,
  Mail,
  Inbox,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  Plus,
  Trash2,
  Pencil,
  X,
  Copy,
  Shield,
  Crown,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Users,
} from "lucide-react";

interface EmailDomain {
  id: string;
  domain: string;
  resend_domain_id: string | null;
  status: string;
  dns_records: { type: string; name: string; value: string; ttl?: string; priority?: number }[] | null;
  sender_prefix: string;
  verified_at: string | null;
  created_at: string;
}

interface DomainPageProps {
  slug: string | null;
  businessName: string;
}

export function DomainPage({ slug, businessName }: DomainPageProps) {
  // ─── Slug management ───
  const [currentSlug, setCurrentSlug] = useState(slug || "");
  const [slugInput, setSlugInput] = useState(slug || "");
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSuccess, setSlugSuccess] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);
  const slugTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Email domain state ───
  const [emailDomains, setEmailDomains] = useState<EmailDomain[]>([]);
  const [emailDomainsLoading, setEmailDomainsLoading] = useState(true);
  const [emailDomainInput, setEmailDomainInput] = useState("");
  const [emailAddingDomain, setEmailAddingDomain] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState<string | null>(null);
  const [emailDeleting, setEmailDeleting] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState<string | null>(null);
  const [emailEditingPrefix, setEmailEditingPrefix] = useState<string | null>(null);
  const [emailPrefixValue, setEmailPrefixValue] = useState("");
  const [emailSavingPrefix, setEmailSavingPrefix] = useState(false);
  const [emailUpgradeRequired, setEmailUpgradeRequired] = useState(false);

  // ─── Email domain wizard ───
  const [wizardStep, setWizardStep] = useState<"intro" | "provider" | "delegate" | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [delegateMessageCopied, setDelegateMessageCopied] = useState(false);

  // ─── Inbox ───
  const [inboxCopied, setInboxCopied] = useState(false);

  // ─── Slug availability check ───
  useEffect(() => {
    if (!editingSlug) return;
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);

    if (!slugInput || slugInput.length < 3 || slugInput === currentSlug) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    slugTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/wholesale-portal/check-slug?slug=${encodeURIComponent(slugInput)}`
        );
        const data = await res.json();
        setSlugAvailable(data.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    };
  }, [slugInput, editingSlug, currentSlug]);

  // ─── Save slug ───
  async function handleSaveSlug() {
    if (!slugInput || slugInput.length < 3 || slugInput === currentSlug) return;
    setSavingSlug(true);
    setSlugError(null);
    try {
      const res = await fetch("/api/wholesale-portal/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 1, data: { storefront_slug: slugInput } }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSlugError(data.error || "Failed to update slug");
        return;
      }
      setCurrentSlug(slugInput);
      setEditingSlug(false);
      setSlugSuccess(true);
      setTimeout(() => setSlugSuccess(false), 3000);
    } catch {
      setSlugError("Failed to update slug");
    } finally {
      setSavingSlug(false);
    }
  }

  // ─── Load email domains ───
  const loadEmailDomains = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/email-domain");
      const data = await res.json();
      setEmailDomains(data.domains || []);
      if (data.featureAllowed === false) {
        setEmailUpgradeRequired(true);
      }
    } catch {
      // Non-critical
    } finally {
      setEmailDomainsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmailDomains();
  }, [loadEmailDomains]);

  // ─── Email domain handlers ───
  async function handleAddEmailDomain() {
    if (!emailDomainInput.trim()) return;
    setEmailAddingDomain(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/settings/email-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: emailDomainInput.trim(), senderPrefix: "noreply" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade_required) setEmailUpgradeRequired(true);
        setEmailError(data.error || "Failed to add domain");
        return;
      }
      setEmailDomains((prev) => [data.domain, ...prev]);
      setEmailDomainInput("");
    } catch {
      setEmailError("Failed to add domain");
    } finally {
      setEmailAddingDomain(false);
    }
  }

  async function handleVerifyEmailDomain(domainId: string) {
    setEmailVerifying(domainId);
    setEmailError(null);
    try {
      const res = await fetch("/api/settings/email-domain/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Verification failed");
        return;
      }
      setEmailDomains((prev) => prev.map((d) => (d.id === domainId ? data.domain : d)));
    } catch {
      setEmailError("Verification failed");
    } finally {
      setEmailVerifying(null);
    }
  }

  async function handleDeleteEmailDomain(domainId: string) {
    setEmailDeleting(domainId);
    setEmailError(null);
    try {
      const res = await fetch(`/api/settings/email-domain/${domainId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setEmailError(data.error || "Failed to delete domain");
        return;
      }
      setEmailDomains((prev) => prev.filter((d) => d.id !== domainId));
    } catch {
      setEmailError("Failed to delete domain");
    } finally {
      setEmailDeleting(null);
    }
  }

  async function handleSaveSenderPrefix(domainId: string) {
    setEmailSavingPrefix(true);
    setEmailError(null);
    try {
      const res = await fetch(`/api/settings/email-domain/${domainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderPrefix: emailPrefixValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Failed to update prefix");
        return;
      }
      setEmailDomains((prev) => prev.map((d) => (d.id === domainId ? data.domain : d)));
      setEmailEditingPrefix(null);
    } catch {
      setEmailError("Failed to update prefix");
    } finally {
      setEmailSavingPrefix(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setEmailCopied(id);
    setTimeout(() => setEmailCopied(null), 2000);
  }

  const inboxAddress = currentSlug ? `${currentSlug}@inbox.roasteryplatform.com` : null;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Domain & Identity</h1>
        <p className="text-slate-500 mt-1">
          Configure your portal subdomain, custom email domain, and platform inbox.
        </p>
      </div>

      <div className="space-y-6">
        {/* ═══════════════════════════════════════════════ */}
        {/* Section 1: Subdomain                           */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Subdomain</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Your address on Roastery Platform. This is the URL for your wholesale portal where buyers browse products and place orders. Setting up a subdomain also enables your platform inbox.
            </p>
          </div>

          <div className="p-6">
            {currentSlug ? (
              <>
                {/* Current URL display */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg mb-4">
                  <Globe className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 font-mono truncate">
                      {currentSlug}.roasteryplatform.com
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${currentSlug}.roasteryplatform.com`);
                        setSlugCopied(true);
                        setTimeout(() => setSlugCopied(false), 2000);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600"
                      title="Copy URL"
                    >
                      {slugCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={`/s/${currentSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-brand-600"
                      title="Visit wholesale portal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Success message */}
                {slugSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Subdomain updated successfully.
                  </div>
                )}

                {/* Edit slug */}
                {editingSlug ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Change subdomain
                    </label>
                    <div className="flex items-center gap-0 mb-2">
                      <input
                        type="text"
                        value={slugInput}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                          setSlugInput(val);
                        }}
                        placeholder="your-roastery"
                        maxLength={30}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-l-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                      <span className="px-3 py-2 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-sm text-slate-500 whitespace-nowrap">
                        .roasteryplatform.com
                      </span>
                    </div>

                    {/* Availability */}
                    <div className="h-5 mb-3">
                      {checkingSlug && (
                        <span className="text-sm text-slate-400 flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Checking...
                        </span>
                      )}
                      {!checkingSlug && slugAvailable === true && slugInput.length >= 3 && slugInput !== currentSlug && (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Available
                        </span>
                      )}
                      {!checkingSlug && slugAvailable === false && slugInput.length >= 3 && (
                        <span className="text-sm text-red-600 flex items-center gap-1">
                          <X className="w-3.5 h-3.5" />
                          Not available
                        </span>
                      )}
                    </div>

                    {slugError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3 text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{slugError}</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-400 mb-4">
                      3-30 characters. Lowercase letters, numbers, and hyphens only.
                    </p>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveSlug}
                        disabled={
                          savingSlug ||
                          !slugInput ||
                          slugInput.length < 3 ||
                          slugInput === currentSlug ||
                          slugAvailable === false
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingSlug ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingSlug(false);
                          setSlugInput(currentSlug);
                          setSlugAvailable(null);
                          setSlugError(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingSlug(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Change subdomain
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No subdomain configured yet.</p>
                <Link
                  href="/wholesale-portal/setup"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Set up your wholesale portal
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* Section 2: Custom Email Domain                 */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Custom Email Domain</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              By default, emails to your customers are sent from <span className="font-mono text-slate-600">noreply@roasteryplatform.com</span>. Connect your own domain so emails come from your brand instead.
            </p>
          </div>

          <div className="p-6">
            {/* Upgrade required */}
            {emailUpgradeRequired && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Upgrade required</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Custom email domains are available on the Starter plan and above.
                  </p>
                  <Link
                    href="/settings/billing?tab=subscription"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-amber-800 hover:text-amber-900"
                  >
                    Upgrade your plan
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Error message */}
            {emailError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{emailError}</span>
                <button onClick={() => setEmailError(null)} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Loading */}
            {emailDomainsLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            )}

            {/* ─── Existing domains (shown when domains exist) ─── */}
            {!emailDomainsLoading && emailDomains.length > 0 && (
              <div className="space-y-4">
                {emailDomains.map((domain) => (
                  <div key={domain.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Domain header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900 font-mono">{domain.domain}</span>
                      <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                        domain.status === "verified"
                          ? "bg-green-50 text-green-700"
                          : domain.status === "failed" || domain.status === "temporary_failure"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {domain.status === "verified" ? (
                          <><CheckCircle2 className="w-3 h-3" /> Verified</>
                        ) : domain.status === "failed" || domain.status === "temporary_failure" ? (
                          <><XCircle className="w-3 h-3" /> Failed</>
                        ) : domain.status === "pending" ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Pending</>
                        ) : (
                          <><AlertCircle className="w-3 h-3" /> Not Started</>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleVerifyEmailDomain(domain.id)}
                          disabled={emailVerifying === domain.id || domain.status === "verified"}
                          className="p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Check verification status"
                        >
                          {emailVerifying === domain.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteEmailDomain(domain.id)}
                          disabled={emailDeleting === domain.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-50"
                          title="Remove domain"
                        >
                          {emailDeleting === domain.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Sender prefix */}
                    <div className="px-4 py-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">Sender:</span>
                        {emailEditingPrefix === domain.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={emailPrefixValue}
                              onChange={(e) => setEmailPrefixValue(e.target.value)}
                              className="px-2 py-1 text-xs font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 w-32"
                            />
                            <span className="text-xs text-slate-400 font-mono">@{domain.domain}</span>
                            <button
                              onClick={() => handleSaveSenderPrefix(domain.id)}
                              disabled={emailSavingPrefix}
                              className="p-1 text-green-600 hover:text-green-700"
                            >
                              {emailSavingPrefix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setEmailEditingPrefix(null)} className="p-1 text-slate-400 hover:text-slate-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-700">{domain.sender_prefix}@{domain.domain}</span>
                            <button
                              onClick={() => {
                                setEmailEditingPrefix(domain.id);
                                setEmailPrefixValue(domain.sender_prefix);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DNS records — show wizard-style provider instructions when pending */}
                    {domain.dns_records && domain.dns_records.length > 0 && domain.status !== "verified" && (
                      <div className="px-4 py-3 border-t border-slate-100">
                        {/* Provider-aware instructions */}
                        {!selectedProvider ? (
                          <>
                            <p className="text-sm font-medium text-slate-700 mb-1">Where is your domain managed?</p>
                            <p className="text-xs text-slate-500 mb-3">
                              Select your domain provider below so we can show you step-by-step instructions for adding these records.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                              {[
                                { id: "godaddy", label: "GoDaddy" },
                                { id: "namecheap", label: "Namecheap" },
                                { id: "cloudflare", label: "Cloudflare" },
                                { id: "123reg", label: "123-reg" },
                                { id: "onecom", label: "One.com" },
                                { id: "squarespace", label: "Squarespace" },
                                { id: "wix", label: "Wix" },
                                { id: "other", label: "Other" },
                              ].map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => setSelectedProvider(p.id)}
                                  className="px-3 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedProvider(null)}
                              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3"
                            >
                              <ArrowLeft className="w-3 h-3" />
                              Change provider
                            </button>

                            {/* Provider-specific instructions */}
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                              <p className="text-xs font-medium text-blue-800 mb-1.5">
                                How to add DNS records in {
                                  { godaddy: "GoDaddy", namecheap: "Namecheap", cloudflare: "Cloudflare", "123reg": "123-reg", onecom: "One.com", squarespace: "Squarespace", wix: "Wix", other: "your provider" }[selectedProvider]
                                }
                              </p>
                              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                                {selectedProvider === "godaddy" && (
                                  <>
                                    <li>Log in to your GoDaddy account and go to <strong>My Products</strong></li>
                                    <li>Find your domain and click <strong>DNS</strong> (or <strong>Manage DNS</strong>)</li>
                                    <li>Click <strong>Add New Record</strong></li>
                                    <li>For each record below, select the correct <strong>Type</strong>, paste the <strong>Name</strong> and <strong>Value</strong>, then save</li>
                                  </>
                                )}
                                {selectedProvider === "namecheap" && (
                                  <>
                                    <li>Log in to Namecheap and go to <strong>Domain List</strong></li>
                                    <li>Click <strong>Manage</strong> next to your domain</li>
                                    <li>Go to the <strong>Advanced DNS</strong> tab</li>
                                    <li>Click <strong>Add New Record</strong> for each record below, selecting the correct type and pasting the Name and Value</li>
                                  </>
                                )}
                                {selectedProvider === "cloudflare" && (
                                  <>
                                    <li>Log in to Cloudflare and select your domain</li>
                                    <li>Go to <strong>DNS</strong> &rarr; <strong>Records</strong></li>
                                    <li>Click <strong>Add Record</strong></li>
                                    <li>For each record below, choose the correct type, paste the Name and Content (Value), and set <strong>Proxy status</strong> to <strong>DNS only</strong> (grey cloud)</li>
                                  </>
                                )}
                                {selectedProvider === "123reg" && (
                                  <>
                                    <li>Log in to 123-reg and go to your <strong>Control Panel</strong></li>
                                    <li>Select your domain and click <strong>Manage DNS</strong></li>
                                    <li>Click <strong>Add New Record</strong></li>
                                    <li>For each record below, select the type, paste the Hostname (Name) and Destination (Value), then save</li>
                                  </>
                                )}
                                {selectedProvider === "onecom" && (
                                  <>
                                    <li>Log in to One.com and go to <strong>DNS settings</strong> for your domain</li>
                                    <li>Click <strong>Create custom record</strong></li>
                                    <li>For each record below, select the type, paste the Name and Value fields, then save</li>
                                  </>
                                )}
                                {selectedProvider === "squarespace" && (
                                  <>
                                    <li>Go to your Squarespace dashboard and click <strong>Settings</strong> &rarr; <strong>Domains</strong></li>
                                    <li>Click the domain you want to configure</li>
                                    <li>Click <strong>DNS Settings</strong> (under <strong>Advanced Settings</strong>)</li>
                                    <li>Click <strong>Add Record</strong> for each record below, choosing the correct type and pasting the Host (Name) and Data (Value)</li>
                                  </>
                                )}
                                {selectedProvider === "wix" && (
                                  <>
                                    <li>Log in to Wix and go to <strong>Domains</strong> in your dashboard</li>
                                    <li>Click the three dots next to your domain and select <strong>Manage DNS Records</strong></li>
                                    <li>Click <strong>Add Record</strong> in the appropriate section</li>
                                    <li>For each record below, enter the Host Name (Name) and Value, then save</li>
                                  </>
                                )}
                                {selectedProvider === "other" && (
                                  <>
                                    <li>Log in to your domain provider&apos;s dashboard</li>
                                    <li>Find the <strong>DNS settings</strong> or <strong>DNS management</strong> area</li>
                                    <li>Add each record below by selecting the correct type and pasting the Name and Value</li>
                                    <li>If you&apos;re not sure where to find this, search for &ldquo;add DNS record&rdquo; in your provider&apos;s help centre</li>
                                  </>
                                )}
                              </ol>
                            </div>
                          </>
                        )}

                        {/* DNS records table */}
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">DNS Records to Add</span>
                        </div>
                        <div className="space-y-2">
                          {domain.dns_records.map((record, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-lg text-xs font-mono">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold uppercase">
                                  {record.type}
                                </span>
                                {record.priority !== undefined && (
                                  <span className="text-slate-400">Priority: {record.priority}</span>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 shrink-0 w-10">Name</span>
                                  <span className="flex-1 text-slate-700 truncate" title={record.name}>{record.name}</span>
                                  <button
                                    onClick={() => copyToClipboard(record.name, `${domain.id}-${idx}-name`)}
                                    className="shrink-0 p-1 text-slate-400 hover:text-slate-600"
                                    title="Copy name"
                                  >
                                    {emailCopied === `${domain.id}-${idx}-name` ? (
                                      <Check className="w-3.5 h-3.5 text-green-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-slate-400 shrink-0 w-10 mt-0.5">Value</span>
                                  <span className="flex-1 text-slate-700 break-all" title={record.value}>{record.value}</span>
                                  <button
                                    onClick={() => copyToClipboard(record.value, `${domain.id}-${idx}-value`)}
                                    className="shrink-0 p-1 text-slate-400 hover:text-slate-600"
                                    title="Copy value"
                                  >
                                    {emailCopied === `${domain.id}-${idx}-value` ? (
                                      <Check className="w-3.5 h-3.5 text-green-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Propagation note */}
                        <div className="flex items-start gap-2 mt-3 p-3 bg-slate-50 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-500">
                            DNS changes can take up to 48 hours to propagate. Once you&apos;ve added the records above, click the <RefreshCw className="w-3 h-3 inline" /> refresh button next to your domain to check the verification status.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Verified confirmation */}
                    {domain.status === "verified" && (
                      <div className="px-4 py-3 border-t border-slate-100 bg-green-50">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700">
                            Domain verified. All emails will be sent from <strong>{domain.sender_prefix}@{domain.domain}</strong>.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ─── Wizard flow (shown when no domains added yet) ─── */}
            {!emailDomainsLoading && emailDomains.length === 0 && !emailUpgradeRequired && (
              <>
                {/* Persistent reassurance note */}
                <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-lg mb-6">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500">
                    Not ready to set this up right now? No problem — your emails will still send from <span className="font-mono text-slate-600">noreply@roasteryplatform.com</span> until your custom domain is verified.
                  </p>
                </div>

                {/* ─── Step 1: Qualifying question ─── */}
                {!wizardStep && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Do you manage your own domain?</p>
                    <p className="text-xs text-slate-500 mb-4">
                      To send emails from your own domain (e.g. <span className="font-mono">noreply@yourdomain.com</span>), we need to add a few settings to your domain&apos;s DNS. Don&apos;t worry — we&apos;ll walk you through it.
                    </p>

                    <div className="space-y-2">
                      <button
                        onClick={() => setWizardStep("provider")}
                        className="w-full flex items-center gap-3 p-4 text-left border border-slate-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100">
                          <CheckCircle2 className="w-5 h-5 text-brand-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">Yes, I manage my own domain</p>
                          <p className="text-xs text-slate-500 mt-0.5">I can log in to GoDaddy, Cloudflare, Namecheap, or a similar provider to change DNS settings.</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-brand-500" />
                      </button>

                      <button
                        onClick={() => setWizardStep("delegate")}
                        className="w-full flex items-center gap-3 p-4 text-left border border-slate-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-brand-100">
                          <Users className="w-5 h-5 text-slate-500 group-hover:text-brand-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">Someone else manages it</p>
                          <p className="text-xs text-slate-500 mt-0.5">A developer, web agency, or IT team handles my domain. I&apos;ll send them the details.</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-brand-500" />
                      </button>

                      <button
                        onClick={() => {
                          // Show inline tooltip
                          const el = document.getElementById("domain-help-tooltip");
                          if (el) el.classList.toggle("hidden");
                        }}
                        className="w-full flex items-center gap-3 p-4 text-left border border-slate-200 rounded-lg hover:border-slate-300 transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <HelpCircle className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">I&apos;m not sure</p>
                          <p className="text-xs text-slate-500 mt-0.5">I don&apos;t know who manages my domain or what DNS means.</p>
                        </div>
                      </button>
                    </div>

                    {/* Help tooltip (hidden by default) */}
                    <div id="domain-help-tooltip" className="hidden mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-2">How to find out who manages your domain</p>
                      <ul className="text-xs text-blue-700 space-y-1.5 list-disc list-inside">
                        <li>Think about where you bought your domain name (e.g. GoDaddy, Namecheap, 123-reg, Wix, Squarespace).</li>
                        <li>Check your email for a receipt or renewal notice — it will mention the provider.</li>
                        <li>If your website was set up by a web designer or agency, they may manage the domain for you. Ask them.</li>
                        <li>Still stuck? Choose <strong>&ldquo;Someone else manages it&rdquo;</strong> above and we&apos;ll give you a message to send to whoever built your website.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* ─── Step 2: Provider selection + domain entry ─── */}
                {wizardStep === "provider" && (
                  <div>
                    <button
                      onClick={() => { setWizardStep(null); setSelectedProvider(null); }}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-4"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back
                    </button>

                    {/* Sub-step: pick provider */}
                    {!selectedProvider && (
                      <>
                        <p className="text-sm font-medium text-slate-700 mb-1">Where is your domain managed?</p>
                        <p className="text-xs text-slate-500 mb-4">
                          This is the service where you purchased or registered your domain (e.g. yourdomain.com). Select your provider so we can show you the right instructions.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: "godaddy", label: "GoDaddy" },
                            { id: "namecheap", label: "Namecheap" },
                            { id: "cloudflare", label: "Cloudflare" },
                            { id: "123reg", label: "123-reg" },
                            { id: "onecom", label: "One.com" },
                            { id: "squarespace", label: "Squarespace" },
                            { id: "wix", label: "Wix" },
                            { id: "other", label: "Other" },
                          ].map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setSelectedProvider(p.id)}
                              className="px-3 py-3 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Sub-step: enter domain + see instructions */}
                    {selectedProvider && (
                      <>
                        <button
                          onClick={() => setSelectedProvider(null)}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-4"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Change provider
                        </button>

                        <p className="text-sm font-medium text-slate-700 mb-1">Enter your domain</p>
                        <p className="text-xs text-slate-500 mb-3">
                          Type the domain you want to send emails from (e.g. <span className="font-mono">yourdomain.com</span>). We&apos;ll generate the DNS records you need.
                        </p>

                        <div className="flex gap-3 mb-6">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={emailDomainInput}
                              onChange={(e) => setEmailDomainInput(e.target.value)}
                              placeholder="yourdomain.com"
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && emailDomainInput.trim()) handleAddEmailDomain();
                              }}
                            />
                          </div>
                          <button
                            onClick={handleAddEmailDomain}
                            disabled={emailAddingDomain || !emailDomainInput.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {emailAddingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            Continue
                          </button>
                        </div>

                        {/* Provider-specific instructions preview */}
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-xs font-medium text-blue-800 mb-1.5">
                            What happens next?
                          </p>
                          <p className="text-xs text-blue-700">
                            After you enter your domain, we&apos;ll show you the exact DNS records to add in{" "}
                            <strong>
                              {{ godaddy: "GoDaddy", namecheap: "Namecheap", cloudflare: "Cloudflare", "123reg": "123-reg", onecom: "One.com", squarespace: "Squarespace", wix: "Wix", other: "your provider" }[selectedProvider]}
                            </strong>{" "}
                            with step-by-step instructions. The whole process usually takes about 5 minutes.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ─── Step 3: Someone else manages it ─── */}
                {wizardStep === "delegate" && (
                  <div>
                    <button
                      onClick={() => setWizardStep(null)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-4"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back
                    </button>

                    <p className="text-sm font-medium text-slate-700 mb-1">Send these details to your developer or web manager</p>
                    <p className="text-xs text-slate-500 mb-4">
                      First, add your domain below so we can generate the DNS records. Then you can copy a ready-made message to send to the person who manages your domain.
                    </p>

                    {/* Domain entry for delegate flow */}
                    <div className="flex gap-3 mb-6">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={emailDomainInput}
                          onChange={(e) => setEmailDomainInput(e.target.value)}
                          placeholder="yourdomain.com"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && emailDomainInput.trim()) handleAddEmailDomain();
                          }}
                        />
                      </div>
                      <button
                        onClick={handleAddEmailDomain}
                        disabled={emailAddingDomain || !emailDomainInput.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {emailAddingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Generate Records
                      </button>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <p className="text-xs font-medium text-slate-600">Once your domain is added, we&apos;ll show you a copyable message with all the DNS records your developer needs to add.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ─── Delegate message for existing domains (shown after domain added in delegate flow) ─── */}
            {!emailDomainsLoading && emailDomains.length > 0 && wizardStep === "delegate" && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {emailDomains.filter(d => d.dns_records && d.dns_records.length > 0 && d.status !== "verified").map((domain) => {
                  const dnsText = (domain.dns_records || []).map((r, i) =>
                    `Record ${i + 1}:\n  Type: ${r.type}\n  Name: ${r.name}\n  Value: ${r.value}${r.priority !== undefined ? `\n  Priority: ${r.priority}` : ""}`
                  ).join("\n\n");

                  const delegateMessage = `Hi,\n\nI need the following DNS records added to ${domain.domain} for email verification. These are needed so I can send emails from my own domain via Roastery Platform.\n\n${dnsText}\n\nPlease let me know once these have been added. DNS changes can take up to 48 hours to take effect.\n\nThanks!`;

                  return (
                    <div key={domain.id}>
                      <p className="text-sm font-medium text-slate-700 mb-2">Copy this message and send it to your developer</p>
                      <div className="relative">
                        <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                          {delegateMessage}
                        </pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(delegateMessage);
                            setDelegateMessageCopied(true);
                            setTimeout(() => setDelegateMessageCopied(false), 2000);
                          }}
                          className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm"
                        >
                          {delegateMessageCopied ? (
                            <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy message</>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-3">
                        Once your developer has added the records, come back here and click the <RefreshCw className="w-3 h-3 inline" /> button next to your domain to verify.
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* Section 3: Inbox Address                       */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Platform Inbox Address</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Your dedicated email address on Roastery Platform. Emails sent to this address by your buyers will appear in your Inbox and can be converted into orders.
            </p>
          </div>

          <div className="p-6">
            {inboxAddress ? (
              <>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <Inbox className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 font-mono truncate">
                      {inboxAddress}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inboxAddress);
                      setInboxCopied(true);
                      setTimeout(() => setInboxCopied(false), 2000);
                    }}
                    className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600"
                    title="Copy address"
                  >
                    {inboxCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  Share this address with your wholesale buyers. When they email you here, the message lands in your Roastery Platform inbox where you can reply and convert enquiries into orders.
                </p>
              </>
            ) : (
              <div className="text-center py-6">
                <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">Inbox address not available yet</p>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Your inbox address is created automatically when you set up a subdomain. Head to the Subdomain section above to get started.
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </>
  );
}
