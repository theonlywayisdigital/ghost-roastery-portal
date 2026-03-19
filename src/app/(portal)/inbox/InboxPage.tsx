"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, MailOpen, Archive, Search, Package } from "@/components/icons";
import { DataTable, FilterBar, Pagination, StatusBadge } from "@/components/admin";
import type { Column } from "@/components/admin/DataTable";
import type { FilterConfig } from "@/components/admin/FilterBar";

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

type FilterValue = "all" | "unread" | "converted" | "archived";

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

export function InboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");
  const activeFilter = (searchParams.get("filter") as FilterValue) || "all";

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

  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("filter", activeFilter);
      if (filterValues.search) params.set("search", filterValues.search);

      try {
        const res = await fetch(`/api/inbox?${params.toString()}`);
        const data = await res.json();
        setMessages(data.data || []);
        setTotal(data.total || 0);
        setUnreadCount(data.unreadCount || 0);
      } catch {
        console.error("Failed to fetch inbox");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const tabs: { label: string; value: FilterValue; count?: number }[] = [
    { label: "All", value: "all" },
    { label: "Unread", value: "unread", count: unreadCount },
    { label: "Converted", value: "converted" },
    { label: "Archived", value: "archived" },
  ];

  const filters: FilterConfig[] = [
    { key: "search", label: "Search sender or subject...", type: "search" },
  ];

  const columns: Column<InboxMessage>[] = [
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
            <StatusBadge status="converted" type="order" />
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
            {unreadCount > 0
              ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateParams({ filter: tab.value === "all" ? "" : tab.value })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeFilter === tab.value
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeFilter === tab.value
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
      {!isLoading && messages.length === 0 && !filterValues.search ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          {activeFilter === "all" ? (
            <>
              <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No messages yet</h3>
              <p className="text-slate-500">
                Emails sent to your inbox address will appear here.
              </p>
            </>
          ) : activeFilter === "unread" ? (
            <>
              <MailOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">All messages have been read.</p>
            </>
          ) : activeFilter === "archived" ? (
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
          columns={columns}
          data={messages}
          isLoading={isLoading}
          onRowClick={(row) => router.push(`/inbox/${row.id}`)}
          emptyMessage="No messages match your search"
        />
      )}

      {/* Pagination */}
      {total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p) => updateParams({ page: String(p) })}
          onPageSizeChange={(s) => updateParams({ pageSize: String(s), page: "1" })}
        />
      )}
    </div>
  );
}
