"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  Heading,
  Type,
  Image,
  MousePointerClick,
  Minus,
  Space,
  Columns2,
  LayoutGrid,
  MessageSquare,
  Quote,
  GalleryHorizontalEnd,
  Play,
  MapPin,
  PanelTop,
} from "lucide-react";
import type { WebBlockType } from "./web-block-types";

export const WEB_PALETTE_PREFIX = "web-palette-";

const BLOCK_TYPES: {
  type: WebBlockType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: "hero", label: "Hero", icon: PanelTop },
  { type: "heading", label: "Heading", icon: Heading },
  { type: "text", label: "Text", icon: Type },
  { type: "image", label: "Image", icon: Image },
  { type: "button", label: "Button", icon: MousePointerClick },
  { type: "two_column", label: "Two Column", icon: Columns2 },
  { type: "product_grid", label: "Products", icon: LayoutGrid },
  { type: "contact_form", label: "Contact", icon: MessageSquare },
  { type: "testimonial", label: "Testimonial", icon: Quote },
  { type: "gallery", label: "Gallery", icon: GalleryHorizontalEnd },
  { type: "video", label: "Video", icon: Play },
  { type: "map", label: "Map", icon: MapPin },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "spacer", label: "Spacer", icon: Space },
];

interface WebBlockPaletteProps {
  onAddBlock: (type: WebBlockType) => void;
}

export function WebBlockPalette({ onAddBlock }: WebBlockPaletteProps) {
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
  type: WebBlockType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${WEB_PALETTE_PREFIX}${type}`,
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
