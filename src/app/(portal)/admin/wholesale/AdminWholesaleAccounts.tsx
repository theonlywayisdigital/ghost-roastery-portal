"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "@/components/icons";
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
  users: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
  suspended: "bg-slate-100 text-slate-600",
};

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "suspended";

export function AdminWholesaleAccounts() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<WholesaleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wholesale");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.error("Failed to load wholesale accounts:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  function getUserInfo(account: WholesaleAccount) {
    const usersRaw = account.users;
    if (!usersRaw) return { name: account.business_name, email: "" };
    const user = Array.isArray(usersRaw) ? usersRaw[0] : usersRaw;
    return {
      name: user?.full_name || account.business_name,
      email: user?.email || "",
    };
  }

  const filtered = accounts.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const info = getUserInfo(a);
      return (
        a.business_name.toLowerCase().includes(q) ||
        info.email.toLowerCase().includes(q) ||
        info.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Simple client-side pagination
  const pageSize = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const statusCounts = accounts.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wholesale Accounts</h1>
          <p className="text-slate-500 mt-1">
            Manage wholesale access applications and approved accounts for Ghost Roastery.
          </p>
        </div>
        <Link
          href="/admin/wholesale/orders"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
        >
          View Orders
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "pending" as const, label: "Pending" },
            { id: "approved" as const, label: "Approved" },
            { id: "rejected" as const, label: "Rejected" },
            { id: "suspended" as const, label: "Suspended" },
          ] as const
        ).map((tab) => {
          const count = tab.id === "all" ? accounts.length : statusCounts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                statusFilter === tab.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {`${tab.label}${count > 0 ? ` (${count})` : ""}`}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name, contact, or email..."
            className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {search ? "No accounts matching your search." : "No wholesale accounts yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Business
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Contact
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Price Tier
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                      Payment Terms
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Applied
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((account) => {
                    const info = getUserInfo(account);
                    return (
                      <tr
                        key={account.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => router.push(`/admin/wholesale/${account.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {account.business_name}
                            </p>
                            {account.business_type && (
                              <p className="text-xs text-slate-500 capitalize">
                                {account.business_type}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div>
                            <p className="text-sm text-slate-900">{info.name}</p>
                            <p className="text-xs text-slate-500">{info.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              STATUS_COLORS[account.status] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {account.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-slate-600 capitalize">
                            {account.price_tier || "\u2014"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-slate-600 capitalize">
                            {account.payment_terms || "\u2014"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-slate-500">
                            {formatDate(account.created_at)}
                          </span>
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
                  {`Showing ${(page - 1) * pageSize + 1}\u2013${Math.min(page * pageSize, filtered.length)} of ${filtered.length}`}
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
    </div>
  );
}
