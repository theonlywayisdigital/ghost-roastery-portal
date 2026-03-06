"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  CalendarDays,
  List,
  LayoutGrid,
} from "@/components/icons";
import type { CalendarItem, CalendarChannel } from "@/types/marketing";
import { ContentCalendarMonth } from "./calendar/ContentCalendarMonth";
import { ContentCalendarWeek } from "./calendar/ContentCalendarWeek";
import { ContentCalendarList } from "./calendar/ContentCalendarList";
import { ChannelFilters } from "./calendar/ChannelFilters";
import { CreateDropdown, type CreateType } from "./calendar/CreateDropdown";
import { useMarketingContext } from "@/lib/marketing-context";

type ViewMode = "month" | "week" | "list";

const ALL_CHANNELS: CalendarChannel[] = ["campaign", "social", "automation", "discount"];

export function ContentCalendar() {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("month");
  const [visibleChannels, setVisibleChannels] = useState<Set<CalendarChannel>>(
    () => new Set(ALL_CHANNELS)
  );
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createForDate, setCreateForDate] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);

  // Default to list view on mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    if (mq.matches) setView("list");
  }, []);

  const monthStr = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/calendar?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load calendar:", err);
    }
    setLoading(false);
  }, [monthStr]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function navigateMonth(delta: number) {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  }

  function navigateWeek(delta: number) {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function handleToggleChannel(channel: CalendarChannel) {
    setVisibleChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  }

  function handleClickItem(item: CalendarItem) {
    router.push(`${pageBase}${item.link}`);
  }

  function handleClickDay(dateStr: string) {
    setCreateForDate(dateStr);
    setShowCreateMenu(true);
  }

  async function handleCreate(type: CreateType, date?: string) {
    setCreating(true);
    try {
      if (type === "campaign") {
        const body: Record<string, unknown> = { name: "Untitled Campaign" };
        if (date) body.scheduled_at = new Date(date + "T09:00:00").toISOString();
        const res = await fetch(`${apiBase}/campaigns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const { campaign } = await res.json();
          router.push(`${pageBase}/campaigns/${campaign.id}/edit`);
          return;
        }
      } else if (type === "social") {
        const body: Record<string, unknown> = {};
        if (date) body.scheduled_for = new Date(date + "T09:00:00").toISOString();
        const res = await fetch("/api/social/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const { post } = await res.json();
          router.push(`${pageBase}/social/compose?postId=${post.id}`);
          return;
        }
      } else if (type === "automation") {
        router.push(`${pageBase}/automations`);
        return;
      }
    } catch (err) {
      console.error("Failed to create:", err);
    }
    setCreating(false);
  }

  const monthLabel = currentDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-500 text-sm">
          All your scheduled content across email, social, automations, and discount codes.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <ChannelFilters visible={visibleChannels} onToggle={handleToggleChannel} />

          {/* View toggle */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("month")}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 ${
                view === "month"
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Month
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 border-l border-slate-200 ${
                view === "week"
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Week
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 border-l border-slate-200 ${
                view === "list"
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {/* Create button */}
          <div className="relative">
            <button
              onClick={() => {
                setCreateForDate(undefined);
                setShowCreateMenu(!showCreateMenu);
              }}
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create
            </button>
            {showCreateMenu && !createForDate && (
              <div className="absolute right-0 top-full mt-1">
                <CreateDropdown
                  onSelect={handleCreate}
                  onClose={() => setShowCreateMenu(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Month/Week nav */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => (view === "week" ? navigateWeek(-1) : navigateMonth(-1))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => (view === "week" ? navigateWeek(1) : navigateMonth(1))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{monthLabel}</h2>
        <button
          onClick={goToToday}
          className="px-2.5 py-1 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50"
        >
          Today
        </button>
      </div>

      {/* Calendar body */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="relative">
          {view === "month" && (
            <ContentCalendarMonth
              currentDate={currentDate}
              items={items}
              visibleChannels={visibleChannels}
              onClickItem={handleClickItem}
              onClickDay={handleClickDay}
            />
          )}
          {view === "week" && (
            <ContentCalendarWeek
              currentDate={currentDate}
              items={items}
              visibleChannels={visibleChannels}
              onClickItem={handleClickItem}
              onClickDay={handleClickDay}
            />
          )}
          {view === "list" && (
            <ContentCalendarList
              items={items}
              visibleChannels={visibleChannels}
              onClickItem={handleClickItem}
            />
          )}

          {/* Day-click create dropdown */}
          {showCreateMenu && createForDate && (
            <div className="fixed inset-0 z-30" onClick={() => setShowCreateMenu(false)}>
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                onClick={(e) => e.stopPropagation()}
              >
                <CreateDropdown
                  date={createForDate}
                  onSelect={handleCreate}
                  onClose={() => setShowCreateMenu(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
