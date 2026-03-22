"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  MailOpen,
  Archive,
  Package,
  Loader2,
  RefreshCw,
  MessageSquare,
  Settings,
} from "@/components/icons";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column } from "@/components/admin/DataTable";
import type { FilterConfig } from "@/components/admin/FilterBar";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface InboxMessage {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  is_read: boolean;
  is_archived: boolean;
  is_converted: boolean;
  converted_order_id: string | null;
  attachments: { filename: string }[];
  received_at: string;
}

interface DirectThread {
  thread_id: string;
  subject: string | null;
  snippet: string | null;
  from_email: string;
  from_name: string | null;
  last_received_at: string;
  message_count: number;
  unread_count: number;
  provider: string;
  connection_id: string;
}

type InboxView = "orders" | "direct";
type OrderFilter = "all" | "unread" | "converted" | "archived";
type DirectFilter = "all" | "unread";

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function truncate(text: string | null, maxLen: number): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "..." : clean;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function InboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Top-level view ──
  const activeView: InboxView = (searchParams.get("view") as InboxView) || "orders";

  // ── Orders state ──
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderUnreadCount, setOrderUnreadCount] = useState(0);
  const [orderLoading, setOrderLoading] = useState(true);

  // ── Direct Comms state ──
  const [threads, setThreads] = useState<DirectThread[]>([]);
  const [directTotal, setDirectTotal] = useState(0);
  const [directUnreadCount, setDirectUnreadCount] = useState(0);
  const [directLoading, setDirectLoading] = useState(true);
  const [hasConnections, setHasConnections] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);

  // ── Shared URL params ──
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");
  const activeOrderFilter = (searchParams.get("filter") as OrderFilter) || "all";
  const activeDirectFilter = (searchParams.get("dfilter") as DirectFilter) || "all";

  const filterValues: Record<string, string> = {
    search: searchParams.get("search") || "",
  };

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      if (!("page" in updates)) params.set("page", "1");
      router.replace(`/inbox?${params.toString()}`);
    },
    [router, searchParams]
  );

  // ── Fetch Orders ──
  useEffect(() => {
    if (activeView !== "orders") return;
    const fetchMessages = async () => {
      setOrderLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("filter", activeOrderFilter);
      if (filterValues.search) params.set("search", filterValues.search);

      try {
        const res = await fetch(`/api/inbox?${params.toString()}`);
        const data = await res.json();
        setMessages(data.data || []);
        setOrderTotal(data.total || 0);
        setOrderUnreadCount(data.unreadCount || 0);
      } catch {
        console.error("Failed to fetch inbox");
      } finally {
        setOrderLoading(false);
      }
    };

    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, searchParams.toString()]);

  // ── Fetch Direct Comms ──
  useEffect(() => {
    if (activeView !== "direct") return;
    const fetchThreads = async () => {
      setDirectLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("filter", activeDirectFilter);
      if (filterValues.search) params.set("search", filterValues.search);

      try {
        const res = await fetch(`/api/inbox/direct?${params.toString()}`);
        const data = await res.json();
        setThreads(data.data || []);
        setDirectTotal(data.total || 0);
        setDirectUnreadCount(data.unreadCount || 0);
        setHasConnections(data.hasConnections ?? true);
      } catch {
        console.error("Failed to fetch direct comms");
      } finally {
        setDirectLoading(false);
      }
    };

    fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, searchParams.toString()]);

  // ── Manual sync ──
  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/inbox/direct", { method: "POST" });
      // Refresh the thread list
      updateParams({ page: "1" });
    } catch {
      console.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  // ── Computed values ──
  const totalUnread = orderUnreadCount + directUnreadCount;

  // ── Order tab configs ──
  const orderTabs: { label: string; value: OrderFilter; count?: number }[] = [
    { label: "All", value: "all" },
    { label: "Unread", value: "unread", count: orderUnreadCount },
    { label: "Converted", value: "converted" },
    { label: "Archived", value: "archived" },
  ];

  const directTabs: { label: string; value: DirectFilter; count?: number }[] = [
    { label: "All", value: "all" },
    { label: "Unread", value: "unread", count: directUnreadCount },
  ];

  const filters: FilterConfig[] = [
    { key: "search", label: "Search sender or subject...", type: "search" },
  ];

  // ── Order columns ──
  const orderColumns: Column<InboxMessage>[] = [
    {
      key: "from_name",
      label: "From",
      render: (row) => (
        <div className="flex items-center gap-2">
          {!row.is_read && (
            <span className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />
          )}
          <div className={row.is_read ? "" : "font-semibold"}>
            <p className="text-sm text-slate-900">
              {row.from_name || row.from_email}
            </p>
            {row.from_name && (
              <p className="text-xs text-slate-500">{row.from_email}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      render: (row) => (
        <div>
          <p className={`text-sm text-slate-900 ${row.is_read ? "" : "font-semibold"}`}>
            {row.subject || "(No subject)"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {truncate(row.body_text, 100)}
          </p>
        </div>
      ),
    },
    {
      key: "is_converted",
      label: "",
      hiddenOnMobile: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.is_converted && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Converted
            </span>
          )}
          {row.attachments?.length > 0 && (
            <span className="text-xs text-slate-400" title={`${row.attachments.length} attachment(s)`}>
              {`📎 ${row.attachments.length}`}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "received_at",
      label: "Date",
      render: (row) => (
        <span className={`text-sm ${row.is_read ? "text-slate-500" : "text-slate-900 font-medium"}`}>
          {formatDate(row.received_at)}
        </span>
      ),
    },
  ];

  // ── Direct Comms columns ──
  const directColumns: Column<DirectThread>[] = [
    {
      key: "from_name",
      label: "From",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.unread_count > 0 && (
            <span className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />
          )}
          <div className={row.unread_count > 0 ? "font-semibold" : ""}>
            <p className="text-sm text-slate-900">
              {row.from_name || row.from_email}
            </p>
            {row.from_name && (
              <p className="text-xs text-slate-500">{row.from_email}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      render: (row) => (
        <div>
          <p className={`text-sm text-slate-900 ${row.unread_count > 0 ? "font-semibold" : ""}`}>
            {row.subject || "(No subject)"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {truncate(row.snippet, 100)}
          </p>
        </div>
      ),
    },
    {
      key: "message_count",
      label: "",
      hiddenOnMobile: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.message_count > 1 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {row.message_count}
            </span>
          )}
          <span className="text-xs text-slate-400" title={row.provider === "gmail" ? "Gmail" : "Outlook"}>
            {row.provider === "gmail" ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="#EA4335" strokeWidth="1.5" fill="none" />
                <path d="M2 6l10 7 10-7" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="#0078D4" strokeWidth="1.5" fill="none" />
                <path d="M2 6l10 7 10-7" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        </div>
      ),
    },
    {
      key: "last_received_at",
      label: "Date",
      render: (row) => (
        <span className={`text-sm ${row.unread_count > 0 ? "text-slate-900 font-medium" : "text-slate-500"}`}>
          {formatDate(row.last_received_at)}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
          <p className="text-slate-500 mt-1">
            {totalUnread > 0
              ? `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>
        {activeView === "direct" && hasConnections && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync now"}
          </button>
        )}
      </div>

      {/* Top-level view tabs: Orders | Direct Comms */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        <button
          onClick={() => updateParams({ view: "", filter: "", dfilter: "", search: "", page: "1" })}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeView === "orders"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Orders
            {orderUnreadCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">
                {orderUnreadCount}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => updateParams({ view: "direct", filter: "", dfilter: "", search: "", page: "1" })}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeView === "direct"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Direct Comms
            {directUnreadCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">
                {directUnreadCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* ════════════════════ ORDERS VIEW ════════════════════ */}
      {activeView === "orders" && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {orderTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => updateParams({ filter: tab.value === "all" ? "" : tab.value })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeOrderFilter === tab.value
                    ? "bg-brand-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeOrderFilter === tab.value
                      ? "bg-white/20 text-white"
                      : "bg-brand-100 text-brand-700"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-4">
            <FilterBar
              filters={filters}
              values={filterValues}
              onChange={(key, value) => updateParams({ [key]: value })}
              onClear={() => updateParams({ search: "" })}
            />
          </div>

          {/* Table */}
          {!orderLoading && messages.length === 0 && !filterValues.search ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              {activeOrderFilter === "all" ? (
                <>
                  <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No messages yet</h3>
                  <p className="text-slate-500">
                    Emails sent to your inbox address will appear here.
                  </p>
                </>
              ) : activeOrderFilter === "unread" ? (
                <>
                  <MailOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">All messages have been read.</p>
                </>
              ) : activeOrderFilter === "archived" ? (
                <>
                  <Archive className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No archived messages.</p>
                </>
              ) : (
                <>
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No converted messages.</p>
                </>
              )}
            </div>
          ) : (
            <DataTable
              columns={orderColumns}
              data={messages}
              isLoading={orderLoading}
              onRowClick={(row) => router.push(`/inbox/${row.id}`)}
              emptyMessage="No messages match your search"
            />
          )}

          {/* Pagination */}
          {orderTotal > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={orderTotal}
              onPageChange={(p) => updateParams({ page: String(p) })}
              onPageSizeChange={(s) => updateParams({ pageSize: String(s), page: "1" })}
            />
          )}
        </>
      )}

      {/* ════════════════════ DIRECT COMMS VIEW ════════════════════ */}
      {activeView === "direct" && (
        <>
          {/* No connections CTA */}
          {hasConnections === false ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No email accounts connected
              </h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Connect your Gmail or Outlook account to sync and manage emails directly from your inbox.
              </p>
              <Link
                href="/settings/integrations?tab=communications"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Connect Email Account
              </Link>
            </div>
          ) : (
            <>
              {/* Sub-tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {directTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => updateParams({ dfilter: tab.value === "all" ? "" : tab.value })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      activeDirectFilter === tab.value
                        ? "bg-brand-600 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                    {tab.count != null && tab.count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeDirectFilter === tab.value
                          ? "bg-white/20 text-white"
                          : "bg-brand-100 text-brand-700"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="mb-4">
                <FilterBar
                  filters={filters}
                  values={filterValues}
                  onChange={(key, value) => updateParams({ [key]: value })}
                  onClear={() => updateParams({ search: "" })}
                />
              </div>

              {/* Thread Table */}
              {!directLoading && threads.length === 0 && !filterValues.search ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  {activeDirectFilter === "all" ? (
                    <>
                      <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No emails synced yet</h3>
                      <p className="text-slate-500 mb-4">
                        Click &quot;Sync now&quot; to pull emails from your connected accounts, or wait for the next automatic sync.
                      </p>
                      <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing..." : "Sync now"}
                      </button>
                    </>
                  ) : (
                    <>
                      <MailOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">All conversations have been read.</p>
                    </>
                  )}
                </div>
              ) : (
                <DataTable
                  columns={directColumns}
                  data={threads}
                  isLoading={directLoading}
                  onRowClick={(row) => router.push(`/inbox/direct/${encodeURIComponent(row.thread_id)}`)}
                  emptyMessage="No conversations match your search"
                />
              )}

              {/* Pagination */}
              {directTotal > 0 && (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={directTotal}
                  onPageChange={(p) => updateParams({ page: String(p) })}
                  onPageSizeChange={(s) => updateParams({ pageSize: String(s), page: "1" })}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
