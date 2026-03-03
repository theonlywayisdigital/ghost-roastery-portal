"use client";

import { useEffect, useRef } from "react";
import { Send, Share2, Zap } from "lucide-react";

const OPTIONS = [
  {
    id: "campaign",
    icon: Send,
    label: "New Email Campaign",
    description: "Create and send an email to your contacts",
    color: "text-blue-600 bg-blue-50",
  },
  {
    id: "social",
    icon: Share2,
    label: "New Social Post",
    description: "Schedule a post across your social platforms",
    color: "text-green-600 bg-green-50",
  },
  {
    id: "automation",
    icon: Zap,
    label: "New Automation",
    description: "Set up an automated email workflow",
    color: "text-purple-600 bg-purple-50",
  },
] as const;

export type CreateType = "campaign" | "social" | "automation";

export function CreateDropdown({
  date,
  onSelect,
  onClose,
}: {
  date?: string;
  onSelect: (type: CreateType, date?: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-64"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            onClick={() => {
              onSelect(opt.id, date);
              onClose();
            }}
            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${opt.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{opt.label}</p>
              <p className="text-xs text-slate-500">{opt.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
