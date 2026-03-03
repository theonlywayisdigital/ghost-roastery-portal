"use client";

import { Send, Share2, Zap, Ticket } from "lucide-react";
import type { CalendarItem, CalendarChannel } from "@/types/marketing";

const CHANNEL_CONFIG: Record<
  CalendarChannel,
  { icon: React.ComponentType<{ className?: string }>; dot: string; text: string }
> = {
  campaign: { icon: Send, dot: "bg-blue-500", text: "text-blue-700" },
  social: { icon: Share2, dot: "bg-green-500", text: "text-green-700" },
  automation: { icon: Zap, dot: "bg-purple-500", text: "text-purple-700" },
  discount: { icon: Ticket, dot: "bg-orange-500", text: "text-orange-700" },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-50 text-blue-700",
  sent: "bg-green-50 text-green-700",
  published: "bg-green-50 text-green-700",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
};

export function ContentCalendarList({
  items,
  visibleChannels,
  onClickItem,
}: {
  items: CalendarItem[];
  visibleChannels: Set<CalendarChannel>;
  onClickItem: (item: CalendarItem) => void;
}) {
  const filteredItems = items
    .filter((it) => visibleChannels.has(it.channel))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));

  // Group by date
  const grouped = new Map<string, CalendarItem[]>();
  for (const item of filteredItems) {
    const existing = grouped.get(item.date) || [];
    existing.push(item);
    grouped.set(item.date, existing);
  }

  if (filteredItems.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">No items to show for this month.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([dateStr, dateItems]) => (
        <div key={dateStr}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {formatDateHeader(dateStr)}
          </h3>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {dateItems.map((item) => {
              const config = CHANNEL_CONFIG[item.channel];
              const Icon = config.icon;
              const statusColor = STATUS_COLORS[item.status] || "bg-slate-100 text-slate-600";

              return (
                <button
                  key={item.id}
                  onClick={() => onClickItem(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0`} />
                  <div className={`w-7 h-7 rounded-lg ${config.text} bg-slate-50 flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
                    )}
                  </div>
                  {item.time && (
                    <span className="text-xs text-slate-400 flex-shrink-0">{item.time}</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor} flex-shrink-0`}>
                    {item.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  if (dateStr === todayStr) return "Today";
  if (dateStr === tomorrowStr) return "Tomorrow";

  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
