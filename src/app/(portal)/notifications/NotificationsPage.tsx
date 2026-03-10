"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Trash2,
  Loader2,
  ShoppingCart,
  FileText,
  Building2,
  Users,
  Mail,
  Zap,
  Megaphone,
  Star,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "@/components/icons";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  form_submission: FileText,
  wholesale_application: Building2,
  new_order: ShoppingCart,
  order_status_updated: ShoppingCart,
  team_invite: Users,
  platform_announcement: Megaphone,
  new_contact: UserPlus,
  automation_triggered: Zap,
  campaign_sent: Mail,
  review_received: Star,
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  form_submission: { bg: "bg-indigo-50", color: "text-indigo-600" },
  wholesale_application: { bg: "bg-blue-50", color: "text-blue-600" },
  new_order: { bg: "bg-green-50", color: "text-green-600" },
  order_status_updated: { bg: "bg-amber-50", color: "text-amber-600" },
  team_invite: { bg: "bg-purple-50", color: "text-purple-600" },
  platform_announcement: { bg: "bg-red-50", color: "text-red-600" },
  new_contact: { bg: "bg-emerald-50", color: "text-emerald-600" },
  automation_triggered: { bg: "bg-orange-50", color: "text-orange-600" },
  campaign_sent: { bg: "bg-sky-50", color: "text-sky-600" },
  review_received: { bg: "bg-yellow-50", color: "text-yellow-600" },
};

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const limit = 20;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(page * limit),
    });
    if (tab === "unread") params.set("unread_only", "true");

    try {
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
        setHasMore(data.notifications.length === limit);
      }
    } catch {
      setNotifications([]);
    }
    setLoading(false);
  }, [tab, page]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [tab]);

  async function handleMarkAllRead() {
    await fetch("/api/notifications/read-all", { method: "PUT" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setSelected(new Set());
  }

  async function handleMarkSelectedRead() {
    const promises = Array.from(selected).map((id) =>
      fetch(`/api/notifications/${id}/read`, { method: "PUT" })
    );
    await Promise.all(promises);
    setNotifications((prev) =>
      prev.map((n) => (selected.has(n.id) ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - selected.size));
    setSelected(new Set());
  }

  async function handleDeleteSelected() {
    if (!confirm(`Delete ${selected.size} notification(s)?`)) return;
    const promises = Array.from(selected).map((id) =>
      fetch(`/api/notifications/${id}`, { method: "DELETE" })
    );
    await Promise.all(promises);
    setNotifications((prev) => prev.filter((n) => !selected.has(n.id)));
    setSelected(new Set());
  }

  function handleClick(n: Notification) {
    if (!n.read) {
      fetch(`/api/notifications/${n.id}/read`, { method: "PUT" }).catch(() => {});
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.link) router.push(n.link);
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
    if (selected.size === notifications.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(notifications.map((n) => n.id)));
    }
  }

  function formatDate(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay} days ago`;
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500 mt-1">
          {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up!"}
        </p>
      </div>

      {/* Tabs + Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              {t.id === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <button
                onClick={handleMarkSelectedRead}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {`Mark ${selected.size} read`}
              </button>
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {`Delete ${selected.size}`}
              </button>
            </>
          )}
          {unreadCount > 0 && selected.size === 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900 mb-1">
              {tab === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-sm text-slate-500">
              {tab === "unread"
                ? "You're all caught up!"
                : "Notifications will appear here as events happen."}
            </p>
          </div>
        ) : (
          <>
            {/* Select all header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50">
              <input
                type="checkbox"
                checked={selected.size === notifications.length && notifications.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-500">
                {selected.size > 0
                  ? `${selected.size} selected`
                  : "Select all"}
              </span>
            </div>

            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Bell;
              const colors = TYPE_COLORS[n.type] || { bg: "bg-slate-50", color: "text-slate-600" };

              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${
                    !n.read ? "bg-brand-50/20" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(n.id)}
                    onChange={() => toggleSelect(n.id)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 mt-1"
                  />
                  <button
                    onClick={() => handleClick(n)}
                    className="flex items-start gap-3 flex-1 text-left min-w-0"
                  >
                    <div className={`w-9 h-9 rounded-lg ${colors.bg} ${colors.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!n.read ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-brand-500" />
                          )}
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(n.created_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>
                    </div>
                  </button>
                </div>
              );
            })}

            {/* Pagination */}
            {(page > 0 || hasMore) && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  {`Page ${page + 1}`}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore}
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
