"use client";

import { useState } from "react";
import {
  MessageSquare,
  RefreshCw,
  Package,
  CheckCircle,
  AlertCircle,
  Truck,
  XCircle,
  Mail,
  Edit3,
} from "lucide-react";
import { formatRelativeTime } from "./format";

/* eslint-disable @typescript-eslint/no-explicit-any */

const actionIcons: Record<string, any> = {
  note: MessageSquare,
  status_change: RefreshCw,
  created: Package,
  approved: CheckCircle,
  declined: AlertCircle,
  email_sent: Mail,
  updated: Edit3,
  shipped: Truck,
  cancelled: XCircle,
};

const actionColors: Record<string, string> = {
  note: "text-blue-600 bg-blue-50",
  status_change: "text-purple-600 bg-purple-50",
  created: "text-green-600 bg-green-50",
  approved: "text-green-600 bg-green-50",
  declined: "text-red-600 bg-red-50",
  email_sent: "text-sky-600 bg-sky-50",
  updated: "text-amber-600 bg-amber-50",
  shipped: "text-purple-600 bg-purple-50",
  cancelled: "text-red-600 bg-red-50",
};

interface ActivityTimelineProps {
  activities: any[];
  allowNotes?: boolean;
  onAddNote?: (text: string) => Promise<any>;
}

export function ActivityTimeline({ activities: initialActivities, allowNotes, onAddNote }: ActivityTimelineProps) {
  const [activities, setActivities] = useState(initialActivities);
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleAddNote() {
    if (!noteText.trim() || !onAddNote) return;
    setIsSaving(true);
    try {
      const result = await onAddNote(noteText);
      if (result) {
        setActivities((prev) => [result, ...prev]);
      }
      setNoteText("");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Activity</h3>

      {allowNotes && onAddNote && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Add a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleAddNote}
            disabled={!noteText.trim() || isSaving}
            className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {activities.length === 0 ? (
        <p className="text-sm text-slate-400 py-4">No activity yet.</p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />
          <div className="space-y-4">
            {activities.map((activity: any) => {
              const Icon = actionIcons[activity.action] || RefreshCw;
              const colors = actionColors[activity.action] || "text-slate-500 bg-slate-100";
              return (
                <div key={activity.id} className="flex gap-3 relative">
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${colors}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm text-slate-700">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activity.actor_name && `${activity.actor_name} \u00b7 `}
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
