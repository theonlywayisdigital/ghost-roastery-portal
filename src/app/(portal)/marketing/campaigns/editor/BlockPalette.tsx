"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  Heading,
  Type,
  Image,
  MousePointerClick,
  Minus,
  Space,
  Share2,
  AlignLeft,
  LayoutGrid,
  Ticket,
} from "@/components/icons";
import type { EmailBlockType } from "@/types/marketing";

export const PALETTE_PREFIX = "palette-";

const BLOCK_TYPES: {
  type: EmailBlockType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: "header", label: "Heading", icon: Heading },
  { type: "text", label: "Text", icon: Type },
  { type: "image", label: "Image", icon: Image },
  { type: "button", label: "Button", icon: MousePointerClick },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "spacer", label: "Spacer", icon: Space },
  { type: "social", label: "Social", icon: Share2 },
  { type: "footer", label: "Footer", icon: AlignLeft },
  { type: "product_grid", label: "Products", icon: LayoutGrid },
  { type: "discount_code", label: "Discount", icon: Ticket },
];

interface BlockPaletteProps {
  onAddBlock: (type: EmailBlockType) => void;
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  return (
    <div className="p-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
        Blocks
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {BLOCK_TYPES.map((bt) => (
          <PaletteItem
            key={bt.type}
            type={bt.type}
            label={bt.label}
            icon={bt.icon}
            onAdd={() => onAddBlock(bt.type)}
          />
        ))}
      </div>
    </div>
  );
}

function PaletteItem({
  type,
  label,
  icon: Icon,
  onAdd,
}: {
  type: EmailBlockType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_PREFIX}${type}`,
  });

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onAdd}
      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <Icon className="w-4.5 h-4.5 text-slate-500" />
      <span className="text-[11px] font-medium text-slate-600 leading-none">{label}</span>
    </button>
  );
}
