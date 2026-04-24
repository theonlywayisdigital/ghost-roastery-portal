"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Save,
  Send,
  TestTube,
  Clock,
  FileText,
  Paintbrush,
  Users,
  Eye,
  X,
  Plus,
  Search,
} from "@/components/icons";
import type { Campaign, EmailBlock, AudienceType, EmailTemplate } from "@/types/marketing";
import { VisualEditor } from "./editor/VisualEditor";
import { EmailPreview } from "./editor/EmailPreview";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import { useMarketingContext } from "@/lib/marketing-context";

const STEPS = [
  { id: "content", label: "Content", icon: Paintbrush },
  { id: "details", label: "Details", icon: FileText },
  { id: "audience", label: "Audience", icon: Users },
  { id: "review", label: "Review & Send", icon: Eye },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface CampaignEditorProps {
  campaignId: string;
}

export function CampaignEditor({ campaignId }: CampaignEditorProps) {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepId>("content");
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [content, setContent] = useState<EmailBlock[]>([]);
  const [emailBgColor, setEmailBgColor] = useState("#f8fafc");
  const [audienceType, setAudienceType] = useState<AudienceType>("all");
  const [customRecipients, setCustomRecipients] = useState<{ email: string; name?: string; contactId?: string }[]>([]);
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");

  // Branding
  const [brandAccentColour, setBrandAccentColour] = useState<string | null>(null);
  const [brandPrimaryColour, setBrandPrimaryColour] = useState<string | null>(null);
  const [brandBackgroundColour, setBrandBackgroundColour] = useState<string | null>(null);
  const [brandButtonColour, setBrandButtonColour] = useState<string | null>(null);
  const [brandButtonTextColour, setBrandButtonTextColour] = useState<string | null>(null);
  const [brandButtonStyle, setBrandButtonStyle] = useState<"sharp" | "rounded" | "pill" | null>(null);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandLogoSize, setBrandLogoSize] = useState<"small" | "medium" | "large">("medium");
  const [brandBusinessName, setBrandBusinessName] = useState<string>("");

  // Template selection
  const [templates, setTemplates] = useState<{ prebuilt: EmailTemplate[]; custom: EmailTemplate[] }>({ prebuilt: [], custom: [] });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Load campaign
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiBase}/campaigns/${campaignId}`);
        if (!res.ok) {
          router.replace(`${pageBase}/campaigns`);
          return;
        }
        const { campaign: c } = await res.json();
        setCampaign(c);
        setName(c.name || "");
        setSubject(c.subject || "");
        setPreviewText(c.preview_text || "");
        setFromName(c.from_name || "");
        setReplyTo(c.reply_to || "");
        setContent(c.content || []);
        setEmailBgColor(c.email_bg_color || "#f8fafc");
        setAudienceType(c.audience_type || "all");
        if (c.audience_filter?.emails) {
          setCustomRecipients(c.audience_filter.emails);
        }
        if (c.audience_filter?.form_ids) {
          setSelectedFormIds(c.audience_filter.form_ids);
        }
        setSelectedTemplateId(c.template_id || null);
      } catch {
        router.replace(`${pageBase}/campaigns`);
      }
      setLoading(false);
    }
    load();
  }, [campaignId, router]);

  // Load templates and branding
  useEffect(() => {
    fetch(`${apiBase}/templates`)
      .then((r) => {
        if (r.ok) return r.json();
        return { prebuilt: [], custom: [] };
      })
      .then((data) => setTemplates(data))
      .catch(() => {});

    fetch("/api/settings/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.brand_accent_colour) setBrandAccentColour(data.brand_accent_colour);
        if (data?.brand_primary_colour) setBrandPrimaryColour(data.brand_primary_colour);
        if (data?.storefront_bg_colour) setBrandBackgroundColour(data.storefront_bg_colour);
        if (data?.storefront_button_colour) setBrandButtonColour(data.storefront_button_colour);
        if (data?.storefront_button_text_colour) setBrandButtonTextColour(data.storefront_button_text_colour);
        if (data?.storefront_button_style) setBrandButtonStyle(data.storefront_button_style);
        if (data?.brand_logo_url) setBrandLogoUrl(data.brand_logo_url);
        if (data?.storefront_logo_size) setBrandLogoSize(data.storefront_logo_size);
        if (data?.business_name) setBrandBusinessName(data.business_name);
      })
      .catch(() => {});
  }, []);

  // Auto-save every 30s
  const saveDraft = useCallback(async () => {
    if (!campaign) return;
    setSaving(true);
    try {
      await fetch(`${apiBase}/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject,
          preview_text: previewText,
          from_name: fromName,
          reply_to: replyTo || null,
          content,
          email_bg_color: emailBgColor,
          audience_type: audienceType,
          audience_filter: audienceType === "custom"
            ? { emails: customRecipients }
            : audienceType === "form_submissions"
            ? { form_ids: selectedFormIds }
            : {},
          template_id: selectedTemplateId,
        }),
      });
    } catch {
      // Silently fail on auto-save
    }
    setSaving(false);
  }, [campaign, campaignId, name, subject, previewText, fromName, replyTo, content, emailBgColor, audienceType, customRecipients, selectedFormIds, selectedTemplateId]);

  useEffect(() => {
    if (!campaign) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(saveDraft, 30000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [saveDraft, campaign]);

  async function handleSave() {
    await saveDraft();
    setSuccess("Campaign saved");
    setTimeout(() => setSuccess(null), 2000);
  }

  async function handleSendTest() {
    setSendingTest(true);
    setError(null);
    try {
      await saveDraft();
      const res = await fetch(`${apiBase}/campaigns/${campaignId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Test email sent to ${data.sentTo}`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || "Failed to send test");
      }
    } catch {
      setError("Failed to send test email");
    }
    setSendingTest(false);
  }

  async function handleSend() {
    if (!confirm("Send this campaign to all selected recipients? This action cannot be undone.")) return;
    setSending(true);
    setError(null);
    try {
      await saveDraft();
      const body: Record<string, unknown> = {};
      if (scheduledAt) {
        body.scheduled_at = new Date(scheduledAt).toISOString();
      }
      const res = await fetch(`${apiBase}/campaigns/${campaignId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.scheduled) {
          setSuccess("Campaign scheduled!");
        } else {
          setSuccess(`Campaign sent to ${data.recipient_count} recipients!`);
        }
        setTimeout(() => router.push(`${pageBase}/campaigns`), 2000);
      } else {
        setError(data.error || "Failed to send campaign");
      }
    } catch {
      setError("Failed to send campaign");
    }
    setSending(false);
  }

  function handleSelectTemplate(template: EmailTemplate) {
    setSelectedTemplateId(template.id);
    setContent(template.content);
    if (template.email_bg_color) setEmailBgColor(template.email_bg_color);
  }

  // Extract text from email blocks for AI context
  function extractContentText(blocks: EmailBlock[]): string {
    return blocks
      .map((b) => {
        switch (b.type) {
          case "header": return b.data.text;
          case "text": return b.data.html.replace(/<[^>]*>/g, " ").trim();
          case "button": return b.data.text;
          default: return "";
        }
      })
      .filter(Boolean)
      .join(" ");
  }

  // Auto-generate subject and preview from email content
  async function autoGenerateSubjectPreview() {
    if (content.length === 0) return;
    if (subject && previewText) return; // Already filled

    const emailText = extractContentText(content);
    if (!emailText.trim()) return;

    setAutoGenerating(true);
    try {
      const requests: Promise<void>[] = [];

      if (!subject) {
        requests.push(
          fetch("/api/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "email_subject",
              instruction: "Generate a subject line for this email",
              context: { existingContent: emailText, campaignName: name },
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.options?.[0]) {
                setSubject(data.options[0].replace(/^\d+\.\s*/, ""));
              }
            })
        );
      }

      if (!previewText) {
        requests.push(
          fetch("/api/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "email_preview",
              instruction: "Generate preview text for this email",
              context: { existingContent: emailText, campaignName: name },
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.options?.[0]) {
                setPreviewText(data.options[0].replace(/^\d+\.\s*/, ""));
              }
            })
        );
      }

      await Promise.all(requests);
    } catch {
      // Silently fail — user can still type manually
    }
    setAutoGenerating(false);
  }

  // Handle step navigation with auto-generation
  function handleStepChange(newStep: StepId) {
    if (newStep === "details" && currentStep === "content") {
      setCurrentStep(newStep);
      autoGenerateSubjectPreview();
    } else {
      setCurrentStep(newStep);
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const canGoNext = stepIndex < STEPS.length - 1;
  const canGoBack = stepIndex > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const isContentStep = currentStep === "content";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              saveDraft();
              router.push(`${pageBase}/campaigns`);
            }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-bold text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
              placeholder="Campaign name"
            />
            <p className="text-xs text-slate-400 mt-0.5">
              {saving ? "Saving..." : "Draft"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 mb-4 bg-white rounded-xl border border-slate-200 p-1">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isComplete = i < stepIndex;
          return (
            <button
              key={step.id}
              onClick={() => handleStepChange(step.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-600 text-white"
                  : isComplete
                  ? "text-brand-700 hover:bg-brand-50"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {isComplete ? (
                <Check className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Step Content */}
      {isContentStep ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <VisualEditor
            blocks={content}
            onChange={setContent}
            emailBgColor={emailBgColor}
            onEmailBgColorChange={setEmailBgColor}
            onAiSubject={setSubject}
            onAiPreviewText={setPreviewText}
            templates={[...templates.prebuilt, ...templates.custom]}
            onSelectTemplate={handleSelectTemplate}
            brandAccentColour={brandAccentColour}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {currentStep === "details" && (
            <DetailsStep
              subject={subject}
              setSubject={setSubject}
              previewText={previewText}
              setPreviewText={setPreviewText}
              fromName={fromName}
              setFromName={setFromName}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              campaignName={name}
              autoGenerating={autoGenerating}
            />
          )}

          {currentStep === "audience" && (
            <AudienceStep
              audienceType={audienceType}
              setAudienceType={setAudienceType}
              customRecipients={customRecipients}
              setCustomRecipients={setCustomRecipients}
              selectedFormIds={selectedFormIds}
              setSelectedFormIds={setSelectedFormIds}
            />
          )}

          {currentStep === "review" && (
            <ReviewStep
              name={name}
              subject={subject}
              previewText={previewText}
              fromName={fromName}
              replyTo={replyTo}
              audienceType={audienceType}
              customRecipients={customRecipients}
              selectedFormIds={selectedFormIds}
              content={content}
              scheduledAt={scheduledAt}
              setScheduledAt={setScheduledAt}
              onSendTest={handleSendTest}
              sendingTest={sendingTest}
              onSend={handleSend}
              sending={sending}
              brandBusinessName={brandBusinessName}
              brandLogoUrl={brandLogoUrl}
              brandLogoSize={brandLogoSize}
              brandPrimaryColour={brandPrimaryColour}
              brandAccentColour={brandAccentColour}
              brandBackgroundColour={brandBackgroundColour}
              brandButtonColour={brandButtonColour}
              brandButtonTextColour={brandButtonTextColour}
              brandButtonStyle={brandButtonStyle}
            />
          )}
        </div>
      )}

      {/* Step Navigation */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => canGoBack && handleStepChange(STEPS[stepIndex - 1].id)}
          disabled={!canGoBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {canGoNext && (
          <button
            onClick={() => handleStepChange(STEPS[stepIndex + 1].id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step: Details ───

function DetailsStep({
  subject, setSubject, previewText, setPreviewText,
  fromName, setFromName, replyTo, setReplyTo, campaignName,
  autoGenerating,
}: {
  subject: string; setSubject: (v: string) => void;
  previewText: string; setPreviewText: (v: string) => void;
  fromName: string; setFromName: (v: string) => void;
  replyTo: string; setReplyTo: (v: string) => void;
  campaignName?: string;
  autoGenerating?: boolean;
}) {
  return (
    <div className="max-w-xl space-y-5">
      {autoGenerating && (
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg">
          <Loader2 className="w-3.5 h-3.5 text-violet-600 animate-spin" />
          <p className="text-xs text-violet-700 font-medium">
            Generating subject and preview from your email content...
          </p>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-slate-700">
            Subject Line <span className="text-red-500">*</span>
          </label>
          <AiGenerateButton
            type="email_subject"
            context={{ campaignName, existingContent: subject }}
            onSelect={setSubject}
            enableShortcut
          />
        </div>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={autoGenerating ? "Generating..." : "Your email subject..."}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-slate-700">Preview Text</label>
          <AiGenerateButton
            type="email_preview"
            context={{ campaignName, existingContent: previewText }}
            onSelect={setPreviewText}
          />
        </div>
        <input
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder={autoGenerating ? "Generating..." : "Brief preview shown in inbox..."}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-slate-400 mt-1">Auto-generated from your email content. Edit as needed.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">From Name</label>
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Your Brand"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reply-To Email</label>
          <input
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step: Audience ───

const AUDIENCE_OPTIONS: { value: AudienceType; label: string; description: string }[] = [
  { value: "all", label: "All Contacts", description: "Send to all active, subscribed contacts." },
  { value: "customers", label: "Customers", description: "Contacts tagged as customers." },
  { value: "wholesale", label: "Wholesale Buyers", description: "Contacts tagged as wholesale." },
  { value: "suppliers", label: "Suppliers", description: "Contacts tagged as suppliers." },
  { value: "leads", label: "Leads", description: "Contacts tagged as leads." },
  { value: "form_submissions", label: "Form Submitters", description: "Send to contacts who submitted one or more of your forms." },
  { value: "custom", label: "Specific Recipients", description: "Send to specific email addresses or selected contacts." },
];

type CustomRecipient = { email: string; name?: string; contactId?: string };

function AudienceStep({
  audienceType,
  setAudienceType,
  customRecipients,
  setCustomRecipients,
  selectedFormIds,
  setSelectedFormIds,
}: {
  audienceType: AudienceType;
  setAudienceType: (v: AudienceType) => void;
  customRecipients: CustomRecipient[];
  setCustomRecipients: (v: CustomRecipient[]) => void;
  selectedFormIds: string[];
  setSelectedFormIds: (v: string[]) => void;
}) {
  return (
    <div className="max-w-xl">
      <p className="text-sm text-slate-500 mb-4">
        Choose who should receive this campaign. Only active, subscribed contacts with an email address will be included.
      </p>
      <div className="space-y-2">
        {AUDIENCE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
              audienceType === opt.value
                ? "border-brand-600 bg-brand-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              type="radio"
              name="audience"
              value={opt.value}
              checked={audienceType === opt.value}
              onChange={() => setAudienceType(opt.value)}
              className="mt-0.5 accent-brand-600"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">{opt.label}</p>
              <p className="text-xs text-slate-500">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      {audienceType === "form_submissions" && (
        <div className="mt-4">
          <FormSubmittersSelector
            selectedFormIds={selectedFormIds}
            setSelectedFormIds={setSelectedFormIds}
          />
        </div>
      )}

      {audienceType === "custom" && (
        <div className="mt-4">
          <SpecificRecipientsEditor
            recipients={customRecipients}
            setRecipients={setCustomRecipients}
          />
        </div>
      )}
    </div>
  );
}

// ─── Specific Recipients Editor ───

function SpecificRecipientsEditor({
  recipients,
  setRecipients,
}: {
  recipients: CustomRecipient[];
  setRecipients: (v: CustomRecipient[]) => void;
}) {
  const { apiBase } = useMarketingContext();
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; email: string; first_name: string | null; last_name: string | null }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced contact search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!contactSearch.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/contacts?search=${encodeURIComponent(contactSearch)}&status=active&page=1`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.contacts || []);
          setShowResults(true);
        }
      } catch {
        // Silently fail
      }
      setSearchLoading(false);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [contactSearch]);

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function addEmails() {
    setEmailError(null);
    const raw = emailInput
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (raw.length === 0) return;

    const invalid = raw.filter((e) => !isValidEmail(e));
    if (invalid.length > 0) {
      setEmailError(`Invalid: ${invalid.join(", ")}`);
      return;
    }

    const existing = new Set(recipients.map((r) => r.email.toLowerCase()));
    const newRecipients = raw
      .filter((e) => !existing.has(e))
      .map((email) => ({ email }));

    if (newRecipients.length > 0) {
      setRecipients([...recipients, ...newRecipients]);
    }
    setEmailInput("");
  }

  function addContact(contact: { id: string; email: string; first_name: string | null; last_name: string | null }) {
    if (!contact.email) return;
    const existing = new Set(recipients.map((r) => r.email.toLowerCase()));
    if (existing.has(contact.email.toLowerCase())) {
      setContactSearch("");
      setShowResults(false);
      return;
    }
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || undefined;
    setRecipients([...recipients, { email: contact.email, name, contactId: contact.id }]);
    setContactSearch("");
    setShowResults(false);
  }

  function removeRecipient(email: string) {
    setRecipients(recipients.filter((r) => r.email !== email));
  }

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      {/* Email input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Add by email
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={emailInput}
            onChange={(e) => { setEmailInput(e.target.value); setEmailError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmails(); } }}
            placeholder="email@example.com or paste multiple, comma-separated"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={addEmails}
            className="inline-flex items-center gap-1 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        {emailError && (
          <p className="text-xs text-red-600 mt-1">{emailError}</p>
        )}
      </div>

      {/* Contact search */}
      <div ref={searchRef} className="relative">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Search contacts
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
          )}
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((c) => (
              <button
                key={c.id}
                onClick={() => addContact(c)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
              >
                <span className="font-medium text-slate-900">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown"}
                </span>
                <span className="text-slate-500 ml-2">{c.email}</span>
              </button>
            ))}
          </div>
        )}
        {showResults && searchResults.length === 0 && contactSearch.trim() && !searchLoading && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-500">
            No contacts found
          </div>
        )}
      </div>

      {/* Recipient list */}
      {recipients.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recipients.map((r) => (
              <span
                key={r.email}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-700"
              >
                {r.name ? `${r.name} (${r.email})` : r.email}
                <button
                  onClick={() => removeRecipient(r.email)}
                  className="text-slate-400 hover:text-red-500 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form Submitters Selector ───

interface FormOption {
  id: string;
  name: string;
  status: string;
  submission_count: number;
}

function FormSubmittersSelector({
  selectedFormIds,
  setSelectedFormIds,
}: {
  selectedFormIds: string[];
  setSelectedFormIds: (v: string[]) => void;
}) {
  const { apiBase } = useMarketingContext();
  const [forms, setForms] = useState<FormOption[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const countTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load forms
  useEffect(() => {
    fetch(`${apiBase}/forms`)
      .then((r) => (r.ok ? r.json() : { forms: [] }))
      .then((data) => setForms(data.forms || []))
      .catch(() => {})
      .finally(() => setLoadingForms(false));
  }, [apiBase]);

  // Fetch audience count with debounce
  useEffect(() => {
    if (countTimer.current) clearTimeout(countTimer.current);

    if (selectedFormIds.length === 0) {
      setAudienceCount(0);
      setCountLoading(false);
      return;
    }

    setCountLoading(true);
    countTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiBase}/campaigns/audience-count?audience_type=form_submissions&form_ids=${selectedFormIds.join(",")}`
        );
        if (res.ok) {
          const data = await res.json();
          setAudienceCount(data.count);
        }
      } catch {
        // Silently fail
      }
      setCountLoading(false);
    }, 300);

    return () => {
      if (countTimer.current) clearTimeout(countTimer.current);
    };
  }, [selectedFormIds, apiBase]);

  function toggleForm(formId: string) {
    setSelectedFormIds(
      selectedFormIds.includes(formId)
        ? selectedFormIds.filter((id) => id !== formId)
        : [...selectedFormIds, formId]
    );
  }

  const totalSubmissions = forms
    .filter((f) => selectedFormIds.includes(f.id))
    .reduce((sum, f) => sum + f.submission_count, 0);

  if (loadingForms) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        <span className="text-sm text-slate-500">Loading forms...</span>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-600 font-medium">No forms yet</p>
        <p className="text-xs text-slate-500 mt-1">
          Create a form in Marketing &gt; Forms to use this audience.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
      {/* Select all / deselect all */}
      {forms.length > 3 && (
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Select forms</span>
          <button
            onClick={() =>
              setSelectedFormIds(
                selectedFormIds.length === forms.length ? [] : forms.map((f) => f.id)
              )
            }
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            {selectedFormIds.length === forms.length ? "Deselect all" : "Select all"}
          </button>
        </div>
      )}

      {/* Form list */}
      <div className="space-y-1">
        {forms.map((form) => (
          <label
            key={form.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
              selectedFormIds.includes(form.id) ? "bg-brand-50" : "hover:bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedFormIds.includes(form.id)}
              onChange={() => toggleForm(form.id)}
              className="accent-brand-600 w-4 h-4"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-900">{form.name}</span>
              {(form.status === "draft" || form.status === "archived") && (
                <span className={`ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  form.status === "draft" ? "bg-slate-100 text-slate-500" : "bg-slate-100 text-slate-400"
                }`}>
                  {form.status}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 tabular-nums">
              {form.submission_count} submission{form.submission_count !== 1 ? "s" : ""}
            </span>
          </label>
        ))}
      </div>

      {/* Audience count */}
      <div className="pt-2 border-t border-slate-200">
        {countLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
            <span className="text-sm text-slate-500">Calculating recipients...</span>
          </div>
        ) : (
          <div>
            <p className={`text-sm font-medium ${audienceCount ? "text-slate-900" : "text-slate-400"}`}>
              {audienceCount ?? 0} recipient{audienceCount !== 1 ? "s" : ""} will receive this campaign
            </p>
            {audienceCount !== null && audienceCount < totalSubmissions && audienceCount > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Only contacts with verified emails and marketing consent are included.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step: Review & Send ───

function ReviewStep({
  name, subject, previewText, fromName, replyTo, audienceType,
  customRecipients, selectedFormIds, content, scheduledAt, setScheduledAt,
  onSendTest, sendingTest, onSend, sending,
  brandBusinessName, brandLogoUrl, brandLogoSize,
  brandPrimaryColour, brandAccentColour, brandBackgroundColour, brandButtonColour, brandButtonTextColour, brandButtonStyle,
}: {
  name: string; subject: string; previewText: string;
  fromName: string; replyTo: string; audienceType: AudienceType;
  customRecipients: CustomRecipient[];
  selectedFormIds: string[];
  content: EmailBlock[]; scheduledAt: string; setScheduledAt: (v: string) => void;
  onSendTest: () => void; sendingTest: boolean;
  onSend: () => void; sending: boolean;
  brandBusinessName: string; brandLogoUrl: string | null; brandLogoSize: "small" | "medium" | "large";
  brandPrimaryColour: string | null; brandAccentColour: string | null; brandBackgroundColour: string | null;
  brandButtonColour: string | null; brandButtonTextColour: string | null;
  brandButtonStyle: "sharp" | "rounded" | "pill" | null;
}) {
  const issues: string[] = [];
  if (!subject) issues.push("Subject line is required");
  if (content.length === 0) issues.push("Email has no content blocks");
  if (audienceType === "custom" && customRecipients.length === 0) issues.push("At least one recipient is required");
  if (audienceType === "form_submissions" && selectedFormIds.length === 0) issues.push("At least one form must be selected");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Summary */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <SummaryItem label="Campaign Name" value={name || "Untitled"} />
            <SummaryItem label="Subject" value={subject || "Not set"} warn={!subject} />
            <SummaryItem label="Preview Text" value={previewText || "None"} />
            <SummaryItem label="From" value={fromName || "Default"} />
            <SummaryItem label="Reply-To" value={replyTo || "Default"} />
            <SummaryItem label="Audience" value={
              audienceType === "custom"
                ? `${customRecipients.length} specific recipient${customRecipients.length !== 1 ? "s" : ""}`
                : audienceType === "form_submissions"
                ? `Form Submitters (${selectedFormIds.length} form${selectedFormIds.length !== 1 ? "s" : ""})`
                : audienceType === "all" ? "All Contacts" : audienceType
            } />
            <SummaryItem label="Content Blocks" value={`${content.length} blocks`} warn={content.length === 0} />
          </div>

          {issues.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800 mb-1">Before sending:</p>
              <ul className="text-sm text-amber-700 list-disc pl-4">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Schedule (optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Leave empty to send immediately.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={onSendTest}
              disabled={sendingTest || issues.length > 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              Send Test
            </button>
            <button
              onClick={onSend}
              disabled={sending || issues.length > 0}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : scheduledAt ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {scheduledAt ? "Schedule" : "Send Now"}
            </button>
          </div>
        </div>

        {/* Right: Email Preview */}
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Preview</p>
          <EmailPreview blocks={content} businessName={brandBusinessName} logoUrl={brandLogoUrl} logoSize={brandLogoSize} primaryColour={brandPrimaryColour} accentColour={brandAccentColour} backgroundColour={brandBackgroundColour} buttonColour={brandButtonColour} buttonTextColour={brandButtonTextColour} buttonStyle={brandButtonStyle} />
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm mt-0.5 ${warn ? "text-amber-600 font-medium" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
