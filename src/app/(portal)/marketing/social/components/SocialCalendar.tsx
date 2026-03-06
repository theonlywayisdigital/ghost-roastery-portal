"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "@/components/icons";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useMarketingContext } from "@/lib/marketing-context";
import { CalendarDay } from "./CalendarDay";
import type { CalendarPost } from "@/types/social";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Pad start
  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Pad end
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

export function SocialCalendar() {
  const router = useRouter();
  const { pageBase } = useMarketingContext();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState<CalendarPost | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/posts/calendar?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error("Failed to load calendar posts:", err);
    }
    setLoading(false);
  }, [monthStr]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  function navigateMonth(delta: number) {
    setCurrentDate(new Date(year, month + delta, 1));
  }

  function getPostsForDate(date: Date): CalendarPost[] {
    const dateStr = date.toISOString().split("T")[0];
    return posts.filter((p) => {
      const postDate = p.scheduled_for || p.published_at;
      if (!postDate) return false;
      return postDate.startsWith(dateStr);
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const post = posts.find((p) => p.id === event.active.id);
    setActivePost(post || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActivePost(null);
    const { active, over } = event;
    if (!over) return;

    const postId = active.id as string;
    const targetDate = over.id as string;
    const post = posts.find((p) => p.id === postId);

    if (!post || (post.status !== "draft" && post.status !== "scheduled")) return;

    // Get the original time from the post, apply it to the new date
    const originalDate = post.scheduled_for ? new Date(post.scheduled_for) : new Date();
    const [newYear, newMonth, newDay] = targetDate.split("-").map(Number);
    const newScheduledFor = new Date(
      newYear, newMonth - 1, newDay,
      originalDate.getHours(), originalDate.getMinutes()
    ).toISOString();

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, scheduled_for: newScheduledFor, status: "scheduled" as const } : p))
    );

    try {
      const res = await fetch(`/api/social/posts/${postId}/reschedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_for: newScheduledFor }),
      });
      if (!res.ok) {
        loadPosts(); // Revert on failure
      }
    } catch {
      loadPosts();
    }
  }

  function handleClickDay(date: Date) {
    const dateStr = date.toISOString().split("T")[0];
    router.push(`${pageBase}/social/compose?date=${dateStr}`);
  }

  function handleClickPost(postId: string) {
    router.push(`${pageBase}/social/${postId}`);
  }

  const calendarDays = getCalendarDays(year, month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabel = currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {DAY_NAMES.map((day) => (
                <div key={day} className="px-2 py-2 text-xs font-medium text-slate-500 text-center">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((date) => {
                const dateKey = date.toISOString().split("T")[0];
                const dayPosts = getPostsForDate(date);
                const isCurrentMonth = date.getMonth() === month;
                const isToday = date.toDateString() === today.toDateString();

                return (
                  <CalendarDay
                    key={dateKey}
                    date={date}
                    posts={dayPosts}
                    isCurrentMonth={isCurrentMonth}
                    isToday={isToday}
                    onClickDay={handleClickDay}
                    onClickPost={handleClickPost}
                  />
                );
              })}
            </div>
          </div>

          <DragOverlay>
            {activePost && (
              <div className="bg-white rounded-lg border border-brand-200 shadow-lg px-3 py-2 text-xs text-slate-700 max-w-[200px]">
                {activePost.content.slice(0, 40) || "Untitled post"}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
