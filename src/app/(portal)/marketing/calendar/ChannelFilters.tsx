"use client";

import { Send, Share2, Zap, Ticket } from "@/components/icons";
import type { CalendarChannel } from "@/types/marketing";

const CHANNELS: {
  id: CalendarChannel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dot: string;
}[] = [
  { id: "campaign", label: "Campaigns", icon: Send, dot: "bg-blue-500" },
  { id: "social", label: "Social", icon: Share2, dot: "bg-green-500" },
  { id: "automation", label: "Automations", icon: Zap, dot: "bg-purple-500" },
  { id: "discount", label: "Discounts", icon: Ticket, dot: "bg-orange-500" },
];

export function ChannelFilters({
  visible,
  onToggle,
}: {
  visible: Set<CalendarChannel>;
  onToggle: (channel: CalendarChannel) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {CHANNELS.map((ch) => {
        const isOn = visible.has(ch.id);
        return (
          <button
            key={ch.id}
            onClick={() => onToggle(ch.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isOn
                ? "bg-white border border-slate-200 text-slate-700 shadow-sm"
                : "bg-slate-100 text-slate-400 border border-transparent"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full transition-opacity ${ch.dot} ${
                isOn ? "opacity-100" : "opacity-30"
              }`}
            />
            {ch.label}
          </button>
        );
      })}
    </div>
  );
}
