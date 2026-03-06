"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ShoppingCart,
  FileText,
  Building2,
  Users,
  Mail,
  Zap,
  Megaphone,
  Star,
  UserPlus,
} from "lucide-react";

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

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (full = false) => {
    try {
      const url = full ? "/api/notifications?limit=20" : "/api/notifications?limit=1";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count);
        if (full) {
          setNotifications(data.notifications);
        }
      }
    } catch {
      // silent
    }
  }, []);

  // Initial fetch + polling every 30s for unread count
  useEffect(() => {
    fetchNotifications(false);
    const interval = setInterval(() => fetchNotifications(false), 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotifications(true).finally(() => setLoading(false));
    }
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }

  async function handleClick(notification: Notification) {
    // Mark as read
    if (!notification.read) {
      fetch(`/api/notifications/${notification.id}/read`, { method: "PUT" }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    setOpen(false);

    // Navigate
    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden lg:bottom-auto lg:top-full lg:left-auto lg:right-0 lg:mt-2 lg:mb-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                const colors = TYPE_COLORS[n.type] || { bg: "bg-slate-50", color: "text-slate-600" };

                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-slate-50 last:border-0 ${
                      !n.read ? "bg-brand-50/30" : ""
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${colors.bg} ${colors.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!n.read ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{relativeTime(n.created_at)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/notifications");
              }}
              className="w-full text-center text-xs text-brand-600 hover:text-brand-700 font-medium py-1"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
