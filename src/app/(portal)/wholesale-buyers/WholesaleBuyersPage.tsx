"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "@/components/icons";
import { SettingsSection } from "./SettingsSection";
import Link from "next/link";
import { Plus, Pencil, Trash2, Star, X } from "lucide-react";

interface BuyerUser {
  full_name: string | null;
  email: string;
}

interface WholesaleBuyer {
  id: string;
  user_id: string;
  status: string;
  business_name: string;
  business_type: string | null;
  business_address: string | null;
  business_website: string | null;
  vat_number: string | null;
  monthly_volume: string | null;
  notes: string | null;
  payment_terms: string;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  contact_id: string | null;
  users: BuyerUser | BuyerUser[] | null;
}

interface BuyerAddress {
  id: string;
  label: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  is_default: boolean;
}

const EMPTY_ADDR = {
  label: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  county: "",
  postcode: "",
  country: "GB",
};

function formatBuyerAddress(addr: BuyerAddress) {
  return [addr.address_line_1, addr.address_line_2, addr.city, addr.county, addr.postcode, addr.country]
    .filter(Boolean)
    .join(", ");
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-50 text-yellow-700" },
  approved: { label: "Active", className: "bg-green-50 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700" },
  suspended: { label: "Suspended", className: "bg-slate-100 text-slate-600" },
};

const TERMS_OPTIONS = [
  { value: "net7", label: "Net 7" },
  { value: "net14", label: "Net 14" },
  { value: "net30", label: "Net 30" },
];

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  cafe: "Caf\u00e9",
  restaurant: "Restaurant",
  hotel: "Hotel",
  office: "Office",
  retailer: "Retailer",
  gym: "Gym",
  coworking: "Coworking",
  events: "Events",
  retail: "Retail",
  other: "Other",
};

function getUser(users: BuyerUser | BuyerUser[] | null): BuyerUser | null {
  if (!users) return null;
  if (Array.isArray(users)) return users[0] || null;
  return users;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function WholesaleBuyersPage({
  buyers: initial,
  autoApprove,
  wholesaleStripeEnabled,
  autoApprovePaymentTerms = "net30",
  roasterId,
  hideHeader,
}: {
  buyers: WholesaleBuyer[];
  autoApprove: boolean;
  wholesaleStripeEnabled: boolean;
  autoApprovePaymentTerms?: string;
  roasterId: string;
  hideHeader?: boolean;
}) {
  const [buyers, setBuyers] = useState(initial);
  const [tab, setTab] = useState<"requests" | "active">("requests");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Approve form state
  const [approveTerms, setApproveTerms] = useState("net30");
  const [showApproveForm, setShowApproveForm] = useState<string | null>(null);

  // Reject form state
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);

  // Edit form state
  const [editTerms, setEditTerms] = useState("");
  const [showEditForm, setShowEditForm] = useState<string | null>(null);

  // Address state
  const [addressMap, setAddressMap] = useState<Record<string, BuyerAddress[]>>({});
  const [addressLoading, setAddressLoading] = useState<string | null>(null);
  const [showAddrForm, setShowAddrForm] = useState<string | null>(null);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);

  const requests = buyers.filter(
    (b) => b.status === "pending" || b.status === "rejected"
  );
  const active = buyers.filter(
    (b) => b.status === "approved" || b.status === "suspended"
  );

  const pendingCount = buyers.filter((b) => b.status === "pending").length;

  async function handleAction(
    id: string,
    action: string,
    extra?: Record<string, unknown>
  ) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/wholesale-buyers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });

      if (res.ok) {
        // Refresh data
        const listRes = await fetch("/api/wholesale-buyers");
        if (listRes.ok) {
          const data = await listRes.json();
          setBuyers(data.buyers);
        }
      }
    } finally {
      setUpdatingId(null);
      setShowApproveForm(null);
      setShowRejectForm(null);
      setShowEditForm(null);
    }
  }

  // ─── Address helpers ───
  const fetchAddresses = useCallback(async (buyerId: string) => {
    setAddressLoading(buyerId);
    try {
      const res = await fetch(`/api/wholesale-buyers/${buyerId}/addresses`);
      if (res.ok) {
        const data = await res.json();
        setAddressMap((prev) => ({ ...prev, [buyerId]: data.addresses }));
      }
    } finally {
      setAddressLoading(null);
    }
  }, []);

  // Fetch addresses when a buyer row is expanded
  useEffect(() => {
    if (expandedId && !addressMap[expandedId]) {
      fetchAddresses(expandedId);
    }
  }, [expandedId, addressMap, fetchAddresses]);

  function openAddrAdd(buyerId: string) {
    setShowAddrForm(buyerId);
    setEditingAddrId(null);
    setAddrForm(EMPTY_ADDR);
    setAddrError(null);
  }

  function openAddrEdit(buyerId: string, addr: BuyerAddress) {
    setShowAddrForm(buyerId);
    setEditingAddrId(addr.id);
    setAddrForm({
      label: addr.label || "",
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2 || "",
      city: addr.city,
      county: addr.county || "",
      postcode: addr.postcode,
      country: addr.country,
    });
    setAddrError(null);
  }

  function closeAddrForm() {
    setShowAddrForm(null);
    setEditingAddrId(null);
    setAddrForm(EMPTY_ADDR);
    setAddrError(null);
  }

  async function handleAddrSave(buyerId: string) {
    if (!addrForm.address_line_1 || !addrForm.city || !addrForm.postcode) {
      setAddrError("Address line 1, city, and postcode are required.");
      return;
    }
    setAddrSaving(true);
    setAddrError(null);
    try {
      if (editingAddrId) {
        const res = await fetch(`/api/wholesale-buyers/${buyerId}/addresses/${editingAddrId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addrForm),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      } else {
        const res = await fetch(`/api/wholesale-buyers/${buyerId}/addresses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addrForm),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      }
      closeAddrForm();
      await fetchAddresses(buyerId);
    } catch (err) {
      setAddrError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddrSaving(false);
    }
  }

  async function handleAddrDelete(buyerId: string, addrId: string) {
    if (!confirm("Delete this address?")) return;
    try {
      await fetch(`/api/wholesale-buyers/${buyerId}/addresses/${addrId}`, { method: "DELETE" });
      await fetchAddresses(buyerId);
    } catch { /* ignore */ }
  }

  async function handleAddrSetDefault(buyerId: string, addrId: string) {
    try {
      await fetch(`/api/wholesale-buyers/${buyerId}/addresses/${addrId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      await fetchAddresses(buyerId);
    } catch { /* ignore */ }
  }

  function renderAddressSection(buyerId: string) {
    const addrs = addressMap[buyerId];
    const loading = addressLoading === buyerId;

    return (
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Delivery Addresses
          </h4>
          <button
            onClick={(e) => { e.stopPropagation(); openAddrAdd(buyerId); }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>

        {loading && <p className="text-xs text-slate-400">Loading addresses...</p>}

        {!loading && addrs && addrs.length === 0 && showAddrForm !== buyerId && (
          <p className="text-xs text-slate-400">No addresses saved.</p>
        )}

        {addrs && addrs.length > 0 && (
          <div className="space-y-2">
            {addrs.map((addr) => (
              <div
                key={addr.id}
                className={`flex items-start justify-between gap-2 rounded-md border p-3 ${addr.is_default ? "border-slate-300 bg-white" : "border-slate-200 bg-white"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {addr.label && <span className="text-xs font-medium text-slate-700">{addr.label}</span>}
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{formatBuyerAddress(addr)}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {!addr.is_default && (
                    <button onClick={() => handleAddrSetDefault(buyerId, addr.id)} className="p-1 rounded text-slate-400 hover:text-amber-600" title="Set default">
                      <Star className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => openAddrEdit(buyerId, addr)} className="p-1 rounded text-slate-400 hover:text-slate-600" title="Edit">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleAddrDelete(buyerId, addr.id)} className="p-1 rounded text-slate-400 hover:text-red-600" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddrForm === buyerId && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium text-slate-900">
                {editingAddrId ? "Edit Address" : "New Address"}
              </h5>
              <button onClick={closeAddrForm} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Label</label>
                <input type="text" placeholder="e.g. Head Office" value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Address Line 1 *</label>
                <input type="text" value={addrForm.address_line_1} onChange={(e) => setAddrForm({ ...addrForm, address_line_1: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Address Line 2</label>
                <input type="text" value={addrForm.address_line_2} onChange={(e) => setAddrForm({ ...addrForm, address_line_2: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">City *</label>
                <input type="text" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">County</label>
                <input type="text" value={addrForm.county} onChange={(e) => setAddrForm({ ...addrForm, county: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Postcode *</label>
                <input type="text" value={addrForm.postcode} onChange={(e) => setAddrForm({ ...addrForm, postcode: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Country</label>
                <input type="text" value={addrForm.country} onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
            </div>
            {addrError && <p className="mt-2 text-xs text-red-600">{addrError}</p>}
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={closeAddrForm} className="px-3 py-1.5 rounded-md text-xs text-slate-600 hover:bg-slate-50 border border-slate-300">Cancel</button>
              <button onClick={() => handleAddrSave(buyerId)} disabled={addrSaving}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">
                {addrSaving ? "Saving..." : editingAddrId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStatusBadge(status: string) {
    const config = STATUS_CONFIG[status] || {
      label: status,
      className: "bg-slate-100 text-slate-600",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
    );
  }

  function renderRequestsTable() {
    if (requests.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No pending wholesale applications.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-8 px-4 py-3" />
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Business
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                  Type
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Contact
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                  Volume
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((buyer) => {
                const isExpanded = expandedId === buyer.id;
                return (
                  <Fragment key={buyer.id}>
                    <tr
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : buyer.id)
                      }
                    >
                      <td className="px-4 py-4">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">
                          {buyer.business_name}
                        </p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600">
                          {buyer.business_type
                            ? BUSINESS_TYPE_LABELS[buyer.business_type] ||
                              buyer.business_type
                            : "\u2014"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {buyer.contact_id ? (
                          <Link
                            href={`/contacts/${buyer.contact_id}`}
                            className="text-sm text-brand-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {getUser(buyer.users)?.full_name || "\u2014"}
                          </Link>
                        ) : (
                          <p className="text-sm text-slate-900">
                            {getUser(buyer.users)?.full_name || "\u2014"}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {getUser(buyer.users)?.email}
                        </p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600">
                          {buyer.monthly_volume || "\u2014"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {renderStatusBadge(buyer.status)}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-500">
                          {formatDate(buyer.created_at)}
                        </span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="bg-slate-50 px-6 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                            <div className="space-y-3">
                              {buyer.business_address && (
                                <div>
                                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Address
                                  </h4>
                                  <p className="text-sm text-slate-700">
                                    {buyer.business_address}
                                  </p>
                                </div>
                              )}
                              {buyer.business_website && (
                                <div>
                                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Website
                                  </h4>
                                  <a
                                    href={buyer.business_website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-brand-600 hover:underline"
                                  >
                                    {buyer.business_website}
                                  </a>
                                </div>
                              )}
                              {buyer.vat_number && (
                                <div>
                                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    VAT Number
                                  </h4>
                                  <p className="text-sm text-slate-700">
                                    {buyer.vat_number}
                                  </p>
                                </div>
                              )}
                              {buyer.notes && (
                                <div>
                                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Notes
                                  </h4>
                                  <p className="text-sm text-slate-700 whitespace-pre-line">
                                    {buyer.notes}
                                  </p>
                                </div>
                              )}
                              {buyer.rejected_reason && (
                                <div>
                                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Rejection Reason
                                  </h4>
                                  <p className="text-sm text-red-600">
                                    {buyer.rejected_reason}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4">
                              {buyer.status === "pending" && (
                                <>
                                  {showApproveForm === buyer.id ? (
                                    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                                      <h4 className="text-sm font-medium text-slate-900">
                                        Approve Application
                                      </h4>
                                      <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                          Payment Terms
                                        </label>
                                        <select
                                          value={approveTerms}
                                          onChange={(e) =>
                                            setApproveTerms(e.target.value)
                                          }
                                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        >
                                          {TERMS_OPTIONS.map((o) => (
                                            <option
                                              key={o.value}
                                              value={o.value}
                                            >
                                              {o.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAction(buyer.id, "approve", {
                                              paymentTerms: approveTerms,
                                            });
                                          }}
                                          disabled={updatingId === buyer.id}
                                          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                                        >
                                          Confirm Approval
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowApproveForm(null);
                                          }}
                                          className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : showRejectForm === buyer.id ? (
                                    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                                      <h4 className="text-sm font-medium text-slate-900">
                                        Reject Application
                                      </h4>
                                      <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                          Reason (optional)
                                        </label>
                                        <textarea
                                          value={rejectReason}
                                          onChange={(e) =>
                                            setRejectReason(e.target.value)
                                          }
                                          placeholder="Explain why the application was rejected..."
                                          rows={3}
                                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAction(buyer.id, "reject", {
                                              reason: rejectReason,
                                            });
                                          }}
                                          disabled={updatingId === buyer.id}
                                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                        >
                                          Confirm Rejection
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowRejectForm(null);
                                          }}
                                          className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setApproveTerms("net30");
                                          setShowApproveForm(buyer.id);
                                          setShowRejectForm(null);
                                        }}
                                        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRejectReason("");
                                          setShowRejectForm(buyer.id);
                                          setShowApproveForm(null);
                                        }}
                                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                              {buyer.status === "rejected" && (
                                <p className="text-sm text-slate-500">
                                  This application has been rejected. The
                                  applicant can reapply from the storefront.
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderActiveTable() {
    if (active.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">
            No active wholesale buyers yet. Approve applications to see them
            here.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-8 px-4 py-3" />
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Business
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Contact
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                  Terms
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                  Since
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {active.map((buyer) => {
                const isExpanded = expandedId === buyer.id;
                const termsLabel =
                  TERMS_OPTIONS.find((t) => t.value === buyer.payment_terms)
                    ?.label || buyer.payment_terms;
                const buyerUser = getUser(buyer.users);

                return (
                  <Fragment key={buyer.id}>
                    <tr
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : buyer.id)
                      }
                    >
                      <td className="px-4 py-4">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">
                          {buyer.business_name}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {buyer.contact_id ? (
                          <Link
                            href={`/contacts/${buyer.contact_id}`}
                            className="text-sm text-brand-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {buyerUser?.full_name || "\u2014"}
                          </Link>
                        ) : (
                          <p className="text-sm text-slate-900">
                            {buyerUser?.full_name || "\u2014"}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {buyerUser?.email}
                        </p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600">
                          {termsLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {renderStatusBadge(buyer.status)}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-500">
                          {buyer.approved_at
                            ? formatDate(buyer.approved_at)
                            : formatDate(buyer.created_at)}
                        </span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 px-6 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                            <div className="space-y-3">
                              {buyer.business_address && (
                                <div>
                                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Business Address
                                  </h4>
                                  <p className="text-sm text-slate-700">
                                    {buyer.business_address}
                                  </p>
                                </div>
                              )}
                              {buyer.business_website && (
                                <div>
                                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Website
                                  </h4>
                                  <a
                                    href={buyer.business_website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-brand-600 hover:underline"
                                  >
                                    {buyer.business_website}
                                  </a>
                                </div>
                              )}
                              {buyer.vat_number && (
                                <div>
                                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    VAT Number
                                  </h4>
                                  <p className="text-sm text-slate-700">
                                    {buyer.vat_number}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4">
                              {showEditForm === buyer.id ? (
                                <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                                  <h4 className="text-sm font-medium text-slate-900">
                                    Edit Terms
                                  </h4>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">
                                      Payment Terms
                                    </label>
                                    <select
                                      value={editTerms}
                                      onChange={(e) =>
                                        setEditTerms(e.target.value)
                                      }
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    >
                                      {TERMS_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                          {o.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction(buyer.id, "update", {
                                          paymentTerms: editTerms,
                                        });
                                      }}
                                      disabled={updatingId === buyer.id}
                                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                                    >
                                      Save Changes
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowEditForm(null);
                                      }}
                                      className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditTerms(buyer.payment_terms);
                                      setShowEditForm(buyer.id);
                                    }}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                  >
                                    Edit Terms
                                  </button>
                                  {buyer.status === "approved" ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction(buyer.id, "suspend");
                                      }}
                                      disabled={updatingId === buyer.id}
                                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                                    >
                                      Suspend
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction(buyer.id, "reactivate");
                                      }}
                                      disabled={updatingId === buyer.id}
                                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                                    >
                                      Reactivate
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {renderAddressSection(buyer.id)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      {!hideHeader && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              Wholesale Buyers
            </h1>
            <p className="text-slate-500 mt-1">
              Manage trade account applications and active wholesale buyers.
            </p>
          </div>

          <SettingsSection
            autoApprove={autoApprove}
            wholesaleStripeEnabled={wholesaleStripeEnabled}
            autoApprovePaymentTerms={autoApprovePaymentTerms}
            roasterId={roasterId}
          />
        </>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("requests")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "requests"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {`Requests${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
        </button>
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "active"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {`Active Buyers (${active.length})`}
        </button>
      </div>

      {tab === "requests" ? renderRequestsTable() : renderActiveTable()}
    </>
  );
}
