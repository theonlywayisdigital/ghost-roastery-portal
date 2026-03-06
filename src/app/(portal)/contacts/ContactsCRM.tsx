"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { WholesaleBuyersPage } from "../wholesale-buyers/WholesaleBuyersPage";
import {
  Users,
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
} from "lucide-react";
import { useUpgradeBanner } from "@/hooks/useUpgradeBanner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";

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
  lead_status: string | null;
  total_spend: number;
  order_count: number;
  last_activity_at: string | null;
  created_at: string;
  business_id: string | null;
  businesses: { id: string; name: string } | null;
}

interface Counts {
  all: number;
  wholesale: number;
  customer: number;
  supplier: number;
  lead: number;
}

interface ContactsCRMProps {
  buyers: unknown[];
  autoApprove: boolean;
  roasterId: string;
}

const TABS = [
  { id: "all", label: "All", icon: Users, typeFilter: "" },
  { id: "wholesale", label: "Wholesale", icon: Users, typeFilter: "wholesale" },
  { id: "customers", label: "Customers", icon: ShoppingBag, typeFilter: "customer" },
  { id: "suppliers", label: "Suppliers", icon: Truck, typeFilter: "supplier" },
  { id: "leads", label: "Leads", icon: UserPlus, typeFilter: "lead" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TYPE_COLORS: Record<string, string> = {
  customer: "bg-blue-50 text-blue-700",
  wholesale: "bg-purple-50 text-purple-700",
  supplier: "bg-amber-50 text-amber-700",
  lead: "bg-green-50 text-green-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-slate-100 text-slate-600",
  archived: "bg-red-50 text-red-600",
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-yellow-50 text-yellow-700",
  qualified: "bg-purple-50 text-purple-700",
  won: "bg-green-50 text-green-700",
  lost: "bg-red-50 text-red-600",
};

export function ContactsCRM({ buyers, autoApprove, roasterId }: ContactsCRMProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "all";
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : "all"
  );

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, wholesale: 0, customer: 0, supplier: 0, lead: 0 });
  const [loading, setLoading] = useState(true);
  const banner = useUpgradeBanner("crmContacts");
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [leadStatusFilter, setLeadStatusFilter] = useState("");
  const [sortField, setSortField] = useState("last_activity_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Add contact modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    business_name: "",
    types: [] as string[],
    lead_status: "new",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  // Selected rows for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tabConfig = TABS.find((t) => t.id === activeTab)!;

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      sort: sortField,
      order: sortOrder,
      status: statusFilter,
    });
    if (tabConfig.typeFilter) params.set("type", tabConfig.typeFilter);
    if (search) params.set("search", search);
    if (leadStatusFilter && activeTab === "leads") params.set("lead_status", leadStatusFilter);

    try {
      const res = await fetch(`/api/contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
        setTotal(data.total);
        setCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
    setLoading(false);
  }, [page, sortField, sortOrder, statusFilter, tabConfig.typeFilter, search, leadStatusFilter, activeTab]);

  // Sync on first load
  useEffect(() => {
    if (!synced) {
      setSyncing(true);
      fetch("/api/contacts/sync")
        .then(() => {
          setSynced(true);
          setSyncing(false);
        })
        .catch(() => setSyncing(false));
    }
  }, [synced]);

  useEffect(() => {
    if (synced || !syncing) {
      loadContacts();
    }
  }, [loadContacts, synced, syncing]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [activeTab, search, statusFilter, leadStatusFilter]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

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

  async function handleAddContact() {
    setAddSaving(true);
    setAddError(null);
    try {
      // Pre-select type based on current tab
      let types = addForm.types;
      if (types.length === 0) {
        if (activeTab === "customers") types = ["customer"];
        else if (activeTab === "wholesale") types = ["wholesale"];
        else if (activeTab === "suppliers") types = ["supplier"];
        else if (activeTab === "leads") types = ["lead"];
        else types = ["customer"];
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          types,
          source: "manual",
          lead_status: types.includes("lead") ? addForm.lead_status : undefined,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddForm({ first_name: "", last_name: "", email: "", phone: "", business_name: "", types: [], lead_status: "new" });
        loadContacts();
      } else {
        const data = await res.json();
        setAddError(data.error || "Failed to create contact");
      }
    } catch {
      setAddError("Failed to create contact");
    }
    setAddSaving(false);
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

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-500 mt-1">
            Manage your wholesale buyers, customers, suppliers, and leads.
          </p>
        </div>
        <button
          onClick={() => {
            // Pre-select type for current tab
            const defaultTypes: string[] = [];
            if (activeTab === "customers") defaultTypes.push("customer");
            else if (activeTab === "wholesale") defaultTypes.push("wholesale");
            else if (activeTab === "suppliers") defaultTypes.push("supplier");
            else if (activeTab === "leads") defaultTypes.push("lead");
            setAddForm({ first_name: "", last_name: "", email: "", phone: "", business_name: "", types: defaultTypes, lead_status: "new" });
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = counts[tab.id as keyof Counts] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {`${tab.label}${count > 0 ? ` (${count})` : ""}`}
            </button>
          );
        })}
      </div>

      {/* Wholesale tab: Show applications section then contacts list */}
      {activeTab === "wholesale" && (
        <div className="mb-8">
          <WholesaleBuyersPage
            buyers={buyers as Parameters<typeof WholesaleBuyersPage>[0]["buyers"]}
            autoApprove={autoApprove}
            roasterId={roasterId}
          />
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or business..."
            className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
          <option value="all">All statuses</option>
        </select>
        {activeTab === "leads" && (
          <select
            value={leadStatusFilter}
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All leads</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        )}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
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
            onClick={() => {/* placeholder */}}
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

      {/* Contacts table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading || syncing ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            {syncing && (
              <span className="ml-2 text-sm text-slate-500">Syncing contacts...</span>
            )}
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {search ? "No contacts matching your search." : "No contacts yet. Add your first contact or sync from orders."}
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
                    <SortableHeader label="Name" field="last_name" current={sortField} order={sortOrder} onSort={handleSort} />
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Business
                    </th>
                    <SortableHeader label="Email" field="email" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Types
                    </th>
                    {activeTab === "leads" && (
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Lead Status
                      </th>
                    )}
                    <SortableHeader label="Spend" field="total_spend" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                    <SortableHeader label="Orders" field="order_count" current={sortField} order={sortOrder} onSort={handleSort} className="hidden lg:table-cell" />
                    <SortableHeader label="Last Activity" field="last_activity_at" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
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
                          {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "\u2014"}
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
                      {activeTab === "leads" && (
                        <td className="px-4 py-3">
                          {contact.lead_status ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLORS[contact.lead_status] || "bg-slate-100 text-slate-600"}`}>
                              {contact.lead_status}
                            </span>
                          ) : "\u2014"}
                        </td>
                      )}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  {`Showing ${(page - 1) * 20 + 1}\u2013${Math.min(page * 20, total)} of ${total}`}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
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

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Contact</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={addForm.business_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, business_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                <div className="flex flex-wrap gap-2">
                  {["customer", "wholesale", "supplier", "lead"].map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setAddForm((f) => ({
                          ...f,
                          types: f.types.includes(type)
                            ? f.types.filter((t) => t !== type)
                            : [...f.types, type],
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        addForm.types.includes(type)
                          ? "bg-brand-50 border-brand-300 text-brand-700"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {addForm.types.includes("lead") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lead Status</label>
                  <select
                    value={addForm.lead_status}
                    onChange={(e) => setAddForm((f) => ({ ...f, lead_status: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              )}

              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {addError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                disabled={addSaving || (!addForm.first_name && !addForm.last_name && !addForm.email)}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {addSaving ? "Creating..." : "Add Contact"}
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
