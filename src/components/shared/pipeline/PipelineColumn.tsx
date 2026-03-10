"use client";

import { useDroppable } from "@dnd-kit/core";
import { PipelineCard, type PipelineItem } from "./PipelineCard";

const STAGE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  new: { bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
  contacted: { bg: "bg-yellow-50", border: "border-yellow-200", dot: "bg-yellow-500" },
  qualified: { bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500" },
  won: { bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500" },
  lost: { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

interface PipelineColumnProps {
  stage: string;
  items: PipelineItem[];
  onClickItem: (item: PipelineItem) => void;
  onDeleteItem?: (item: PipelineItem) => void;
}

export function PipelineColumn({ stage, items, onClickItem, onDeleteItem }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const colors = STAGE_COLORS[stage] || STAGE_COLORS.new;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col min-w-[280px] w-[280px] rounded-xl border transition-colors
        ${isOver ? `${colors.bg} ${colors.border}` : "bg-slate-50/50 border-slate-200"}
      `}
    >
      {/* Header */}
      <div className={`px-3 py-2.5 border-b ${isOver ? colors.border : "border-slate-200"} rounded-t-xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
            <span className="text-sm font-semibold text-slate-700">
              {STAGE_LABELS[stage] || stage}
            </span>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
            {items.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-240px)] min-h-[200px]">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-slate-400">
            Drop items here
          </div>
        ) : (
          items.map((item) => (
            <PipelineCard
              key={`${item.itemType}-${item.id}`}
              item={item}
              onClick={() => onClickItem(item)}
              onDelete={onDeleteItem}
            />
          ))
        )}
      </div>
    </div>
  );
}
