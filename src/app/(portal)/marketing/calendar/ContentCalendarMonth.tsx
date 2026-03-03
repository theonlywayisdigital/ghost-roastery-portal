"use client";

import type { CalendarItem, CalendarChannel } from "@/types/marketing";
import { CalendarItemChip } from "./CalendarItemChip";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

export function ContentCalendarMonth({
  currentDate,
  items,
  visibleChannels,
  onClickItem,
  onClickDay,
}: {
  currentDate: Date;
  items: CalendarItem[];
  visibleChannels: Set<CalendarChannel>;
  onClickItem: (item: CalendarItem) => void;
  onClickDay: (dateStr: string) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const calendarDays = getCalendarDays(year, month);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const filteredItems = items.filter((it) => visibleChannels.has(it.channel));

  function getItemsForDate(date: Date): CalendarItem[] {
    const dateKey = date.toISOString().split("T")[0];
    return filteredItems.filter((it) => it.date === dateKey);
  }

  return (
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
          const dayItems = getItemsForDate(date);
          const isCurrentMonth = date.getMonth() === month;
          const isToday = dateKey === todayStr;
          const showItems = dayItems.slice(0, 3);
          const overflow = dayItems.length - 3;

          return (
            <div
              key={dateKey}
              onClick={() => onClickDay(dateKey)}
              className={`min-h-[90px] border-b border-r border-slate-100 p-1.5 cursor-pointer hover:bg-slate-50 transition-colors ${
                !isCurrentMonth ? "bg-slate-50/50" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-brand-600 text-white"
                      : isCurrentMonth
                      ? "text-slate-700"
                      : "text-slate-300"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {showItems.map((item) => (
                  <CalendarItemChip
                    key={item.id}
                    item={item}
                    onClick={() => onClickItem(item)}
                  />
                ))}
                {overflow > 0 && (
                  <p className="text-[10px] text-slate-400 font-medium pl-1">
                    {`+${overflow} more`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
