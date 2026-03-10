"use client";

import { useDroppable } from "@dnd-kit/core";
import { PipelineCard, type PipelineItem } from "./PipelineCard";
import { STAGE_COLOURS } from "@/lib/pipeline";

interface PipelineColumnProps {
  stage: string;
  label?: string;
  colour?: string;
  items: PipelineItem[];
  onClickItem: (item: PipelineItem) => void;
  onDeleteItem?: (item: PipelineItem) => void;
}

export function PipelineColumn({ stage, label, colour, items, onClickItem, onDeleteItem }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const colors = STAGE_COLOURS[colour || "blue"] || STAGE_COLOURS.blue;

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
              {label || stage}
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
