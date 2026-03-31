"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ActionMenu } from "@/components/admin";
import { useRouter, useSearchParams } from "next/navigation";
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
  Edit3,
  MoreHorizontal,
  Archive,
  ShoppingBag,
  FileText,
  CreditCard,
  Tag,
  Send,
  ExternalLink,
  X,
  Save,
  UserCheck,
  Activity,
  TrendingUp,
  Globe,
  MapPin,
  Plus,
  UserMinus,
  Search,
  LayoutDashboard,
  Users,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  AlertTriangle,
  Funnel,
} from "@/components/icons";

// ─── Types ───

interface Business {
  id: string;
  name: string;
  types: string[];
  industry: string | null;
  status: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  notes: string | null;
  source: string;
  total_spend: number;
  order_count: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
  owner_type: string;
  roasterName?: string | null;
}

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ContactActivityItem {
  id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  contacts?: { first_name: string; last_name: string } | null;
}

interface Note {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
}

interface LinkedContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  types: string[];
  status: string;
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

interface BusinessData {
  business: Business;
  activity: ActivityItem[];
  notes: Note[];
  contacts: LinkedContact[];
  contactActivity: ContactActivityItem[];
  orders: Order[];
  invoices: Invoice[];
  wholesaleAccess: WholesaleAccess | null;
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

const INDUSTRY_COLORS: Record<string, string> = {
  cafe: "bg-orange-50 text-orange-700",
  restaurant: "bg-rose-50 text-rose-700",
  gym: "bg-sky-50 text-sky-700",
  hotel: "bg-indigo-50 text-indigo-700",
  office: "bg-slate-100 text-slate-700",
  coworking: "bg-violet-50 text-violet-700",
  events: "bg-pink-50 text-pink-700",
  retail: "bg-emerald-50 text-emerald-700",
  other: "bg-slate-100 text-slate-600",
};

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  business_created: UserCheck,
  status_changed: Tag,
  type_changed: Tag,
  note_added: StickyNote,
  email_sent: Send,
  email_logged: Mail,
  email_received: Mail,
  order_placed: ShoppingBag,
  invoice_sent: FileText,
  payment_received: CreditCard,
  contact_added: Plus,
  contact_removed: UserMinus,
  wholesale_approved: TrendingUp,
  wholesale_rejected: X,
  meeting: Calendar,
  contact_created: UserCheck,
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

const TAB_IDS = [
  "overview",
  "activity",
  "contacts",
  "communications",
  "orders",
  "invoices",
  "notes",
  "deals",
] as const;
type TabId = (typeof TAB_IDS)[number];

const ACTIVITY_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "note_added", label: "Notes" },
  { value: "email", label: "Emails" },
  { value: "order", label: "Orders" },
  { value: "status", label: "Status Changes" },
  { value: "contact", label: "Contacts" },
];

// ─── Component ───

export function AdminBusinessDetail({ businessId }: { businessId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const initialTab = tabParam && TAB_IDS.includes(tabParam) ? tabParam : "overview";

  const [data, setData] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    types: [] as string[],
    status: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    county: "",
    postcode: "",
    country: "GB",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Notes
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Email log modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: "",
    body: "",
    direction: "sent" as "sent" | "received",
    contact_id: "",
  });
  const [loggingEmail, setLoggingEmail] = useState(false);

  // Actions dropdown
  const [showActions, setShowActions] = useState(false);
  const actionsAnchorRef = useRef<HTMLButtonElement | null>(null);

  // Add contact modal
  const [showAddContact, setShowAddContact] = useState(false);
  const [addContactMode, setAddContactMode] = useState<"new" | "existing">("new");
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<LinkedContact[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [linkingContact, setLinkingContact] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "",
  });
  const [creatingContact, setCreatingContact] = useState(false);
  const [addContactError, setAddContactError] = useState<string | null>(null);

  // Activity filter
  const [activityFilter, setActivityFilter] = useState("all");

  function switchTab(tab: TabId) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState({}, "", url.toString());
  }

  const loadBusiness = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`);
      if (!res.ok) {
        setError("Business not found");
        return;
      }
      const d = await res.json();
      setData(d);
      setEditForm({
        name: d.business.name || "",
        email: d.business.email || "",
        phone: d.business.phone || "",
        website: d.business.website || "",
        industry: d.business.industry || "",
        types: d.business.types || [],
        status: d.business.status,
        address_line_1: d.business.address_line_1 || "",
        address_line_2: d.business.address_line_2 || "",
        city: d.business.city || "",
        county: d.business.county || "",
        postcode: d.business.postcode || "",
        country: d.business.country || "GB",
        notes: d.business.notes || "",
      });
    } catch {
      setError("Failed to load business");
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  const isReadOnly = data?.business.owner_type !== "ghost_roastery";

  async function handleSave() {
    if (isReadOnly) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditing(false);
        loadBusiness();
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
      const res = await fetch(`/api/admin/businesses/${businessId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      if (res.ok) {
        setNoteContent("");
        loadBusiness();
      }
    } catch {
      // ignore
    }
    setAddingNote(false);
  }

  async function handleDeleteNote(noteId: string) {
    if (isReadOnly) return;
    if (!confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadBusiness();
      }
    } catch {
      // ignore
    }
  }

  async function handleUpdateNote(noteId: string) {
    if (!editNoteContent.trim() || isReadOnly) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editNoteContent.trim() }),
      });
      if (res.ok) {
        setEditingNote(null);
        setEditNoteContent("");
        loadBusiness();
      }
    } catch {
      // ignore
    }
    setSavingNote(false);
  }

  async function handleLogEmail() {
    if (!emailForm.subject.trim() || isReadOnly) return;
    setLoggingEmail(true);
    try {
      const activityType = emailForm.direction === "sent" ? "email_sent" : "email_received";
      const res = await fetch(`/api/admin/businesses/${businessId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: activityType,
          description: `${emailForm.direction === "sent" ? "Sent" : "Received"}: ${emailForm.subject.trim()}`,
          metadata: {
            subject: emailForm.subject.trim(),
            body: emailForm.body.trim(),
            direction: emailForm.direction,
            contact_id: emailForm.contact_id || null,
          },
        }),
      });
      if (res.ok) {
        setShowEmailModal(false);
        setEmailForm({ subject: "", body: "", direction: "sent", contact_id: "" });
        loadBusiness();
      }
    } catch {
      // ignore
    }
    setLoggingEmail(false);
  }

  async function handleArchive() {
    if (isReadOnly) return;
    if (!confirm("Archive this business? Linked contacts will be unlinked but not deleted.")) return;
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/businesses");
      }
    } catch {
      // ignore
    }
  }

  async function searchContacts() {
    if (!contactSearch.trim()) {
      setContactResults([]);
      return;
    }
    setSearchingContacts(true);
    try {
      const res = await fetch(`/api/admin/contacts?ownerType=ghost_roastery&search=${encodeURIComponent(contactSearch)}&status=active`);
      if (res.ok) {
        const d = await res.json();
        const linkedIds = new Set((data?.contacts || []).map((c) => c.id));
        setContactResults(
          (d.contacts || []).filter((c: LinkedContact) => !linkedIds.has(c.id))
        );
      }
    } catch {
      // ignore
    }
    setSearchingContacts(false);
  }

  useEffect(() => {
    const timeout = setTimeout(searchContacts, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactSearch]);

  async function handleLinkContact(contactId: string) {
    setLinkingContact(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId }),
      });
      if (res.ok) {
        closeAddContactModal();
        loadBusiness();
      }
    } catch {
      // ignore
    }
    setLinkingContact(false);
  }

  async function handleUnlinkContact(contactId: string) {
    if (isReadOnly) return;
    if (!confirm("Remove this contact from the business? The contact will not be deleted.")) return;
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadBusiness();
      }
    } catch {
      // ignore
    }
  }

  async function handleCreateContact() {
    if (!newContactForm.first_name.trim() || isReadOnly) return;
    setCreatingContact(true);
    setAddContactError(null);
    try {
      // Create the contact via the admin contacts API with business_id pre-linked
      const res = await fetch("/api/admin/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: newContactForm.first_name.trim(),
          last_name: newContactForm.last_name.trim(),
          email: newContactForm.email.trim() || null,
          phone: newContactForm.phone.trim() || null,
          role: newContactForm.role.trim() || null,
          business_id: businessId,
          business_name: data?.business.name || "",
          types: data?.business.types || [],
          source: "manual",
          status: "active",
        }),
      });
      if (res.ok) {
        // Log activity on the business
        await fetch(`/api/admin/businesses/${businessId}/activity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity_type: "contact_added",
            description: `Contact ${newContactForm.first_name.trim()} ${newContactForm.last_name.trim()} added`.trim(),
          }),
        });
        closeAddContactModal();
        loadBusiness();
      } else {
        const d = await res.json();
        setAddContactError(d.error || "Failed to create contact");
      }
    } catch {
      setAddContactError("Failed to create contact");
    }
    setCreatingContact(false);
  }

  function closeAddContactModal() {
    setShowAddContact(false);
    setAddContactMode("new");
    setContactSearch("");
    setContactResults([]);
    setNewContactForm({ first_name: "", last_name: "", email: "", phone: "", role: "" });
    setAddContactError(null);
  }

  // ─── Helpers ───

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatCurrency(amount: number) {
    return `\u00A3${Number(amount).toFixed(2)}`;
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
        <p className="text-slate-500">{error || "Business not found"}</p>
        <Link
          href="/admin/businesses"
          className="text-brand-600 hover:underline text-sm mt-2 inline-block"
        >
          Back to businesses
        </Link>
      </div>
    );
  }

  const { business, activity, notes, contacts, contactActivity, orders, invoices, wholesaleAccess } = data;

  // Merge business activity + notes + contact activity into timeline
  const timeline = [
    ...activity.map((a) => ({
      id: a.id,
      type: "business_activity" as const,
      subtype: a.activity_type,
      content: a.description,
      metadata: a.metadata,
      created_at: a.created_at,
      contactName: null as string | null,
    })),
    ...notes.map((n) => ({
      id: n.id,
      type: "note" as const,
      subtype: "note_added",
      content: n.content,
      metadata: {},
      created_at: n.created_at,
      contactName: null as string | null,
    })),
    ...(contactActivity as ContactActivityItem[]).map((a) => ({
      id: `ca-${a.id}`,
      type: "contact_activity" as const,
      subtype: a.activity_type,
      content: a.description,
      metadata: a.metadata || {},
      created_at: a.created_at,
      contactName: a.contacts
        ? [a.contacts.first_name, a.contacts.last_name].filter(Boolean).join(" ")
        : null,
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

  // Filter activity for the Activity tab
  const filteredActivity = activityFilter === "all"
    ? deduped
    : deduped.filter((item) => {
        if (activityFilter === "email") return item.subtype === "email_sent" || item.subtype === "email_received" || item.subtype === "email_logged";
        if (activityFilter === "note_added") return item.type === "note" || item.subtype === "note_added";
        if (activityFilter === "order") return item.subtype === "order_placed" || item.subtype === "invoice_sent" || item.subtype === "payment_received";
        if (activityFilter === "status") return item.subtype === "status_changed" || item.subtype === "type_changed";
        if (activityFilter === "contact") return item.subtype === "contact_added" || item.subtype === "contact_removed" || item.subtype === "contact_created";
        return true;
      });

  // Communication entries
  const emailActivity = deduped.filter(
    (item) => item.subtype === "email_sent" || item.subtype === "email_received" || item.subtype === "email_logged"
  );

  // Outstanding invoice balance
  const outstandingBalance = invoices
    .filter((inv) => inv.payment_status !== "paid" && inv.status !== "cancelled")
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0);

  const addressLines = [
    business.address_line_1,
    business.address_line_2,
    business.city,
    business.county,
    business.postcode,
    business.country,
  ].filter(Boolean);

  // Tab definitions with counts
  const showDealsTab = business.types.includes("lead") || business.types.includes("wholesale");

  const tabs: { id: TabId; label: string; icon: typeof Activity; count?: number }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "contacts", label: "Contacts", icon: Users, count: contacts.length },
    { id: "communications", label: "Comms", icon: Mail, count: emailActivity.length },
    { id: "orders", label: "Orders", icon: ShoppingBag, count: orders.length },
    { id: "invoices", label: "Invoices", icon: FileText, count: invoices.length },
    { id: "notes", label: "Notes", icon: StickyNote, count: notes.length },
    ...(showDealsTab ? [{ id: "deals" as const, label: "Deals", icon: Funnel }] : []),
  ];

  return (
    <div>
      {/* Read-only banner for roaster businesses */}
      {isReadOnly && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            {`This business belongs to ${business.roasterName || "a roaster"}. View only.`}
          </p>
        </div>
      )}

      {/* Breadcrumb + Back */}
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
          <Link
            href="/admin/businesses"
            className="hover:text-slate-700 transition-colors"
          >
            Businesses
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-medium">{business.name}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href="/admin/businesses"
              className="mt-1 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {business.name.charAt(0).toUpperCase()}
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {business.name}
                </h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[business.status] || "bg-slate-100 text-slate-600"}`}
                >
                  {business.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 ml-[52px]">
                {business.industry && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${INDUSTRY_COLORS[business.industry] || "bg-slate-100 text-slate-600"}`}>
                    {business.industry}
                  </span>
                )}
                {business.types.map((type) => (
                  <span
                    key={type}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type] || "bg-slate-100 text-slate-600"}`}
                  >
                    {type}
                  </span>
                ))}
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
                  {business.email && (
                    <a
                      href={`mailto:${business.email}`}
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
                    <Send className="w-4 h-4" />
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
                    Archive Business
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
          <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                    isActive
                      ? "border-brand-600 text-brand-700"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                      isActive ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* OVERVIEW TAB */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">Total Spend</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(business.total_spend)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">Orders</p>
                  <p className="text-lg font-bold text-slate-900">{business.order_count}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">Contacts</p>
                  <p className="text-lg font-bold text-slate-900">{contacts.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">Invoices</p>
                  <p className="text-lg font-bold text-slate-900">{invoices.length}</p>
                </div>
              </div>

              {/* Quick Note — ghost_roastery only */}
              {!isReadOnly && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex gap-3">
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add a quick note..."
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

              {/* Recent Activity */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-400" />
                    Recent Activity
                  </h2>
                  {deduped.length > 10 && (
                    <button
                      onClick={() => switchTab("activity")}
                      className="text-xs text-brand-600 hover:underline font-medium"
                    >
                      View all
                    </button>
                  )}
                </div>
                {deduped.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No activity yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {deduped.slice(0, 10).map((item) => (
                      <TimelineItem key={`${item.type}-${item.id}`} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* ACTIVITY TAB */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "activity" && (
            <>
              {/* Add Note (quick entry) — ghost_roastery only */}
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

              {/* Activity Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <div className="flex gap-1 flex-wrap">
                  {ACTIVITY_TYPE_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setActivityFilter(f.value)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        activityFilter === f.value
                          ? "bg-brand-50 text-brand-700 border border-brand-200"
                          : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Timeline */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-400" />
                    {`Activity Timeline (${filteredActivity.length})`}
                  </h2>
                </div>
                {filteredActivity.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No activity matches this filter</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {filteredActivity.map((item) => (
                      <TimelineItem key={`${item.type}-${item.id}`} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* CONTACTS TAB */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "contacts" && (
            <>
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    {`Contacts (${contacts.length})`}
                  </h2>
                  {!isReadOnly && (
                    <button
                      onClick={() => setShowAddContact(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Contact
                    </button>
                  )}
                </div>
                {contacts.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium mb-1">No contacts yet</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      {isReadOnly ? "No contacts are linked to this business." : "Add a new contact or link an existing one to this business."}
                    </p>
                    {!isReadOnly && (
                      <button
                        onClick={() => setShowAddContact(true)}
                        className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Contact
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 flex-shrink-0">
                            {(contact.first_name?.charAt(0) || contact.last_name?.charAt(0) || "?").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/contacts/${contact.id}`}
                              className="text-sm font-medium text-brand-600 hover:underline block truncate"
                            >
                              {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown"}
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              {contact.role && (
                                <span className="text-slate-700 font-medium">{contact.role}</span>
                              )}
                              {contact.email && <span className="truncate">{contact.email}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {contact.types.map((type) => (
                            <span
                              key={type}
                              className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type] || "bg-slate-100 text-slate-600"}`}
                            >
                              {type}
                            </span>
                          ))}
                          {!isReadOnly && (
                            <button
                              onClick={() => handleUnlinkContact(contact.id)}
                              className="text-slate-400 hover:text-red-500 p-1"
                              title="Remove from business"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* COMMUNICATIONS TAB */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "communications" && (
            <>
              {/* Email Integration Banner */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Email</span>
                  </div>
                  {!isReadOnly && (
                    <div className="flex items-center gap-2">
                      {business.email && (
                        <a
                          href={`mailto:${business.email}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open in Mail
                        </a>
                      )}
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        Log Email
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Gmail/Microsoft integration coming soon. For now, log emails manually.
                </p>
              </div>

              {/* Logged Emails */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {`Email History (${emailActivity.length})`}
                  </h2>
                </div>
                {emailActivity.length === 0 ? (
                  <div className="text-center py-10">
                    <Mail className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No emails logged yet</p>
                    {!isReadOnly && (
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className="mt-3 text-xs text-brand-600 hover:underline font-medium"
                      >
                        Log your first email
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {emailActivity.map((item) => {
                      const meta = item.metadata as Record<string, unknown>;
                      const direction = (meta?.direction as string) || (item.subtype === "email_received" ? "received" : "sent");
                      const DirIcon = direction === "received" ? ArrowDownLeft : ArrowUpRight;
                      return (
                        <div key={`${item.type}-${item.id}`} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              direction === "received" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                            }`}>
                              <DirIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {item.contactName && (
                                <p className="text-xs text-blue-600 font-medium mb-0.5">{item.contactName}</p>
                              )}
                              <p className="text-sm text-slate-700 font-medium">{item.content}</p>
                              {meta?.body ? (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{String(meta.body)}</p>
                              ) : null}
                              <p className="text-xs text-slate-400 mt-1">{formatDateTime(item.created_at)}</p>
                            </div>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              direction === "received" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                            }`}>
                              {direction}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* ORDERS TAB */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "orders" && (
            <>
              {/* Order Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">Total Spend</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(business.total_spend)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">Total Orders</p>
                  <p className="text-lg font-bold text-slate-900">{business.order_count}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">Avg Order</p>
                  <p className="text-lg font-bold text-slate-900">
                    {business.order_count > 0
                      ? formatCurrency(business.total_spend / business.order_count)
                      : formatCurrency(0)}
                  </p>
                </div>
              </div>

              {/* Orders Table */}
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
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 border-b border-slate-100">
                          <th className="text-left font-medium px-4 py-2.5">Date</th>
                          <th className="text-left font-medium px-4 py-2.5">Customer</th>
                          <th className="text-right font-medium px-4 py-2.5">Total</th>
                          <th className="text-center font-medium px-4 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {orders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-25">
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDate(order.created_at)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                              {order.customer_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 font-medium text-right">
                              {formatCurrency(order.total)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}
                              >
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* INVOICES TAB */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "invoices" && (
            <>
              {/* Invoice Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">Total Invoiced</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(invoices.reduce((s, i) => s + Number(i.total || 0), 0))}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">Outstanding</p>
                  <p className={`text-lg font-bold ${outstandingBalance > 0 ? "text-red-600" : "text-slate-900"}`}>
                    {formatCurrency(outstandingBalance)}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">Invoices</p>
                  <p className="text-lg font-bold text-slate-900">{invoices.length}</p>
                </div>
              </div>

              {/* Invoices Table */}
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
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 border-b border-slate-100">
                          <th className="text-left font-medium px-4 py-2.5">Invoice</th>
                          <th className="text-left font-medium px-4 py-2.5">Date</th>
                          <th className="text-right font-medium px-4 py-2.5">Total</th>
                          <th className="text-center font-medium px-4 py-2.5">Status</th>
                          <th className="text-left font-medium px-4 py-2.5">Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-25">
                            <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                              {inv.invoice_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDate(inv.created_at)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 font-medium text-right">
                              {formatCurrency(inv.total)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${INVOICE_STATUS_COLORS[inv.payment_status || inv.status] || "bg-slate-100 text-slate-600"}`}
                              >
                                {inv.payment_status || inv.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">
                              {inv.payment_due_date ? formatDate(inv.payment_due_date) : "\u2014"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* NOTES TAB */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "notes" && (
            <>
              {/* Add Note — ghost_roastery only */}
              {!isReadOnly && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex gap-3">
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add a note..."
                      rows={3}
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

              {/* Notes List */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-slate-400" />
                    {`Notes (${notes.length})`}
                  </h2>
                </div>
                {notes.length === 0 ? (
                  <div className="text-center py-10">
                    <StickyNote className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No notes yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {notes.map((note) => (
                      <div key={note.id} className="px-4 py-3">
                        {editingNote === note.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editNoteContent}
                              onChange={(e) => setEditNoteContent(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => { setEditingNote(null); setEditNoteContent(""); }}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUpdateNote(note.id)}
                                disabled={savingNote || !editNoteContent.trim()}
                                className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 disabled:opacity-50"
                              >
                                {savingNote ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                              <StickyNote className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                  {note.content}
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-1.5">
                                <p className="text-xs text-slate-400">
                                  {formatDateTime(note.created_at)}
                                </p>
                                {!isReadOnly && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingNote(note.id);
                                        setEditNoteContent(note.content);
                                      }}
                                      className="text-slate-400 hover:text-slate-600 p-1"
                                      title="Edit note"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNote(note.id)}
                                      className="text-slate-400 hover:text-red-500 p-1"
                                      title="Delete note"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Deals Tab */}
          {activeTab === "deals" && (
            <DealsTabContent
              timeline={deduped}
              isReadOnly={isReadOnly}
            />
          )}
        </div>

        {/* RIGHT COLUMN — Details + Wholesale */}
        <div className="space-y-6">
          {/* Business Details Card */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            </div>
            <div className="p-4 space-y-3">
              {/* Initials avatar */}
              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center text-2xl font-bold">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              </div>

              {business.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a
                    href={`mailto:${business.email}`}
                    className="text-sm text-brand-600 hover:underline truncate"
                  >
                    {business.email}
                  </a>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a
                    href={`tel:${business.phone}`}
                    className="text-sm text-slate-700"
                  >
                    {business.phone}
                  </a>
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a
                    href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-600 hover:underline truncate"
                  >
                    {business.website}
                  </a>
                </div>
              )}
              {addressLines.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">
                    {addressLines.map((line, i) => (
                      <span key={i}>{line}{i < addressLines.length - 1 && <br />}</span>
                    ))}
                  </span>
                </div>
              )}
              {business.industry && (
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${INDUSTRY_COLORS[business.industry] || "bg-slate-100 text-slate-600"}`}>
                    {business.industry}
                  </span>
                </div>
              )}
              <hr className="border-slate-100" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Owner</span>
                  <span className="text-xs text-slate-600">
                    {business.owner_type === "ghost_roastery" ? "Roastery Platform" : business.roasterName || "Roaster"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Source</span>
                  <span className="text-xs text-slate-600 capitalize">
                    {business.source.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Created</span>
                  <span className="text-xs text-slate-600">
                    {formatDate(business.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Last Activity</span>
                  <span className="text-xs text-slate-600">
                    {business.last_activity_at
                      ? formatDate(business.last_activity_at)
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                Revenue
              </h2>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Spend</span>
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(business.total_spend)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Orders</span>
                <span className="text-sm font-semibold text-slate-900">
                  {business.order_count}
                </span>
              </div>
              {outstandingBalance > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Outstanding</span>
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrency(outstandingBalance)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Wholesale Access Card */}
          {wholesaleAccess && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
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
                    <span className="text-xs text-slate-400">Payment Terms</span>
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

      {/* Edit Business Modal — ghost_roastery only */}
      {editing && !isReadOnly && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Edit Business
              </h3>
              <button
                onClick={() => setEditing(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Website
                </label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, website: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Industry
                </label>
                <select
                  value={editForm.industry}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, industry: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">None</option>
                  <option value="cafe">Cafe</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="gym">Gym</option>
                  <option value="hotel">Hotel</option>
                  <option value="office">Office</option>
                  <option value="coworking">Coworking</option>
                  <option value="events">Events</option>
                  <option value="retail">Retail</option>
                  <option value="other">Other</option>
                </select>
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
              {/* Address */}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
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

      {/* Log Email Modal — ghost_roastery only */}
      {showEmailModal && !isReadOnly && (
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
              Record an email you sent or received for this business.
            </p>

            <div className="space-y-4">
              {/* Direction */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Direction
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEmailForm((f) => ({ ...f, direction: "sent" }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      emailForm.direction === "sent"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Sent
                  </button>
                  <button
                    onClick={() => setEmailForm((f) => ({ ...f, direction: "received" }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      emailForm.direction === "received"
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Received
                  </button>
                </div>
              </div>

              {/* Contact */}
              {contacts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact (optional)
                  </label>
                  <select
                    value={emailForm.contact_id}
                    onChange={(e) => setEmailForm((f) => ({ ...f, contact_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">No specific contact</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                        {c.email ? ` (${c.email})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

      {/* Add Contact Modal — ghost_roastery only */}
      {showAddContact && !isReadOnly && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Add Contact
              </h3>
              <button
                onClick={closeAddContactModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-1 border-b border-slate-200 mb-4">
              <button
                onClick={() => setAddContactMode("new")}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  addContactMode === "new"
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                New Contact
              </button>
              <button
                onClick={() => setAddContactMode("existing")}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  addContactMode === "existing"
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Link Existing
              </button>
            </div>

            {/* New Contact Form */}
            {addContactMode === "new" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={newContactForm.first_name}
                      onChange={(e) => setNewContactForm((f) => ({ ...f, first_name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={newContactForm.last_name}
                      onChange={(e) => setNewContactForm((f) => ({ ...f, last_name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newContactForm.email}
                    onChange={(e) => setNewContactForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={newContactForm.phone}
                      onChange={(e) => setNewContactForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <input
                      type="text"
                      value={newContactForm.role}
                      onChange={(e) => setNewContactForm((f) => ({ ...f, role: e.target.value }))}
                      placeholder="e.g. Owner, Manager..."
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  {`Contact will be linked to ${data?.business.name || "this business"} and inherit its type (${(data?.business.types || []).join(", ")}).`}
                </p>

                {addContactError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {addContactError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={closeAddContactModal}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateContact}
                    disabled={creatingContact || !newContactForm.first_name.trim()}
                    className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                  >
                    {creatingContact ? "Creating..." : "Add Contact"}
                  </button>
                </div>
              </div>
            )}

            {/* Link Existing Contact */}
            {addContactMode === "existing" && (
              <div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search contacts by name or email..."
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {searchingContacts && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    </div>
                  )}
                  {!searchingContacts && contactSearch && contactResults.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6">
                      No contacts found
                    </p>
                  )}
                  {!searchingContacts && !contactSearch && (
                    <p className="text-sm text-slate-400 text-center py-6">
                      Start typing to search...
                    </p>
                  )}
                  {contactResults.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleLinkContact(contact.id)}
                      disabled={linkingContact}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 flex-shrink-0">
                        {(contact.first_name?.charAt(0) || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {[contact.first_name, contact.last_name].filter(Boolean).join(" ")}
                        </p>
                        {contact.email && (
                          <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                        )}
                      </div>
                      <div className="ml-auto flex-shrink-0">
                        <Plus className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline Item Sub-component ───

function TimelineItem({
  item,
}: {
  item: {
    id: string;
    type: string;
    subtype: string;
    content: string;
    metadata: Record<string, unknown>;
    created_at: string;
    contactName: string | null;
  };
}) {
  const Icon =
    item.type === "note"
      ? StickyNote
      : ACTIVITY_ICONS[item.subtype] || Activity;

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
            item.type === "note"
              ? "bg-amber-50 text-amber-600"
              : item.type === "contact_activity"
                ? "bg-blue-50 text-blue-600"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          {item.contactName && (
            <p className="text-xs text-blue-600 font-medium mb-0.5">
              {item.contactName}
            </p>
          )}
          {item.type === "note" ? (
            <div className="bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {item.content}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">{item.content}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {formatDateTime(item.created_at)}
          </p>
        </div>
      </div>
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
