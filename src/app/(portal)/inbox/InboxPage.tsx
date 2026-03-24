"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  MailOpen,
  Archive,
  Package,
  Loader2,
  UserPlus,
  User,
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
  contact_id: string | null;
  contacts: { id: string; first_name: string; last_name: string; email: string } | null;
}

type OrderFilter = "all" | "unread" | "converted" | "archived";

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

  // ── State ──
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderUnreadCount, setOrderUnreadCount] = useState(0);
  const [orderLoading, setOrderLoading] = useState(true);
  const [linkingEmail, setLinkingEmail] = useState<string | null>(null);

  // ── URL params ──
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");
  const activeOrderFilter = (searchParams.get("filter") as OrderFilter) || "all";

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
  }, [searchParams.toString()]);

  // ── Order tab configs ──
  const orderTabs: { label: string; value: OrderFilter; count?: number }[] = [
    { label: "All", value: "all" },
    { label: "Unread", value: "unread", count: orderUnreadCount },
    { label: "Converted", value: "converted" },
    { label: "Archived", value: "archived" },
  ];

  const filters: FilterConfig[] = [
    { key: "search", label: "Search sender or subject...", type: "search" },
  ];

  // ── Add as contact handler ──
  async function handleAddAsContact(e: React.MouseEvent, row: InboxMessage) {
    e.stopPropagation();
    setLinkingEmail(row.from_email);
    try {
      const res = await fetch("/api/inbox/link-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: row.from_email,
          fromName: row.from_name,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update local state to reflect the link
        setMessages((prev) =>
          prev.map((m) =>
            m.from_email.toLowerCase() === row.from_email.toLowerCase() && !m.contact_id
              ? { ...m, contact_id: data.contactId, contacts: null }
              : m
          )
        );
      }
    } catch {
      console.error("Failed to add as contact");
    } finally {
      setLinkingEmail(null);
    }
  }

  // ── Columns ──
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
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-slate-900">
                {row.from_name || row.from_email}
              </p>
              {row.contact_id && (
                <span title="Linked to contact">
                  <User className="w-3.5 h-3.5 text-brand-500" />
                </span>
              )}
            </div>
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
          {!row.contact_id && (
            <button
              onClick={(e) => handleAddAsContact(e, row)}
              disabled={linkingEmail === row.from_email}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
              title="Add sender as contact"
            >
              {linkingEmail === row.from_email ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <UserPlus className="w-3 h-3" />
              )}
              Add Contact
            </button>
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
          <p className="text-slate-500 mt-1">
            {orderUnreadCount > 0
              ? `${orderUnreadCount} unread message${orderUnreadCount === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>
      </div>

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
    </div>
  );
}
