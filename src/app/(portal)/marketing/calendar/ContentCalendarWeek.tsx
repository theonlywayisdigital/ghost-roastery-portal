"use client";

import type { CalendarItem, CalendarChannel } from "@/types/marketing";
import { CalendarItemChip } from "./CalendarItemChip";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const wd = new Date(start);
    wd.setDate(start.getDate() + i);
    days.push(wd);
  }
  return days;
}

export function ContentCalendarWeek({
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
  const weekDays = getWeekDays(currentDate);
  const todayStr = new Date().toISOString().split("T")[0];
  const filteredItems = items.filter((it) => visibleChannels.has(it.channel));

  function getItemsForDate(date: Date): CalendarItem[] {
    const dateKey = date.toISOString().split("T")[0];
    return filteredItems.filter((it) => it.date === dateKey);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-7">
        {weekDays.map((date, i) => {
          const dateKey = date.toISOString().split("T")[0];
          const dayItems = getItemsForDate(date);
          const isToday = dateKey === todayStr;

          return (
            <div
              key={dateKey}
              onClick={() => onClickDay(dateKey)}
              className={`min-h-[200px] p-2 cursor-pointer hover:bg-slate-50 transition-colors ${
                i < 6 ? "border-r border-slate-100" : ""
              }`}
            >
              <div className="text-center mb-2">
                <p className="text-[10px] font-medium text-slate-400 uppercase">
                  {DAY_NAMES[i]}
                </p>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                    isToday
                      ? "bg-brand-600 text-white"
                      : "text-slate-700"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {dayItems.map((item) => (
                  <CalendarItemChip
                    key={item.id}
                    item={item}
                    onClick={() => onClickItem(item)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
