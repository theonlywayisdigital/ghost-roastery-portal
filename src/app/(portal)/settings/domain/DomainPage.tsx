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
  ExternalLink,
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
              By default, emails to your customers are sent from <span className="font-mono text-slate-600">noreply@roasteryplatform.com</span>. Add your own domain so emails display as <span className="font-mono text-slate-600">noreply@yourdomain.com</span> for better branding and deliverability.
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

            {/* Add custom domain form */}
            {!emailDomainsLoading && !emailUpgradeRequired && (
              <>
                <div className="flex gap-3 mb-6">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={emailDomainInput}
                      onChange={(e) => setEmailDomainInput(e.target.value)}
                      placeholder="yourdomain.com"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleAddEmailDomain}
                    disabled={emailAddingDomain || !emailDomainInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {emailAddingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Domain
                  </button>
                </div>
              </>
            )}

            {/* Existing domains */}
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

                    {/* DNS records */}
                    {domain.dns_records && domain.dns_records.length > 0 && domain.status !== "verified" && (
                      <div className="px-4 py-3 border-t border-slate-100">
                        {/* Setup guide */}
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                          <p className="text-xs font-medium text-blue-800 mb-1">What are DNS records?</p>
                          <p className="text-xs text-blue-700">
                            DNS records prove you own this domain. You need to add the records below in the DNS settings of your domain provider — this is usually where you bought your domain (e.g. GoDaddy, Cloudflare, Namecheap).
                          </p>
                          <p className="text-xs text-blue-600 mt-1.5">
                            Not sure who manages your domain? Check where you originally purchased or registered it.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">DNS Records</span>
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

            {/* Empty state */}
            {!emailDomainsLoading && emailDomains.length === 0 && !emailUpgradeRequired && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">
                  Your emails are currently sent from <span className="font-mono">noreply@roasteryplatform.com</span>. Add a domain above to use your own.
                </p>
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
