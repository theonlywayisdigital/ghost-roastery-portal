"use client";

import { Send, Share2, Zap, Ticket } from "@/components/icons";
import type { CalendarItem, CalendarChannel } from "@/types/marketing";

const CHANNEL_CONFIG: Record<
  CalendarChannel,
  { icon: React.ComponentType<{ className?: string }>; dot: string; bg: string; text: string }
> = {
  campaign: { icon: Send, dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  social: { icon: Share2, dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
  automation: { icon: Zap, dot: "bg-purple-500", bg: "bg-purple-50", text: "text-purple-700" },
  discount: { icon: Ticket, dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700" },
};

export function CalendarItemChip({
  item,
  onClick,
}: {
  item: CalendarItem;
  onClick: () => void;
}) {
  const config = CHANNEL_CONFIG[item.channel];

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${config.bg} ${config.text} hover:opacity-80 transition-opacity text-left`}
      title={item.title}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />
      <span className="truncate">{item.title}</span>
    </button>
  );
}

export { CHANNEL_CONFIG };
