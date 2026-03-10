"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Building2, User, Mail, PoundSterling, Trash2 } from "@/components/icons";

export interface PipelineItem {
  id: string;
  itemType: "contact" | "business";
  name: string;
  email: string | null;
  businessName: string | null;
  source: string;
  leadStatus: string;
  totalSpend: number;
  types: string[];
  createdAt: string;
}

interface PipelineCardProps {
  item: PipelineItem;
  onClick: () => void;
  overlay?: boolean;
  onDelete?: (item: PipelineItem) => void;
}

export function PipelineCard({ item, onClick, overlay, onDelete }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${item.itemType}-${item.id}`,
  });
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div
        ref={overlay ? undefined : setNodeRef}
        {...(overlay ? {} : listeners)}
        {...(overlay ? {} : attributes)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`
          group relative bg-white rounded-lg border border-slate-200 p-3 cursor-pointer
          hover:border-brand-300 hover:shadow-sm transition-all
          ${isDragging ? "opacity-30" : ""}
          ${overlay ? "shadow-lg border-brand-300 rotate-1" : ""}
        `}
      >
        {/* Delete button (visible on hover) */}
        {onDelete && !overlay && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirm(true);
            }}
            className="absolute top-2 right-2 p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-10"
            title="Remove from pipeline"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Name + type badge */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
          <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
            item.itemType === "business"
              ? "bg-purple-50 text-purple-700"
              : "bg-blue-50 text-blue-700"
          }`}>
            {item.itemType === "business" ? (
              <Building2 className="w-2.5 h-2.5" />
            ) : (
              <User className="w-2.5 h-2.5" />
            )}
            {item.itemType === "business" ? "Biz" : "Contact"}
          </span>
        </div>

        {/* Business name for contacts */}
        {item.itemType === "contact" && item.businessName && (
          <p className="text-xs text-slate-500 truncate mb-1">
            {item.businessName}
          </p>
        )}

        {/* Email */}
        {item.email && (
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1.5">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.email}</span>
          </div>
        )}

        {/* Footer: source + spend */}
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="capitalize">{item.source}</span>
          {item.totalSpend > 0 && (
            <span className="flex items-center gap-0.5 text-slate-500 font-medium">
              <PoundSterling className="w-3 h-3" />
              {item.totalSpend.toFixed(0)}
            </span>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Remove from pipeline?
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {`This will archive the ${item.itemType === "business" ? "business" : "contact"} "${item.name}". They can be restored later.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirm(false);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirm(false);
                  onDelete?.(item);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
