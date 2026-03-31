"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
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
  Users,
} from "@/components/icons";

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

const TABS = [
  { id: "all", label: "All", icon: Building2, typeFilter: "" },
  { id: "wholesale", label: "Wholesale", icon: Users, typeFilter: "wholesale" },
  { id: "retail", label: "Retail", icon: ShoppingBag, typeFilter: "retail" },
  { id: "suppliers", label: "Suppliers", icon: Truck, typeFilter: "supplier" },
  { id: "leads", label: "Leads", icon: UserPlus, typeFilter: "lead" },
] as const;

type TabId = (typeof TABS)[number]["id"];

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

export function BusinessesCRM() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, wholesale: 0, retail: 0, supplier: 0, lead: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [industryFilter, setIndustryFilter] = useState("");
  const [sortField, setSortField] = useState("last_activity_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Add business modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
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
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const tabConfig = TABS.find((t) => t.id === activeTab)!;

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      sort: sortField,
      order: sortOrder,
      status: statusFilter,
    });
    if (tabConfig.typeFilter) params.set("type", tabConfig.typeFilter);
    if (search) params.set("search", search);
    if (industryFilter) params.set("industry", industryFilter);


    try {
      const res = await fetch(`/api/businesses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses);
        setTotal(data.total);
        setCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to load businesses:", err);
    }
    setLoading(false);
  }, [page, sortField, sortOrder, statusFilter, tabConfig.typeFilter, search, industryFilter, activeTab]);

  // Sync on first load
  useEffect(() => {
    if (!synced) {
      setSyncing(true);
      fetch("/api/businesses/sync")
        .then(() => {
          setSynced(true);
          setSyncing(false);
        })
        .catch(() => setSyncing(false));
    }
  }, [synced]);

  useEffect(() => {
    if (synced || !syncing) {
      loadBusinesses();
    }
  }, [loadBusinesses, synced, syncing]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, search, statusFilter, industryFilter]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  async function handleAddBusiness() {
    setAddSaving(true);
    setAddError(null);
    try {
      const types = addForm.types;

      const { contact_first_name, contact_last_name, contact_email, contact_phone, contact_role, ...bizFields } = addForm;
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
        setShowAddModal(false);
        setAddForm({
          name: "", email: "", phone: "", website: "", industry: "",
          types: [],
          address_line_1: "", address_line_2: "", city: "", county: "", postcode: "",
          contact_first_name: "", contact_last_name: "", contact_email: "", contact_phone: "", contact_role: "",
        });
        loadBusinesses();
      } else {
        const data = await res.json();
        setAddError(data.error || "Failed to create business");
      }
    } catch {
      setAddError("Failed to create business");
    }
    setAddSaving(false);
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
          <h1 className="text-2xl font-bold text-slate-900">Businesses</h1>
          <p className="text-slate-500 mt-1">
            Manage your wholesale accounts, retail contacts, suppliers, and leads.
          </p>
        </div>
        <button
          onClick={() => {
            const defaultTypes: string[] = [];
            if (activeTab === "retail") defaultTypes.push("retail");
            else if (activeTab === "wholesale") defaultTypes.push("wholesale");
            else if (activeTab === "suppliers") defaultTypes.push("supplier");
            else if (activeTab === "leads") defaultTypes.push("lead");
            setAddForm({
              name: "", email: "", phone: "", website: "", industry: "",
              types: defaultTypes,
              address_line_1: "", address_line_2: "", city: "", county: "", postcode: "",
              contact_first_name: "", contact_last_name: "", contact_email: "", contact_phone: "", contact_role: "",
            });
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Business
        </button>
      </div>

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

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or industry..."
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
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
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
      </div>

      {/* Businesses table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading || syncing ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            {syncing && (
              <span className="ml-2 text-sm text-slate-500">Syncing businesses...</span>
            )}
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {search ? "No businesses matching your search." : "No businesses yet. Add your first business."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <SortableHeader label="Business" field="name" current={sortField} order={sortOrder} onSort={handleSort} />
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Industry
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Types
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden xl:table-cell">
                      Primary Contact
                    </th>
                    <SortableHeader label="Email" field="email" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                    <SortableHeader label="Spend" field="total_spend" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                    <SortableHeader label="Orders" field="order_count" current={sortField} order={sortOrder} onSort={handleSort} className="hidden lg:table-cell" />
                    <SortableHeader label="Last Activity" field="last_activity_at" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
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

      {/* Add Business Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Business</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
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
                      value={addForm.contact_first_name}
                      onChange={(e) => setAddForm((f) => ({ ...f, contact_first_name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={addForm.contact_last_name}
                      onChange={(e) => setAddForm((f) => ({ ...f, contact_last_name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={addForm.contact_email}
                      onChange={(e) => setAddForm((f) => ({ ...f, contact_email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={addForm.contact_phone}
                      onChange={(e) => setAddForm((f) => ({ ...f, contact_phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={addForm.contact_role}
                    onChange={(e) => setAddForm((f) => ({ ...f, contact_role: e.target.value }))}
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
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Phone</label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="text"
                  value={addForm.website}
                  onChange={(e) => setAddForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                <select
                  value={addForm.industry}
                  onChange={(e) => setAddForm((f) => ({ ...f, industry: e.target.value }))}
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

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={addForm.address_line_1}
                  onChange={(e) => setAddForm((f) => ({ ...f, address_line_1: e.target.value }))}
                  placeholder="Address line 1"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2"
                />
                <input
                  type="text"
                  value={addForm.address_line_2}
                  onChange={(e) => setAddForm((f) => ({ ...f, address_line_2: e.target.value }))}
                  placeholder="Address line 2"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={addForm.city}
                    onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    value={addForm.county}
                    onChange={(e) => setAddForm((f) => ({ ...f, county: e.target.value }))}
                    placeholder="County"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    value={addForm.postcode}
                    onChange={(e) => setAddForm((f) => ({ ...f, postcode: e.target.value }))}
                    placeholder="Postcode"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

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
                onClick={handleAddBusiness}
                disabled={addSaving || !addForm.name.trim()}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {addSaving ? "Creating..." : "Add Business"}
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
