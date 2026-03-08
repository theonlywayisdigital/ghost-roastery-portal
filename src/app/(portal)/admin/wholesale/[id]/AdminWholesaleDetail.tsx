"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "@/components/icons";
import Link from "next/link";

interface WholesaleAccount {
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
  price_tier: string | null;
  payment_terms: string | null;
  credit_limit: number | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  users: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  suspended: "bg-slate-100 text-slate-600 border-slate-200",
};

export function AdminWholesaleDetail({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [account, setAccount] = useState<WholesaleAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state for approve action
  const [priceTier, setPriceTier] = useState("standard");
  const [paymentTerms, setPaymentTerms] = useState("prepay");
  const [creditLimit, setCreditLimit] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/wholesale/${accountId}`);
        if (res.ok) {
          const data = await res.json();
          setAccount(data.account);
          if (data.account.price_tier) setPriceTier(data.account.price_tier);
          if (data.account.payment_terms) setPaymentTerms(data.account.payment_terms);
          if (data.account.credit_limit) setCreditLimit(String(data.account.credit_limit));
        }
      } catch (err) {
        console.error("Failed to load account:", err);
      }
      setLoading(false);
    }
    load();
  }, [accountId]);

  async function handleAction(action: string, extra?: Record<string, unknown>) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/wholesale/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        // Reload the account
        const refreshRes = await fetch(`/api/admin/wholesale/${accountId}`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setAccount(data.account);
        }
        setShowRejectForm(false);
      }
    } catch (err) {
      console.error("Action failed:", err);
    }
    setActionLoading(false);
  }

  function getUserInfo() {
    if (!account?.users) return { name: account?.business_name || "", email: "" };
    const usersRaw = account.users;
    const user = Array.isArray(usersRaw) ? usersRaw[0] : usersRaw;
    return {
      name: user?.full_name || account.business_name,
      email: user?.email || "",
    };
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const inputClassName =
    "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

  const labelClassName = "block text-sm font-medium text-slate-700 mb-1.5";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500">Account not found.</p>
        <Link href="/admin/wholesale" className="text-brand-600 hover:text-brand-700 text-sm mt-2 inline-block">
          Back to Wholesale Accounts
        </Link>
      </div>
    );
  }

  const info = getUserInfo();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/wholesale"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wholesale Accounts
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {account.business_name}
          </h1>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${
              STATUS_COLORS[account.status] || "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {account.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Application Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contact Name</p>
                <p className="text-sm text-slate-900">{info.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm text-slate-900">{info.email || "\u2014"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Business Type</p>
                <p className="text-sm text-slate-900 capitalize">{account.business_type || "\u2014"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly Volume</p>
                <p className="text-sm text-slate-900">{account.monthly_volume || "\u2014"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Address</p>
                <p className="text-sm text-slate-900">{account.business_address || "\u2014"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Website</p>
                {account.business_website ? (
                  <a
                    href={account.business_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-600 hover:text-brand-700"
                  >
                    {account.business_website}
                  </a>
                ) : (
                  <p className="text-sm text-slate-900">{"\u2014"}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">VAT Number</p>
                <p className="text-sm text-slate-900">{account.vat_number || "\u2014"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Applied</p>
                <p className="text-sm text-slate-900">{formatDate(account.created_at)}</p>
              </div>
            </div>
            {account.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{account.notes}</p>
              </div>
            )}
            {account.rejected_reason && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Rejection Reason</p>
                <p className="text-sm text-red-700">{account.rejected_reason}</p>
              </div>
            )}
          </div>

          {/* Terms — editable for approved accounts */}
          {account.status === "approved" && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Account Terms</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClassName}>Price Tier</label>
                  <select
                    value={priceTier}
                    onChange={(e) => setPriceTier(e.target.value)}
                    className={inputClassName}
                  >
                    <option value="standard">Standard</option>
                    <option value="preferred">Preferred</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className={inputClassName}
                  >
                    <option value="prepay">Prepay</option>
                    <option value="net_7">Net 7</option>
                    <option value="net_14">Net 14</option>
                    <option value="net_30">Net 30</option>
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>
                    Credit Limit (£)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="No limit"
                    className={inputClassName}
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() =>
                    handleAction("update", {
                      priceTier,
                      paymentTerms,
                      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
                    })
                  }
                  disabled={actionLoading}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>

            {account.status === "pending" && (
              <div className="space-y-4">
                {/* Approve form */}
                <div className="space-y-3">
                  <div>
                    <label className={labelClassName}>Price Tier</label>
                    <select
                      value={priceTier}
                      onChange={(e) => setPriceTier(e.target.value)}
                      className={inputClassName}
                    >
                      <option value="standard">Standard</option>
                      <option value="preferred">Preferred</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClassName}>Payment Terms</label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className={inputClassName}
                    >
                      <option value="prepay">Prepay</option>
                      <option value="net_7">Net 7</option>
                      <option value="net_14">Net 14</option>
                      <option value="net_30">Net 30</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClassName}>Credit Limit (£)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="No limit"
                      className={inputClassName}
                    />
                  </div>
                  <button
                    onClick={() =>
                      handleAction("approve", {
                        priceTier,
                        paymentTerms,
                        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
                      })
                    }
                    disabled={actionLoading}
                    className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Approving..." : "Approve Application"}
                  </button>
                </div>

                <hr className="border-slate-200" />

                {/* Reject */}
                {showRejectForm ? (
                  <div className="space-y-3">
                    <div>
                      <label className={labelClassName}>Rejection Reason</label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        placeholder="Reason for rejection (optional)..."
                        className={inputClassName}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleAction("reject", { reason: rejectReason })
                        }
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="w-full px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                  >
                    Reject Application
                  </button>
                )}
              </div>
            )}

            {account.status === "approved" && (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    Approved {account.approved_at ? `on ${formatDate(account.approved_at)}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleAction("suspend")}
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 border border-orange-300 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50 disabled:opacity-50"
                >
                  Suspend Account
                </button>
              </div>
            )}

            {account.status === "suspended" && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg">
                  <p className="text-sm text-slate-600">Account is currently suspended.</p>
                </div>
                <button
                  onClick={() => handleAction("reactivate")}
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Reactivate Account
                </button>
              </div>
            )}

            {account.status === "rejected" && (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">Application was rejected.</p>
                </div>
                <button
                  onClick={() =>
                    handleAction("approve", {
                      priceTier,
                      paymentTerms,
                      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
                    })
                  }
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Approve Instead
                </button>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Timeline</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Applied</span>
                <span className="text-slate-900">{formatDate(account.created_at)}</span>
              </div>
              {account.approved_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved</span>
                  <span className="text-slate-900">{formatDate(account.approved_at)}</span>
                </div>
              )}
              {account.updated_at && account.updated_at !== account.created_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Updated</span>
                  <span className="text-slate-900">{formatDate(account.updated_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
