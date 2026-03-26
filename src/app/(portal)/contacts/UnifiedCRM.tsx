"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Building2,
  ShoppingBag,
  Truck,
  UserPlus,
  Search,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Download,
} from "@/components/icons";
import { useUpgradeBanner } from "@/hooks/useUpgradeBanner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";

// ─── Shared types ───

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
  business_id: string | null;
  businesses: { id: string; name: string } | null;
}

interface Business {
  id: string;
  name: string;
  types: string[];
  industry: string | null;
  status: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  total_spend: number;
  order_count: number;
  last_activity_at: string | null;
  created_at: string;
  primary_contact: {
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
}

interface Counts {
  all: number;
  wholesale: number;
  retail: number;
  supplier: number;
  lead: number;
}

// ─── Constants ───

type PrimaryTab = "people" | "businesses";

const TYPE_TABS = [
  { id: "all", label: "All", icon: Users, typeFilter: "" },
  { id: "wholesale", label: "Wholesale", icon: Users, typeFilter: "wholesale" },
  { id: "retail", label: "Retail", icon: ShoppingBag, typeFilter: "retail" },
  { id: "suppliers", label: "Suppliers", icon: Truck, typeFilter: "supplier" },
  { id: "leads", label: "Leads", icon: UserPlus, typeFilter: "lead" },
] as const;

type TypeTabId = (typeof TYPE_TABS)[number]["id"];

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

// ─── Helpers ───

function formatDate(dateStr: string | null) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return `\u00A3${Number(amount).toFixed(2)}`;
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export function UnifiedCRM() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as PrimaryTab) || "people";
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>(
    initialTab === "businesses" ? "businesses" : "people"
  );

  // ── People state ──
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactCounts, setContactCounts] = useState<Counts>({ all: 0, wholesale: 0, retail: 0, supplier: 0, lead: 0 });
  const [contactLoading, setContactLoading] = useState(true);
  const [contactSyncing, setContactSyncing] = useState(false);
  const [contactSynced, setContactSynced] = useState(false);
  const [contactTotal, setContactTotal] = useState(0);
  const [contactPage, setContactPage] = useState(1);
  const [contactSearch, setContactSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState("active");
  const [contactTypeTab, setContactTypeTab] = useState<TypeTabId>("all");
  const [contactSortField, setContactSortField] = useState("last_activity_at");
  const [contactSortOrder, setContactSortOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Businesses state ──
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bizCounts, setBizCounts] = useState<Counts>({ all: 0, wholesale: 0, retail: 0, supplier: 0, lead: 0 });
  const [bizLoading, setBizLoading] = useState(true);
  const [bizSyncing, setBizSyncing] = useState(false);
  const [bizSynced, setBizSynced] = useState(false);
  const [bizTotal, setBizTotal] = useState(0);
  const [bizPage, setBizPage] = useState(1);
  const [bizSearch, setBizSearch] = useState("");
  const [bizStatusFilter, setBizStatusFilter] = useState("active");
  const [bizTypeTab, setBizTypeTab] = useState<TypeTabId>("all");
  const [bizIndustryFilter, setBizIndustryFilter] = useState("");
  const [bizSortField, setBizSortField] = useState("last_activity_at");
  const [bizSortOrder, setBizSortOrder] = useState<"asc" | "desc">("desc");

  // ── Modals ──
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showAddBizModal, setShowAddBizModal] = useState(false);

  // Add contact form
  const [contactAddForm, setContactAddForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    business_name: "",
    types: [] as string[],
  });
  const [contactAddError, setContactAddError] = useState<string | null>(null);
  const [contactAddSaving, setContactAddSaving] = useState(false);

  // Add business form
  const [bizAddForm, setBizAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    types: [] as string[],
    address_line_1: "",
    address_line_2: "",
    city: "",
    county: "",
    postcode: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    contact_role: "",
  });
  const [bizAddError, setBizAddError] = useState<string | null>(null);
  const [bizAddSaving, setBizAddSaving] = useState(false);

  const banner = useUpgradeBanner("crmContacts");

  // ─── Data loading: People ───

  const contactTypeFilter = TYPE_TABS.find((t) => t.id === contactTypeTab)!.typeFilter;

  const loadContacts = useCallback(async () => {
    setContactLoading(true);
    const params = new URLSearchParams({
      page: String(contactPage),
      sort: contactSortField,
      order: contactSortOrder,
      status: contactStatusFilter,
    });
    if (contactTypeFilter) params.set("type", contactTypeFilter);
    if (contactSearch) params.set("search", contactSearch);

    try {
      const res = await fetch(`/api/contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
        setContactTotal(data.total);
        setContactCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
    setContactLoading(false);
  }, [contactPage, contactSortField, contactSortOrder, contactStatusFilter, contactTypeFilter, contactSearch]);

  useEffect(() => {
    if (!contactSynced) {
      setContactSyncing(true);
      fetch("/api/contacts/sync")
        .then(() => { setContactSynced(true); setContactSyncing(false); })
        .catch(() => setContactSyncing(false));
    }
  }, [contactSynced]);

  useEffect(() => {
    if (primaryTab === "people" && (contactSynced || !contactSyncing)) {
      loadContacts();
    }
  }, [primaryTab, loadContacts, contactSynced, contactSyncing]);

  useEffect(() => {
    setContactPage(1);
    setSelected(new Set());
  }, [contactTypeTab, contactSearch, contactStatusFilter]);

  // ─── Data loading: Businesses ───

  const bizTypeFilter = TYPE_TABS.find((t) => t.id === bizTypeTab)!.typeFilter;

  const loadBusinesses = useCallback(async () => {
    setBizLoading(true);
    const params = new URLSearchParams({
      page: String(bizPage),
      sort: bizSortField,
      order: bizSortOrder,
      status: bizStatusFilter,
    });
    if (bizTypeFilter) params.set("type", bizTypeFilter);
    if (bizSearch) params.set("search", bizSearch);
    if (bizIndustryFilter) params.set("industry", bizIndustryFilter);

    try {
      const res = await fetch(`/api/businesses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses);
        setBizTotal(data.total);
        setBizCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to load businesses:", err);
    }
    setBizLoading(false);
  }, [bizPage, bizSortField, bizSortOrder, bizStatusFilter, bizTypeFilter, bizSearch, bizIndustryFilter]);

  useEffect(() => {
    if (!bizSynced) {
      setBizSyncing(true);
      fetch("/api/businesses/sync")
        .then(() => { setBizSynced(true); setBizSyncing(false); })
        .catch(() => setBizSyncing(false));
    }
  }, [bizSynced]);

  useEffect(() => {
    if (primaryTab === "businesses" && (bizSynced || !bizSyncing)) {
      loadBusinesses();
    }
  }, [primaryTab, loadBusinesses, bizSynced, bizSyncing]);

  useEffect(() => {
    setBizPage(1);
  }, [bizTypeTab, bizSearch, bizStatusFilter, bizIndustryFilter]);

  // ─── Sort handlers ───

  function handleContactSort(field: string) {
    if (contactSortField === field) {
      setContactSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setContactSortField(field);
      setContactSortOrder("desc");
    }
  }

  function handleBizSort(field: string) {
    if (bizSortField === field) {
      setBizSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setBizSortField(field);
      setBizSortOrder("desc");
    }
  }

  // ─── Selection ───

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map((c) => c.id)));
    }
  }

  async function handleBulkStatus(newStatus: string) {
    for (const id of Array.from(selected)) {
      await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    }
    setSelected(new Set());
    loadContacts();
  }

  // ─── Add contact ───

  async function handleAddContact() {
    setContactAddSaving(true);
    setContactAddError(null);
    try {
      let types = contactAddForm.types;
      if (types.length === 0) {
        if (contactTypeTab === "retail") types = ["retail"];
        else if (contactTypeTab === "wholesale") types = ["wholesale"];
        else if (contactTypeTab === "suppliers") types = ["supplier"];
        else if (contactTypeTab === "leads") types = ["lead"];
        else types = ["retail"];
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contactAddForm, types, source: "manual" }),
      });
      if (res.ok) {
        setShowAddContactModal(false);
        setContactAddForm({ first_name: "", last_name: "", email: "", phone: "", business_name: "", types: [] });
        loadContacts();
      } else {
        const data = await res.json();
        setContactAddError(data.error || "Failed to create contact");
      }
    } catch {
      setContactAddError("Failed to create contact");
    }
    setContactAddSaving(false);
  }

  // ─── Add business ───

  async function handleAddBusiness() {
    setBizAddSaving(true);
    setBizAddError(null);
    try {
      let types = bizAddForm.types;
      if (types.length === 0) {
        if (bizTypeTab === "retail") types = ["retail"];
        else if (bizTypeTab === "wholesale") types = ["wholesale"];
        else if (bizTypeTab === "suppliers") types = ["supplier"];
        else if (bizTypeTab === "leads") types = ["lead"];
        else types = ["retail"];
      }

      const { contact_first_name, contact_last_name, contact_email, contact_phone, contact_role, ...bizFields } = bizAddForm;
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bizFields,
          types,
          source: "manual",
          primary_contact: contact_first_name.trim() ? {
            first_name: contact_first_name.trim(),
            last_name: contact_last_name.trim(),
            email: contact_email.trim() || null,
            phone: contact_phone.trim() || null,
            role: contact_role.trim() || null,
          } : undefined,
        }),
      });
      if (res.ok) {
        setShowAddBizModal(false);
        setBizAddForm({
          name: "", email: "", phone: "", website: "", industry: "",
          types: [],
          address_line_1: "", address_line_2: "", city: "", county: "", postcode: "",
          contact_first_name: "", contact_last_name: "", contact_email: "", contact_phone: "", contact_role: "",
        });
        loadBusinesses();
      } else {
        const data = await res.json();
        setBizAddError(data.error || "Failed to create business");
      }
    } catch {
      setBizAddError("Failed to create business");
    }
    setBizAddSaving(false);
  }

  // ─── Pagination ───

  const contactTotalPages = Math.ceil(contactTotal / 20);
  const bizTotalPages = Math.ceil(bizTotal / 20);

  // Current tab counts for the type tabs
  const currentCounts = primaryTab === "people" ? contactCounts : bizCounts;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-500 mt-1">
            Manage your contacts and businesses in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const defaultTypes: string[] = [];
              const typeTab = primaryTab === "people" ? contactTypeTab : bizTypeTab;
              if (typeTab === "retail") defaultTypes.push("retail");
              else if (typeTab === "wholesale") defaultTypes.push("wholesale");
              else if (typeTab === "suppliers") defaultTypes.push("supplier");
              else if (typeTab === "leads") defaultTypes.push("lead");
              setContactAddForm({ first_name: "", last_name: "", email: "", phone: "", business_name: "", types: defaultTypes });
              setShowAddContactModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
          <button
            onClick={() => {
              const defaultTypes: string[] = [];
              const typeTab = primaryTab === "people" ? contactTypeTab : bizTypeTab;
              if (typeTab === "retail") defaultTypes.push("retail");
              else if (typeTab === "wholesale") defaultTypes.push("wholesale");
              else if (typeTab === "suppliers") defaultTypes.push("supplier");
              else if (typeTab === "leads") defaultTypes.push("lead");
              setBizAddForm({
                name: "", email: "", phone: "", website: "", industry: "",
                types: defaultTypes,
                address_line_1: "", address_line_2: "", city: "", county: "", postcode: "",
                contact_first_name: "", contact_last_name: "", contact_email: "", contact_phone: "", contact_role: "",
              });
              setShowAddBizModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Business
          </button>
        </div>
      </div>

      {banner.show && (
        <div className="mb-6">
          <UpgradeBanner
            type={banner.type}
            message={banner.message}
            upgradeTier={banner.upgradeTier}
            productType={banner.productType}
          />
        </div>
      )}

      {/* Primary tabs: People / Businesses */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        <button
          onClick={() => setPrimaryTab("people")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            primaryTab === "people"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Users className="w-4 h-4" />
          People
        </button>
        <button
          onClick={() => setPrimaryTab("businesses")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            primaryTab === "businesses"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Businesses
        </button>
      </div>

      {/* Secondary type tabs */}
      <div className="flex gap-1 mb-4">
        {TYPE_TABS.map((tab) => {
          const Icon = tab.icon;
          const activeTypeTab = primaryTab === "people" ? contactTypeTab : bizTypeTab;
          const setTypeTab = primaryTab === "people" ? setContactTypeTab : setBizTypeTab;
          const isActive = activeTypeTab === tab.id;
          const countKey = (tab.typeFilter || tab.id) as keyof Counts;
          const count = currentCounts[countKey] ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => setTypeTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700 border border-brand-200"
                  : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {`${tab.label} (${count})`}
            </button>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={primaryTab === "people" ? contactSearch : bizSearch}
            onChange={(e) => primaryTab === "people" ? setContactSearch(e.target.value) : setBizSearch(e.target.value)}
            placeholder={primaryTab === "people" ? "Search by name, email, or business..." : "Search by name, email, or industry..."}
            className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={primaryTab === "people" ? contactStatusFilter : bizStatusFilter}
          onChange={(e) => primaryTab === "people" ? setContactStatusFilter(e.target.value) : setBizStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
          <option value="all">All statuses</option>
        </select>
        {primaryTab === "businesses" && (
          <select
            value={bizIndustryFilter}
            onChange={(e) => setBizIndustryFilter(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All industries</option>
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
        )}
      </div>

      {/* Bulk actions bar (people only) */}
      {primaryTab === "people" && selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-brand-50 border border-brand-200 rounded-lg">
          <span className="text-sm font-medium text-brand-700">
            {`${selected.size} selected`}
          </span>
          <button
            onClick={() => handleBulkStatus("active")}
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Set Active
          </button>
          <button
            onClick={() => handleBulkStatus("inactive")}
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Set Inactive
          </button>
          <button
            onClick={() => handleBulkStatus("archived")}
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Archive
          </button>
          <button
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-400 cursor-not-allowed flex items-center gap-1"
            disabled
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══ People Tab Content ═══ */}
      {primaryTab === "people" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {contactLoading || contactSyncing ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              {contactSyncing && (
                <span className="ml-2 text-sm text-slate-500">Syncing contacts...</span>
              )}
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {contactSearch ? "No contacts matching your search." : "No contacts yet. Add your first contact or sync from orders."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.size === contacts.length && contacts.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300"
                        />
                      </th>
                      <SortableHeader label="Name" field="last_name" current={contactSortField} order={contactSortOrder} onSort={handleContactSort} />
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                        Business
                      </th>
                      <SortableHeader label="Email" field="email" current={contactSortField} order={contactSortOrder} onSort={handleContactSort} className="hidden md:table-cell" />
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                        Types
                      </th>
                      <SortableHeader label="Spend" field="total_spend" current={contactSortField} order={contactSortOrder} onSort={handleContactSort} className="hidden md:table-cell" />
                      <SortableHeader label="Orders" field="order_count" current={contactSortField} order={contactSortOrder} onSort={handleContactSort} className="hidden lg:table-cell" />
                      <SortableHeader label="Last Activity" field="last_activity_at" current={contactSortField} order={contactSortOrder} onSort={handleContactSort} className="hidden md:table-cell" />
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => router.push(`/contacts/${contact.id}`)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(contact.id)}
                            onChange={() => toggleSelect(contact.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">
                            {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown"}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                          {contact.businesses ? (
                            <Link
                              href={`/businesses/${contact.businesses.id}`}
                              className="text-sm text-brand-600 hover:underline"
                            >
                              {contact.businesses.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-600">
                              {contact.business_name || "\u2014"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-slate-600">
                            {contact.email || "\u2014"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {contact.types.map((type) => (
                              <span
                                key={type}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type] || "bg-slate-100 text-slate-600"}`}
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-slate-900">
                            {formatCurrency(contact.total_spend)}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-slate-600">
                            {contact.order_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-slate-500">
                            {formatDate(contact.last_activity_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[contact.status] || "bg-slate-100 text-slate-600"}`}>
                            {contact.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {contactTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <span className="text-sm text-slate-500">
                    {`Showing ${(contactPage - 1) * 20 + 1}\u2013${Math.min(contactPage * 20, contactTotal)} of ${contactTotal}`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setContactPage((p) => Math.max(1, p - 1))}
                      disabled={contactPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setContactPage((p) => Math.min(contactTotalPages, p + 1))}
                      disabled={contactPage === contactTotalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ Businesses Tab Content ═══ */}
      {primaryTab === "businesses" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {bizLoading || bizSyncing ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              {bizSyncing && (
                <span className="ml-2 text-sm text-slate-500">Syncing businesses...</span>
              )}
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {bizSearch ? "No businesses matching your search." : "No businesses yet. Add your first business."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <SortableHeader label="Business" field="name" current={bizSortField} order={bizSortOrder} onSort={handleBizSort} />
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                        Industry
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                        Types
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden xl:table-cell">
                        Primary Contact
                      </th>
                      <SortableHeader label="Email" field="email" current={bizSortField} order={bizSortOrder} onSort={handleBizSort} className="hidden md:table-cell" />
                      <SortableHeader label="Spend" field="total_spend" current={bizSortField} order={bizSortOrder} onSort={handleBizSort} className="hidden md:table-cell" />
                      <SortableHeader label="Orders" field="order_count" current={bizSortField} order={bizSortOrder} onSort={handleBizSort} className="hidden lg:table-cell" />
                      <SortableHeader label="Last Activity" field="last_activity_at" current={bizSortField} order={bizSortOrder} onSort={handleBizSort} className="hidden md:table-cell" />
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {businesses.map((biz) => (
                      <tr
                        key={biz.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => router.push(`/businesses/${biz.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {biz.name.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm font-medium text-slate-900">
                              {biz.name}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {biz.industry ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium capitalize ${INDUSTRY_COLORS[biz.industry] || "bg-slate-100 text-slate-600"}`}>
                              {biz.industry}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">{"\u2014"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {biz.types.map((type) => (
                              <span
                                key={type}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type] || "bg-slate-100 text-slate-600"}`}
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          {biz.primary_contact ? (
                            <span className="text-sm text-slate-600">
                              {[biz.primary_contact.first_name, biz.primary_contact.last_name].filter(Boolean).join(" ")}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">{"\u2014"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-slate-600">
                            {biz.email || "\u2014"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-slate-900">
                            {formatCurrency(biz.total_spend)}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-slate-600">
                            {biz.order_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-slate-500">
                            {formatDate(biz.last_activity_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[biz.status] || "bg-slate-100 text-slate-600"}`}>
                            {biz.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bizTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <span className="text-sm text-slate-500">
                    {`Showing ${(bizPage - 1) * 20 + 1}\u2013${Math.min(bizPage * 20, bizTotal)} of ${bizTotal}`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setBizPage((p) => Math.max(1, p - 1))}
                      disabled={bizPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setBizPage((p) => Math.min(bizTotalPages, p + 1))}
                      disabled={bizPage === bizTotalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ Add Contact Modal ═══ */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Contact</h3>
              <button onClick={() => setShowAddContactModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={contactAddForm.first_name}
                    onChange={(e) => setContactAddForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={contactAddForm.last_name}
                    onChange={(e) => setContactAddForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={contactAddForm.email}
                  onChange={(e) => setContactAddForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={contactAddForm.phone}
                    onChange={(e) => setContactAddForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={contactAddForm.business_name}
                    onChange={(e) => setContactAddForm((f) => ({ ...f, business_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                <div className="flex flex-wrap gap-2">
                  {["retail", "wholesale", "supplier", "lead"].map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setContactAddForm((f) => ({
                          ...f,
                          types: f.types.includes(type)
                            ? f.types.filter((t) => t !== type)
                            : [...f.types, type],
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        contactAddForm.types.includes(type)
                          ? "bg-brand-50 border-brand-300 text-brand-700"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {contactAddError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {contactAddError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddContactModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                disabled={contactAddSaving || (!contactAddForm.first_name && !contactAddForm.last_name && !contactAddForm.email)}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {contactAddSaving ? "Creating..." : "Add Contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Add Business Modal ═══ */}
      {showAddBizModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Business</h3>
              <button onClick={() => setShowAddBizModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={bizAddForm.name}
                  onChange={(e) => setBizAddForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              {/* Primary Contact */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Primary Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={bizAddForm.contact_first_name}
                      onChange={(e) => setBizAddForm((f) => ({ ...f, contact_first_name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={bizAddForm.contact_last_name}
                      onChange={(e) => setBizAddForm((f) => ({ ...f, contact_last_name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={bizAddForm.contact_email}
                      onChange={(e) => setBizAddForm((f) => ({ ...f, contact_email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={bizAddForm.contact_phone}
                      onChange={(e) => setBizAddForm((f) => ({ ...f, contact_phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={bizAddForm.contact_role}
                    onChange={(e) => setBizAddForm((f) => ({ ...f, contact_role: e.target.value }))}
                    placeholder="e.g. Owner, Manager, Buyer..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* Business Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Email</label>
                  <input
                    type="email"
                    value={bizAddForm.email}
                    onChange={(e) => setBizAddForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Phone</label>
                  <input
                    type="tel"
                    value={bizAddForm.phone}
                    onChange={(e) => setBizAddForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="text"
                  value={bizAddForm.website}
                  onChange={(e) => setBizAddForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                <select
                  value={bizAddForm.industry}
                  onChange={(e) => setBizAddForm((f) => ({ ...f, industry: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select industry...</option>
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                <div className="flex flex-wrap gap-2">
                  {["retail", "wholesale", "supplier", "lead"].map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setBizAddForm((f) => ({
                          ...f,
                          types: f.types.includes(type)
                            ? f.types.filter((t) => t !== type)
                            : [...f.types, type],
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        bizAddForm.types.includes(type)
                          ? "bg-brand-50 border-brand-300 text-brand-700"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={bizAddForm.address_line_1}
                  onChange={(e) => setBizAddForm((f) => ({ ...f, address_line_1: e.target.value }))}
                  placeholder="Address line 1"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2"
                />
                <input
                  type="text"
                  value={bizAddForm.address_line_2}
                  onChange={(e) => setBizAddForm((f) => ({ ...f, address_line_2: e.target.value }))}
                  placeholder="Address line 2"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={bizAddForm.city}
                    onChange={(e) => setBizAddForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    value={bizAddForm.county}
                    onChange={(e) => setBizAddForm((f) => ({ ...f, county: e.target.value }))}
                    placeholder="County"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    value={bizAddForm.postcode}
                    onChange={(e) => setBizAddForm((f) => ({ ...f, postcode: e.target.value }))}
                    placeholder="Postcode"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {bizAddError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {bizAddError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddBizModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBusiness}
                disabled={bizAddSaving || !bizAddForm.name.trim()}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {bizAddSaving ? "Creating..." : "Add Business"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper component ───

function SortableHeader({
  label,
  field,
  current,
  order,
  onSort,
  className = "",
}: {
  label: string;
  field: string;
  current: string;
  order: "asc" | "desc";
  onSort: (field: string) => void;
  className?: string;
}) {
  const isActive = current === field;
  return (
    <th
      className={`text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-slate-700 select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${isActive ? "text-brand-600" : "text-slate-300"}`} />
        {isActive && (
          <span className="text-brand-600">{order === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </div>
    </th>
  );
}
