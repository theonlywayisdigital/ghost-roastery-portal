"use client";

import { useState } from "react";
import {
  FileText, UserPlus, UserCog, Building, Building2,
  ShoppingCart, PackageCheck, Ticket, MailOpen, Clock,
  Calendar, Webhook, Zap, Search, X,
} from "lucide-react";
import type { TriggerDefinition, TriggerType } from "@/types/marketing";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, UserPlus, UserCog, Building, Building2,
  ShoppingCart, PackageCheck, Ticket, MailOpen, Clock,
  Calendar, Webhook, Zap, Search,
};

const CATEGORY_LABELS: Record<string, string> = {
  event: "Events",
  time: "Time-Based",
  engagement: "Engagement",
  custom: "Custom",
};

interface TriggerPickerProps {
  definitions: TriggerDefinition[];
  currentType: TriggerType | null;
  onSelect: (type: TriggerType) => void;
  onClose: () => void;
}

export function TriggerPicker({ definitions, currentType, onSelect, onClose }: TriggerPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? definitions.filter(
        (d) =>
          d.label.toLowerCase().includes(search.toLowerCase()) ||
          d.description.toLowerCase().includes(search.toLowerCase())
      )
    : definitions;

  // Group by category
  const grouped: Record<string, TriggerDefinition[]> = {};
  for (const def of filtered) {
    if (!grouped[def.category]) grouped[def.category] = [];
    grouped[def.category].push(def);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">Choose a Trigger</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search triggers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Triggers list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {Object.entries(grouped).map(([category, defs]) => (
            <div key={category} className="mb-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {CATEGORY_LABELS[category] || category}
              </p>
              <div className="space-y-1">
                {defs.map((def) => {
                  const Icon = ICON_MAP[def.icon] || Zap;
                  const isSelected = def.type === currentType;
                  return (
                    <button
                      key={def.type}
                      onClick={() => onSelect(def.type)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-brand-50 border border-brand-200"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${def.bg} ${def.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{def.label}</p>
                        <p className="text-xs text-slate-500 truncate">{def.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No triggers match your search</p>
          )}
        </div>
      </div>
    </div>
  );
}
