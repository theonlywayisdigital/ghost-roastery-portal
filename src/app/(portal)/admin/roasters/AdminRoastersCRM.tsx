"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Download,
  AlertTriangle,
} from "@/components/icons";

interface Roaster {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  country: string;
  city: string | null;
  is_active: boolean;
  is_ghost_roaster: boolean;
  ghost_roaster_application_status: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  strikes: number;
  created_at: string;
  order_count?: number;
  revenue?: number;
}

interface AdminRoastersCRMProps {
  countries: string[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-slate-100 text-slate-600",
};

const PARTNER_COLORS: Record<string, string> = {
  approved: "bg-green-50 text-green-700",
  pending: "bg-yellow-50 text-yellow-700",
  rejected: "bg-red-50 text-red-600",
};

export function AdminRoastersCRM({ countries }: AdminRoastersCRMProps) {
  const router = useRouter();
  const [roasters, setRoasters] = useState<Roaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [stripeFilter, setStripeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [strikesFilter, setStrikesFilter] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    business_name: "",
    contact_first_name: "",
    contact_last_name: "",
    email: "",
    phone: "",
    website: "",
    country: "GB",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadRoasters = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      sort: sortField,
      order: sortOrder,
      status: statusFilter,
    });
    if (search) params.set("search", search);
    if (partnerFilter) params.set("partnerStatus", partnerFilter);
    if (stripeFilter) params.set("stripeStatus", stripeFilter);
    if (countryFilter) params.set("country", countryFilter);
    if (strikesFilter) params.set("strikes", strikesFilter);

    try {
      const res = await fetch(`/api/admin/roasters?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRoasters(data.roasters);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to load roasters:", err);
    }
    setLoading(false);
  }, [page, sortField, sortOrder, statusFilter, search, partnerFilter, stripeFilter, countryFilter, strikesFilter]);

  useEffect(() => {
    loadRoasters();
  }, [loadRoasters]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, statusFilter, partnerFilter, stripeFilter, countryFilter, strikesFilter]);

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
    if (selected.size === roasters.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(roasters.map((r) => r.id)));
    }
  }

  async function handleAddRoaster() {
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/roasters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddForm({ business_name: "", contact_first_name: "", contact_last_name: "", email: "", phone: "", website: "", country: "GB" });
        loadRoasters();
      } else {
        const data = await res.json();
        setAddError(data.error || "Failed to create roaster");
      }
    } catch {
      setAddError("Failed to create roaster");
    }
    setAddSaving(false);
  }

  async function handleBulkAction(action: "activate" | "deactivate") {
    for (const id of Array.from(selected)) {
      await fetch(`/api/admin/roasters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: action === "activate" }),
      });
    }
    setSelected(new Set());
    loadRoasters();
  }

  async function handleExport() {
    window.open("/api/admin/roasters/export", "_blank");
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
    return `\u00A3${Number(amount || 0).toFixed(2)}`;
  }

  function getStripeStatus(roaster: Roaster) {
    if (!roaster.stripe_account_id) return "none";
    if (roaster.stripe_onboarding_complete) return "complete";
    return "pending";
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roasters</h1>
          <p className="text-slate-500 mt-1">
            Manage all partner roasters across the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Roaster
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or contact..."
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
          <option value="all">All</option>
        </select>
        <select
          value={partnerFilter}
          onChange={(e) => setPartnerFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Partner Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={stripeFilter}
          onChange={(e) => setStripeFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Stripe Status</option>
          <option value="complete">Connected</option>
          <option value="pending">Pending</option>
          <option value="none">Not Set Up</option>
        </select>
        {countries.length > 0 && (
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Country</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <select
          value={strikesFilter}
          onChange={(e) => setStrikesFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Strikes</option>
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-brand-50 border border-brand-200 rounded-lg">
          <span className="text-sm font-medium text-brand-700">
            {`${selected.size} selected`}
          </span>
          <button
            onClick={() => handleBulkAction("activate")}
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Activate
          </button>
          <button
            onClick={() => handleBulkAction("deactivate")}
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Deactivate
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : roasters.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {search ? "No roasters matching your search." : "No roasters yet."}
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
                        checked={selected.size === roasters.length && roasters.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <SortableHeader label="Business Name" field="business_name" current={sortField} order={sortOrder} onSort={handleSort} />
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Location
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Partner
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Stripe
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Orders
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Revenue
                    </th>
                    <SortableHeader label="Strikes" field="strikes" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                    <SortableHeader label="Joined" field="created_at" current={sortField} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roasters.map((roaster) => {
                    const stripeStatus = getStripeStatus(roaster);
                    return (
                      <tr
                        key={roaster.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => router.push(`/admin/roasters/${roaster.id}`)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(roaster.id)}
                            onChange={() => toggleSelect(roaster.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{roaster.business_name}</p>
                          <p className="text-xs text-slate-500">{roaster.contact_name}</p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-slate-600">
                            {[roaster.city, roaster.country].filter(Boolean).join(", ") || roaster.country}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            roaster.is_active ? STATUS_COLORS.active : STATUS_COLORS.inactive
                          }`}>
                            {roaster.is_active ? "active" : "inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {roaster.ghost_roaster_application_status ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              PARTNER_COLORS[roaster.ghost_roaster_application_status] || "bg-slate-100 text-slate-600"
                            }`}>
                              {roaster.ghost_roaster_application_status}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">{"\u2014"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            stripeStatus === "complete" ? "bg-green-50 text-green-700" :
                            stripeStatus === "pending" ? "bg-yellow-50 text-yellow-700" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {stripeStatus === "complete" ? "connected" : stripeStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-slate-900">{roaster.order_count || 0}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-slate-900">{formatCurrency(roaster.revenue || 0)}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <StrikesDisplay strikes={roaster.strikes || 0} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-slate-500">{formatDate(roaster.created_at)}</span>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Add Roaster Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Roaster</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={addForm.business_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, business_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={addForm.country}
                    onChange={(e) => setAddForm((f) => ({ ...f, country: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="url"
                  value={addForm.website}
                  onChange={(e) => setAddForm((f) => ({ ...f, website: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
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
                onClick={handleAddRoaster}
                disabled={addSaving || !addForm.business_name || !addForm.contact_first_name || !addForm.email}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {addSaving ? "Creating..." : "Add Roaster"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ───

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

function StrikesDisplay({ strikes }: { strikes: number }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${
            i < strikes ? "bg-red-500" : "bg-slate-200"
          }`}
        />
      ))}
      {strikes > 0 && (
        <AlertTriangle className="w-3.5 h-3.5 text-red-500 ml-1" />
      )}
    </div>
  );
}
