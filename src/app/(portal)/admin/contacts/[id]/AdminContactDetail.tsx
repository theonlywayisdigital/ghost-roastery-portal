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
  Tag,
  Send,
  ExternalLink,
  X,
  Save,
  UserCheck,
  Activity,
  AlertTriangle,
  ExternalLink as LinkIcon,
  Funnel,
  MapPin,
} from "@/components/icons";

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
  owner_type: string;
  roasterName?: string | null;
  business_id: string | null;
  role: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  marketing_consent: boolean;
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

interface CrossReference {
  id: string;
  owner_type: string;
  roasterName?: string;
}

interface ContactData {
  contact: Contact;
  activity: ActivityItem[];
  notes: Note[];
  orders: Order[];
  crossReference: CrossReference | null;
}

// ─── Constants ───

const TYPE_COLORS: Record<string, string> = {
  retail: "bg-blue-50 text-blue-700",
  wholesale: "bg-purple-50 text-purple-700",
  supplier: "bg-amber-50 text-amber-700",
  lead: "bg-green-50 text-green-700",
  roaster: "bg-orange-50 text-orange-700",
  partner: "bg-teal-50 text-teal-700",
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
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-purple-50 text-purple-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

// ─── Component ───

export function AdminContactDetail({ contactId }: { contactId: string }) {
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
    marketing_consent: false,
  });
  const [saving, setSaving] = useState(false);

  // Notes
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Email log modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });
  const [loggingEmail, setLoggingEmail] = useState(false);

  // Actions dropdown
  const [showActions, setShowActions] = useState(false);
  const actionsAnchorRef = useRef<HTMLButtonElement | null>(null);

  // Detail tabs
  const [activeDetailTab, setActiveDetailTab] = useState<
    "activity" | "notes" | "orders"
  >("activity");

  async function loadContact() {
    try {
      const res = await fetch(`/api/admin/contacts/${contactId}`);
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
        marketing_consent: d.contact.marketing_consent ?? false,
      });
    } catch {
      setError("Failed to load contact");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const isReadOnly = data?.contact.owner_type !== "ghost_roastery";

  async function handleSave() {
    if (isReadOnly) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/contacts/${contactId}`, {
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
    if (!noteContent.trim() || isReadOnly) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/contacts/${contactId}/notes`, {
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
    if (!emailForm.subject.trim() || isReadOnly) return;
    setLoggingEmail(true);
    try {
      const res = await fetch(`/api/admin/contacts/${contactId}/activity`, {
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
    if (isReadOnly) return;
    if (!confirm("Archive this contact? They can be restored later.")) return;
    try {
      const res = await fetch(`/api/admin/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/contacts");
      }
    } catch {
      // ignore
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
          href="/admin/contacts"
          className="text-brand-600 hover:underline text-sm mt-2 inline-block"
        >
          Back to contacts
        </Link>
      </div>
    );
  }

  const { contact, activity, notes, orders, crossReference } = data;
  const fullName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unknown";

  // Merge notes into activity timeline
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
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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
      {/* Read-only banner for roaster contacts */}
      {isReadOnly && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            {`This contact belongs to ${contact.roasterName || "a roaster"}. View only.`}
          </p>
        </div>
      )}

      {/* Cross-reference badge */}
      {crossReference && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            {crossReference.owner_type === "roaster"
              ? `This email also exists as a roaster contact${crossReference.roasterName ? ` (${crossReference.roasterName})` : ""}.`
              : "This email also exists as a Roastery Platform contact."}
          </p>
          <Link
            href={`/admin/contacts/${crossReference.id}`}
            className="text-sm font-medium text-blue-700 hover:underline ml-auto"
          >
            View
          </Link>
        </div>
      )}

      {/* Breadcrumb + Back */}
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
          <Link
            href="/admin/contacts"
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
              href="/admin/contacts"
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

          {/* Actions — ghost_roastery only */}
          {!isReadOnly && (
            <div className="flex items-center gap-2">
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
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Mail className="w-4 h-4" />
                      Send Email
                    </a>
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
          )}
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
                { id: "orders", label: "Orders", icon: ShoppingBag },
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
                              <p className="text-sm text-slate-600">
                                {item.content}
                              </p>
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
              {!isReadOnly && (
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
              )}

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

          {/* Orders Tab */}
          {activeDetailTab === "orders" && (
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
                        <span className="text-sm font-medium text-slate-900">
                          {formatCurrency(order.total)}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN — Details */}
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
                  <span className="text-xs text-slate-400">Owner</span>
                  <span className="text-xs text-slate-600">
                    {contact.owner_type === "ghost_roastery" ? "Roastery Platform" : contact.roasterName || "Roaster"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Source</span>
                  <span className="text-xs text-slate-600 capitalize">
                    {contact.source.replace(/_/g, " ")}
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
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Marketing</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                    contact.marketing_consent
                      ? "bg-green-50 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {contact.marketing_consent ? "Opted in" : "Not opted in"}
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
                  href={`/admin/businesses/${contact.businesses.id}`}
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Contact Modal */}
      {editing && !isReadOnly && (
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business</label>
                  <input
                    type="text"
                    value={editForm.business_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, business_name: e.target.value }))}
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Types</label>
                <div className="flex flex-wrap gap-2">
                  {["retail", "lead", "supplier", "roaster", "partner"].map((type) => (
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
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Marketing Consent
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contact has opted in to receive marketing emails
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editForm.marketing_consent}
                  onClick={() =>
                    setEditForm((f) => ({ ...f, marketing_consent: !f.marketing_consent }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editForm.marketing_consent ? "bg-brand-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editForm.marketing_consent ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
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
      {showEmailModal && !isReadOnly && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Log Email</h3>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject line"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={emailForm.body}
                  onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
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
    </div>
  );
}

// ─── Deals Tab Content ───

function DealsTabContent({
  timeline,
  isReadOnly,
}: {
  timeline: { id: string; type: string; subtype: string; content: string; created_at: string }[];
  isReadOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Pipeline</h3>
        <p className="text-sm text-slate-400">No pipeline data available.</p>
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
