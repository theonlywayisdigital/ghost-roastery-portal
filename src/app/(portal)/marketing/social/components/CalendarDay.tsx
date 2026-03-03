"use client";

import { useDroppable } from "@dnd-kit/core";
import { getStatusDotColor } from "./StatusBadge";
import type { CalendarPost } from "@/types/social";

export function CalendarDay({
  date,
  posts,
  isCurrentMonth,
  isToday,
  onClickDay,
  onClickPost,
}: {
  date: Date;
  posts: CalendarPost[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onClickDay: (date: Date) => void;
  onClickPost: (postId: string) => void;
}) {
  const dateKey = date.toISOString().split("T")[0];
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onClickDay(date)}
      className={`
        min-h-[80px] p-1.5 border-b border-r border-slate-100 cursor-pointer transition-colors
        ${isOver ? "bg-brand-50" : "hover:bg-slate-50"}
        ${!isCurrentMonth ? "bg-slate-50/50" : ""}
      `}
    >
      <span
        className={`
          inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-1
          ${isToday
            ? "bg-brand-600 text-white font-semibold"
            : isCurrentMonth
              ? "text-slate-700"
              : "text-slate-400"
          }
        `}
      >
        {date.getDate()}
      </span>

      <div className="space-y-0.5">
        {posts.slice(0, 3).map((post) => (
          <button
            key={post.id}
            onClick={(e) => {
              e.stopPropagation();
              onClickPost(post.id);
            }}
            className="w-full flex items-center gap-1 px-1 py-0.5 rounded text-xs hover:bg-slate-100 transition-colors text-left"
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotColor(post.status)}`} />
            <span className="truncate text-slate-600">
              {post.content.slice(0, 25) || "Untitled"}
            </span>
          </button>
        ))}
        {posts.length > 3 && (
          <span className="text-xs text-slate-400 pl-1">+{posts.length - 3} more</span>
        )}
      </div>
    </div>
  );
}
