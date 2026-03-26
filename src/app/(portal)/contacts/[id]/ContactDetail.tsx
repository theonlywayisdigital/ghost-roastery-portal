"use client";

import { useState, useEffect, useRef } from "react";
import { ActionMenu } from "@/components/admin";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  StickyNote,
  MessageSquare,
  Edit3,
  MoreHorizontal,
  Archive,
  ShoppingBag,
  FileText,
  CreditCard,
  Tag,
  Send,
  X,
  Save,
  UserCheck,
  Activity,
  TrendingUp,
  Funnel,
  Pencil,
  Sparkles,
  ChevronDown,
  Check,
  BookOpen,
  Inbox,
  ChevronUp,
  MapPin,
} from "@/components/icons";
import { STAGE_COLOURS, type PipelineStage } from "@/lib/pipeline";

// ─── Types ───

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  types: string[];
  source: string;
  status: string;
  total_spend: number;
  order_count: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
  business_id: string | null;
  role: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  businesses: { id: string; name: string; types: string[]; total_spend: number; industry: string | null } | null;
}

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface Note {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
}

interface Order {
  id: string;
  customer_name: string;
  items: unknown;
  subtotal: number;
  total: number;
  status: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  subtotal: number;
  total: number;
  status: string;
  payment_status: string;
  payment_due_date: string | null;
  created_at: string;
}

interface WholesaleAccess {
  status: string;
  price_tier: string | null;
  payment_terms: string | null;
  credit_limit: number | null;
  approved_at: string | null;
  created_at: string;
}

interface InboxMessageItem {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  is_read: boolean;
  is_converted: boolean;
  attachments: { filename: string }[];
}

interface ContactData {
  contact: Contact;
  activity: ActivityItem[];
  notes: Note[];
  orders: Order[];
  invoices: Invoice[];
  wholesaleAccess: WholesaleAccess | null;
  inboxMessages: InboxMessageItem[];
}

interface ContactEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

// ─── Constants ───

const TYPE_COLORS: Record<string, string> = {
  retail: "bg-blue-50 text-blue-700",
  wholesale: "bg-purple-50 text-purple-700",
  supplier: "bg-amber-50 text-amber-700",
  lead: "bg-green-50 text-green-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-slate-100 text-slate-600",
  archived: "bg-red-50 text-red-600",
};


const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  contact_created: UserCheck,
  status_changed: Tag,
  type_changed: Tag,
  note_added: StickyNote,
  email_sent: Send,
  email_received: Mail,
  order_placed: ShoppingBag,
  invoice_sent: FileText,
  payment_received: CreditCard,
  meeting: Calendar,
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-purple-50 text-purple-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-50 text-blue-700",
  paid: "bg-green-50 text-green-700",
  overdue: "bg-red-50 text-red-600",
  cancelled: "bg-red-50 text-red-600",
};

// ─── Component ───

export function ContactDetail({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    business_name: "",
    types: [] as string[],
    status: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    county: "",
    postcode: "",
    country: "GB",
  });
  const [saving, setSaving] = useState(false);

  // Pipeline stages
  const [stages, setStages] = useState<PipelineStage[]>([]);

  // Notes
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Email log modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });
  const [loggingEmail, setLoggingEmail] = useState(false);

  // Compose email modal
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeForm, setComposeForm] = useState({ subject: "", body: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  // Email templates
  const [emailTemplates, setEmailTemplates] = useState<ContactEmailTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const templatePickerRef = useRef<HTMLButtonElement | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveTemplateSuccess, setSaveTemplateSuccess] = useState(false);

  // AI compose
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  // Actions dropdown
  const [showActions, setShowActions] = useState(false);
  const actionsAnchorRef = useRef<HTMLButtonElement | null>(null);

  // Expanded inbox messages
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  // Detail tabs
  const [activeDetailTab, setActiveDetailTab] = useState<
    "activity" | "notes" | "communication" | "orders" | "deals"
  >("activity");

  async function loadContact() {
    try {
      const res = await fetch(`/api/contacts/${contactId}`);
      if (!res.ok) {
        setError("Contact not found");
        return;
      }
      const d = await res.json();
      setData(d);
      setEditForm({
        first_name: d.contact.first_name || "",
        last_name: d.contact.last_name || "",
        email: d.contact.email || "",
        phone: d.contact.phone || "",
        business_name: d.contact.business_name || "",
        types: d.contact.types || [],
        status: d.contact.status,
        address_line_1: d.contact.address_line_1 || "",
        address_line_2: d.contact.address_line_2 || "",
        city: d.contact.city || "",
        county: d.contact.county || "",
        postcode: d.contact.postcode || "",
        country: d.contact.country || "GB",
      });
      fetch("/api/pipeline-stages").then(res => res.ok ? res.json() : null).then(data => {
        if (data?.stages) setStages(data.stages);
      }).catch(() => {});
    } catch {
      setError("Failed to load contact");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditing(false);
        loadContact();
      }
    } catch {
      // ignore
    }
    setSaving(false);
  }

  async function handleAddNote() {
    if (!noteContent.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      if (res.ok) {
        setNoteContent("");
        loadContact();
      }
    } catch {
      // ignore
    }
    setAddingNote(false);
  }

  async function handleLogEmail() {
    if (!emailForm.subject.trim()) return;
    setLoggingEmail(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: "email_sent",
          description: emailForm.subject.trim(),
          metadata: {
            subject: emailForm.subject.trim(),
            body: emailForm.body.trim(),
          },
        }),
      });
      if (res.ok) {
        setShowEmailModal(false);
        setEmailForm({ subject: "", body: "" });
        loadContact();
      }
    } catch {
      // ignore
    }
    setLoggingEmail(false);
  }

  async function handleArchive() {
    if (!confirm("Archive this contact? They can be restored later.")) return;
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/contacts");
      }
    } catch {
      // ignore
    }
  }

  // Load templates on mount
  useEffect(() => {
    loadEmailTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  async function loadEmailTemplates() {
    try {
      const res = await fetch("/api/settings/email-templates");
      if (res.ok) {
        const d = await res.json();
        setEmailTemplates(d.templates || []);
      }
    } catch {
      // ignore
    }
  }

  function applyTemplate(template: ContactEmailTemplate) {
    setComposeForm((f) => ({
      ...f,
      subject: template.subject,
      body: template.body,
    }));
    setShowTemplatePicker(false);
  }

  async function handleSaveAsTemplate() {
    if (!composeForm.subject.trim() && !composeForm.body.trim()) return;
    const name = prompt("Template name:");
    if (!name?.trim()) return;

    setSavingTemplate(true);
    try {
      const res = await fetch("/api/settings/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject: composeForm.subject.trim(),
          body: composeForm.body.trim(),
        }),
      });
      if (res.ok) {
        setSaveTemplateSuccess(true);
        setTimeout(() => setSaveTemplateSuccess(false), 2000);
        loadEmailTemplates();
      }
    } catch {
      // ignore
    }
    setSavingTemplate(false);
  }

  async function handleAiCompose() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiError("");

    const contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || undefined;

    try {
      const res = await fetch("/api/ai/compose-contact-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          contactName,
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        setAiError(d.error || "Failed to generate email");
        return;
      }

      setComposeForm((f) => ({ ...f, body: d.body }));
      setShowAiPrompt(false);
      setAiPrompt("");
    } catch {
      setAiError("Failed to generate email. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleSendEmail() {
    if (!composeForm.subject.trim() || !composeForm.body.trim()) return;
    setSendingEmail(true);
    setSendError("");
    setSendSuccess(false);

    try {
      // Log the email as activity
      const res = await fetch(`/api/contacts/${contactId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: "email_sent",
          description: composeForm.subject.trim(),
          metadata: {
            subject: composeForm.subject.trim(),
            body: composeForm.body.trim(),
            to: contact?.email,
          },
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setSendError(d.error || "Failed to log email");
        return;
      }

      setSendSuccess(true);
      setComposeForm((f) => ({ ...f, subject: "", body: "" }));
      setTimeout(() => {
        setSendSuccess(false);
        setShowComposeModal(false);
      }, 2000);

      loadContact();
    } catch {
      setSendError("Failed to log email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  }

  // ─── Render ───

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-32">
        <p className="text-slate-500">{error || "Contact not found"}</p>
        <Link
          href="/contacts"
          className="text-brand-600 hover:underline text-sm mt-2 inline-block"
        >
          Back to contacts
        </Link>
      </div>
    );
  }

  const { contact, activity, notes, orders, invoices, wholesaleAccess, inboxMessages } = data;
  const fullName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unknown";

  // Merge notes + inbox messages into activity timeline
  const timeline = [
    ...activity.map((a) => ({
      id: a.id,
      type: "activity" as const,
      subtype: a.activity_type,
      content: a.description,
      metadata: a.metadata,
      created_at: a.created_at,
    })),
    ...notes.map((n) => ({
      id: n.id,
      type: "note" as const,
      subtype: "note_added",
      content: n.content,
      metadata: {},
      created_at: n.created_at,
    })),
    ...(inboxMessages || []).map((m) => ({
      id: m.id,
      type: "inbox" as const,
      subtype: "email_received",
      content: m.subject || "(No subject)",
      metadata: {
        body_text: m.body_text,
        body_html: m.body_html,
        from_email: m.from_email,
        from_name: m.from_name,
        is_converted: m.is_converted,
        attachments: m.attachments,
      } as Record<string, unknown>,
      created_at: m.received_at,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // De-duplicate: activity with note_added + matching note
  const seenNoteIds = new Set<string>();
  const deduped = timeline.filter((item) => {
    if (item.type === "note") {
      seenNoteIds.add(item.id);
      return true;
    }
    if (
      item.subtype === "note_added" &&
      item.metadata &&
      typeof item.metadata === "object" &&
      "note_id" in item.metadata &&
      seenNoteIds.has(item.metadata.note_id as string)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div>
      {/* Breadcrumb + Back */}
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
          <Link
            href="/contacts"
            className="hover:text-slate-700 transition-colors"
          >
            Contacts
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-medium">{fullName}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href="/contacts"
              className="mt-1 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {fullName}
                </h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[contact.status] || "bg-slate-100 text-slate-600"}`}
                >
                  {contact.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {contact.types.map((type) => (
                  <span
                    key={type}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type] || "bg-slate-100 text-slate-600"}`}
                  >
                    {type}
                  </span>
                ))}
                {contact.business_name && (
                  <span className="text-sm text-slate-500">
                    {contact.business_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {contact.email && (
              <button
                onClick={() => setShowComposeModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Compose Email
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
            <div>
              <button
                ref={actionsAnchorRef}
                onClick={() => setShowActions(!showActions)}
                className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <ActionMenu
                anchorRef={actionsAnchorRef}
                open={showActions}
                onClose={() => setShowActions(false)}
                width="w-48"
              >
                {contact.email && (
                  <button
                    onClick={() => {
                      setShowActions(false);
                      setShowComposeModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Mail className="w-4 h-4" />
                    Send Email
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowActions(false);
                    setShowEmailModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  Log Email
                </button>
                <hr className="my-1 border-slate-100" />
                <button
                  onClick={() => {
                    setShowActions(false);
                    handleArchive();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Archive className="w-4 h-4" />
                  Archive Contact
                </button>
              </ActionMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN — Tabbed content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Bar */}
          <div className="flex gap-1 border-b border-slate-200">
            {(
              [
                { id: "activity", label: "Activity", icon: Activity },
                { id: "notes", label: "Notes", icon: StickyNote },
                { id: "communication", label: "Communication", icon: Mail },
                { id: "orders", label: "Orders", icon: ShoppingBag },
                ...((contact.types.includes("lead") || contact.types.includes("wholesale"))
                  ? [{ id: "deals" as const, label: "Deals", icon: Funnel }]
                  : []),
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeDetailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    isActive
                      ? "border-brand-600 text-brand-700"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Activity Tab */}
          {activeDetailTab === "activity" && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-400" />
                  Activity Timeline
                </h2>
              </div>
              {deduped.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {deduped.map((item) => {
                    const Icon =
                      item.type === "note"
                        ? StickyNote
                        : ACTIVITY_ICONS[item.subtype] || Activity;

                    const isEmailActivity =
                      item.subtype === "email_sent" || item.subtype === "email_received";
                    const emailMeta = isEmailActivity && item.metadata
                      ? (item.metadata as { provider?: string; from_email?: string; snippet?: string })
                      : null;

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="px-4 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              item.type === "note"
                                ? "bg-amber-50 text-amber-600"
                                : isEmailActivity
                                  ? item.subtype === "email_sent"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-green-50 text-green-600"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {item.type === "note" ? (
                              <div className="bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                  {item.content}
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-slate-600">
                                  {item.content}
                                </p>
                                {emailMeta?.snippet && (
                                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                    {emailMeta.snippet}
                                  </p>
                                )}
                                {emailMeta?.from_email && (
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {`via ${emailMeta.provider === "gmail" ? "Gmail" : emailMeta.provider === "outlook" ? "Outlook" : emailMeta.provider || "email"} (${emailMeta.from_email})`}
                                  </p>
                                )}
                              </>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              {formatDateTime(item.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeDetailTab === "notes" && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex gap-3">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add a note..."
                    rows={2}
                    className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={addingNote || !noteContent.trim()}
                    className="self-end px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {addingNote ? "Adding..." : "Add Note"}
                  </button>
                </div>
              </div>

              {notes.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 text-center py-10">
                  <StickyNote className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No notes yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...notes]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .map((note) => (
                      <div
                        key={note.id}
                        className="bg-amber-50/50 rounded-xl border border-amber-100 px-4 py-3"
                      >
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {formatDateTime(note.created_at)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {/* Communication Tab */}
          {activeDetailTab === "communication" && (
            <>
              {/* Action bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      Email History
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.email && (
                      <button
                        onClick={() => setShowComposeModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Compose
                      </button>
                    )}
                    <button
                      onClick={() => setShowEmailModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Log Email
                    </button>
                  </div>
                </div>
              </div>

              {/* Email activity + inbox messages */}
              {(() => {
                const emailActivity = deduped.filter(
                  (item) =>
                    item.subtype === "email_sent" ||
                    item.subtype === "email_received" ||
                    item.subtype === "email_logged"
                );
                if (emailActivity.length === 0) {
                  return (
                    <div className="bg-white rounded-xl border border-slate-200 text-center py-10">
                      <Mail className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">
                        No emails with this contact yet
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="bg-white rounded-xl border border-slate-200">
                    <div className="divide-y divide-slate-50">
                      {emailActivity.map((item) => {
                        const isInbox = item.type === "inbox";
                        const isExpanded = expandedMessages.has(item.id);
                        const bodyHtml = isInbox ? (item.metadata?.body_html as string) : null;
                        const bodyText = isInbox ? (item.metadata?.body_text as string) : null;
                        const snippet = bodyText ? (bodyText.replace(/\s+/g, " ").trim().slice(0, 120) + (bodyText.length > 120 ? "..." : "")) : "";

                        return (
                          <div key={`${item.type}-${item.id}`} className="px-4 py-3">
                            <div
                              className={`flex items-start gap-3 ${isInbox ? "cursor-pointer" : ""}`}
                              onClick={isInbox ? () => {
                                setExpandedMessages((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              } : undefined}
                            >
                              <div
                                className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  item.subtype === "email_sent" || item.subtype === "email_logged"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-green-50 text-green-600"
                                }`}
                              >
                                {item.subtype === "email_sent" || item.subtype === "email_logged" ? (
                                  <Send className="w-3.5 h-3.5" />
                                ) : isInbox ? (
                                  <Inbox className="w-3.5 h-3.5" />
                                ) : (
                                  <Mail className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {isInbox ? (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm text-slate-900 font-medium">{item.content}</p>
                                      <span className="flex-shrink-0">
                                        {isExpanded ? (
                                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                      </span>
                                    </div>
                                    {!isExpanded && snippet && (
                                      <p className="text-xs text-slate-500 mt-0.5 truncate">{snippet}</p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-sm text-slate-600">{item.content}</p>
                                )}
                                <p className="text-xs text-slate-400 mt-1">
                                  {formatDateTime(item.created_at)}
                                </p>
                              </div>
                            </div>

                            {/* Expanded email body */}
                            {isInbox && isExpanded && (
                              <div className="ml-10 mt-3 border-t border-slate-100 pt-3">
                                {bodyHtml ? (
                                  <div
                                    className="prose prose-sm max-w-none prose-slate"
                                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                                  />
                                ) : bodyText ? (
                                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                                    {bodyText}
                                  </pre>
                                ) : (
                                  <p className="text-sm text-slate-400 italic">No content</p>
                                )}
                                <div className="mt-2">
                                  <Link
                                    href={`/inbox/${item.id}`}
                                    className="text-xs text-brand-600 hover:text-brand-700"
                                  >
                                    View full email
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* Orders Tab */}
          {activeDetailTab === "orders" && (
            <>
              {/* Orders */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                    {`Orders (${orders.length})`}
                  </h2>
                </div>
                {orders.length === 0 ? (
                  <div className="text-center py-10">
                    <ShoppingBag className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No orders yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {orders.map((order) => (
                      <div key={order.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-900">
                              {formatCurrency(order.total)}
                            </span>
                            {order.subtotal !== order.total && (
                              <span className="text-xs text-slate-400">
                                {`Subtotal: ${formatCurrency(order.subtotal)}`}
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        {Array.isArray(order.items) &&
                          order.items.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {(
                                order.items as Array<{
                                  name?: string;
                                  quantity?: number;
                                }>
                              ).map((item, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 bg-slate-50 rounded text-xs text-slate-600"
                                >
                                  {item.name || "Item"}
                                  {item.quantity && item.quantity > 1
                                    ? ` x${item.quantity}`
                                    : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoices */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    {`Invoices (${invoices.length})`}
                  </h2>
                </div>
                {invoices.length === 0 ? (
                  <div className="text-center py-10">
                    <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No invoices yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-slate-900">
                              {inv.invoice_number}
                            </span>
                            <span className="text-sm text-slate-500 ml-2">
                              {formatCurrency(inv.total)}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${INVOICE_STATUS_COLORS[inv.payment_status || inv.status] || "bg-slate-100 text-slate-600"}`}
                          >
                            {inv.payment_status || inv.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-slate-400">
                            {formatDate(inv.created_at)}
                          </p>
                          {inv.payment_due_date && (
                            <p className="text-xs text-slate-400">
                              {`Due ${formatDate(inv.payment_due_date)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Deals Tab */}
          {activeDetailTab === "deals" && (
            <DealsTabContent
              stages={stages}
              timeline={deduped}
              isReadOnly={false}
            />
          )}
        </div>

        {/* RIGHT COLUMN — Details + Wholesale */}
        <div className="space-y-6">
          {/* Contact Details Card */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            </div>
            <div className="p-4 space-y-3">
              {contact.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm text-brand-600 hover:underline truncate"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-sm text-slate-700"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.business_name && (
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700">
                    {contact.business_name}
                  </span>
                </div>
              )}
              {(() => {
                const addressLines = [
                  contact.address_line_1,
                  contact.address_line_2,
                  [contact.city, contact.county, contact.postcode].filter(Boolean).join(", "),
                ].filter(Boolean);
                return addressLines.length > 0 ? (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">
                      {addressLines.map((line, i) => (
                        <span key={i}>{line}{i < addressLines.length - 1 && <br />}</span>
                      ))}
                    </span>
                  </div>
                ) : null;
              })()}
              <hr className="border-slate-100" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Total Spend</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(contact.total_spend)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Orders</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {contact.order_count}
                  </p>
                </div>
              </div>
              <hr className="border-slate-100" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Source</span>
                  <span className="text-xs text-slate-600 capitalize">
                    {contact.source.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Created</span>
                  <span className="text-xs text-slate-600">
                    {formatDate(contact.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Last Activity</span>
                  <span className="text-xs text-slate-600">
                    {contact.last_activity_at
                      ? formatDate(contact.last_activity_at)
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Business Card */}
          {contact.businesses && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Business
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <Link
                  href={`/businesses/${contact.businesses.id}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {contact.businesses.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-600 group-hover:underline">
                      {contact.businesses.name}
                    </p>
                    {contact.role && (
                      <p className="text-xs text-slate-700 font-medium">{contact.role}</p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-wrap">
                  {contact.businesses.industry && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize bg-slate-100 text-slate-600">
                      {contact.businesses.industry}
                    </span>
                  )}
                  {contact.businesses.types?.map((type) => (
                    <span
                      key={type}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        type === "wholesale" ? "bg-purple-50 text-purple-700"
                          : type === "retail" ? "bg-blue-50 text-blue-700"
                          : type === "supplier" ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
                {contact.businesses.total_spend > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Total Spend</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {`\u00A3${Number(contact.businesses.total_spend || 0).toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wholesale Access Card */}
          {wholesaleAccess && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  Wholesale Access
                </h2>
              </div>
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      wholesaleAccess.status === "approved"
                        ? "bg-green-50 text-green-700"
                        : wholesaleAccess.status === "pending"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-red-50 text-red-600"
                    }`}
                  >
                    {wholesaleAccess.status}
                  </span>
                </div>
                {wholesaleAccess.price_tier && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Price Tier</span>
                    <span className="text-xs text-slate-700 capitalize">
                      {wholesaleAccess.price_tier}
                    </span>
                  </div>
                )}
                {wholesaleAccess.payment_terms && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Payment Terms
                    </span>
                    <span className="text-xs text-slate-700">
                      {wholesaleAccess.payment_terms}
                    </span>
                  </div>
                )}
                {wholesaleAccess.credit_limit != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Credit Limit</span>
                    <span className="text-xs text-slate-700">
                      {formatCurrency(wholesaleAccess.credit_limit)}
                    </span>
                  </div>
                )}
                {wholesaleAccess.approved_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Approved</span>
                    <span className="text-xs text-slate-700">
                      {formatDate(wholesaleAccess.approved_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Contact Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Edit Contact
              </h3>
              <button
                onClick={() => setEditing(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        first_name: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        last_name: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Business
                  </label>
                  <input
                    type="text"
                    value={editForm.business_name}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        business_name: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address_line_1}
                  onChange={(e) => setEditForm((f) => ({ ...f, address_line_1: e.target.value }))}
                  placeholder="Address line 1"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2"
                />
                <input
                  type="text"
                  value={editForm.address_line_2}
                  onChange={(e) => setEditForm((f) => ({ ...f, address_line_2: e.target.value }))}
                  placeholder="Address line 2"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    value={editForm.county}
                    onChange={(e) => setEditForm((f) => ({ ...f, county: e.target.value }))}
                    placeholder="County"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    value={editForm.postcode}
                    onChange={(e) => setEditForm((f) => ({ ...f, postcode: e.target.value }))}
                    placeholder="Postcode"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {["retail", "wholesale", "supplier", "lead"].map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() =>
                          setEditForm((f) => ({
                            ...f,
                            types: f.types.includes(type)
                              ? f.types.filter((t) => t !== type)
                              : [...f.types, type],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          editForm.types.includes(type)
                            ? "bg-brand-50 border-brand-300 text-brand-700"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {type}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Log Email
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Record an email you sent or received for this contact.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) =>
                    setEmailForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  placeholder="Email subject line"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={emailForm.body}
                  onChange={(e) =>
                    setEmailForm((f) => ({ ...f, body: e.target.value }))
                  }
                  placeholder="Brief summary of the email..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogEmail}
                disabled={loggingEmail || !emailForm.subject.trim()}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {loggingEmail ? "Logging..." : "Log Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Compose Email
              </h3>
              <button
                onClick={() => {
                  setShowComposeModal(false);
                  setSendError("");
                  setSendSuccess(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sendSuccess && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                Email logged successfully!
              </div>
            )}

            {sendError && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {sendError}
              </div>
            )}

            <div className="space-y-4">
              {/* To */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                <div className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-500 bg-slate-50">
                  {contact.email}
                </div>
              </div>

              {/* Template picker + AI compose toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Template picker */}
                <div>
                  <button
                    ref={templatePickerRef}
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Templates
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <ActionMenu
                    anchorRef={templatePickerRef}
                    open={showTemplatePicker}
                    onClose={() => setShowTemplatePicker(false)}
                    width="w-64"
                    align="left"
                  >
                    <div className="max-h-60 overflow-y-auto">
                      {emailTemplates.length === 0 ? (
                        <div className="px-3 py-3 text-center">
                          <p className="text-xs text-slate-400 mb-2">No templates yet</p>
                          <Link
                            href="/settings/email-templates"
                            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                          >
                            Create templates
                          </Link>
                        </div>
                      ) : (
                        emailTemplates.map((tpl) => (
                          <button
                            key={tpl.id}
                            onClick={() => applyTemplate(tpl)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-slate-900 truncate">{tpl.name}</p>
                            {tpl.subject && (
                              <p className="text-xs text-slate-400 truncate">{tpl.subject}</p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </ActionMenu>
                </div>

                {/* AI Compose */}
                <button
                  onClick={() => setShowAiPrompt(!showAiPrompt)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 rounded-lg text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Compose
                </button>

                {/* Save as Template */}
                {(composeForm.subject.trim() || composeForm.body.trim()) && (
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={savingTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {saveTemplateSuccess ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {saveTemplateSuccess ? "Saved!" : savingTemplate ? "Saving..." : "Save as Template"}
                  </button>
                )}
              </div>

              {/* AI Compose prompt input */}
              {showAiPrompt && (
                <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                  <label className="block text-xs font-medium text-purple-700 mb-1.5">
                    Describe what you want to say
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder='e.g. "Thank them for their order and ask if they want to try our new Ethiopian blend"'
                    rows={3}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                  />
                  {aiError && (
                    <p className="text-xs text-red-600 mt-1">{aiError}</p>
                  )}
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button
                      onClick={() => {
                        setShowAiPrompt(false);
                        setAiPrompt("");
                        setAiError("");
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAiCompose}
                      disabled={aiGenerating || !aiPrompt.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {aiGenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {aiGenerating ? "Generating..." : "Generate"}
                    </button>
                  </div>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Body</label>
                <textarea
                  value={composeForm.body}
                  onChange={(e) => setComposeForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Write your email..."
                  rows={8}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowComposeModal(false);
                  setSendError("");
                  setSendSuccess(false);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !composeForm.subject.trim() || !composeForm.body.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {sendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {sendingEmail ? "Saving..." : "Log Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deals Tab Content ───

function DealsTabContent({
  stages,
  timeline,
  isReadOnly,
}: {
  stages: PipelineStage[];
  timeline: { id: string; type: string; subtype: string; content: string; created_at: string }[];
  isReadOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Pipeline</h3>
        <div className="flex gap-0.5 mb-4">
          {stages.map((stage) => (
            <div
              key={stage.slug}
              className="flex-1 py-1.5 text-[10px] font-medium text-center rounded bg-slate-50 text-slate-300"
            >
              {stage.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return `\u00A3${Number(amount || 0).toFixed(2)}`;
}
