"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Upload,
  ImageIcon,
} from "lucide-react";
import type { EmailBlock } from "@/types/marketing";
import { FloatingToolbar } from "./FloatingToolbar";
import { AiGenerateButton } from "@/components/AiGenerateButton";

interface EditorCanvasProps {
  blocks: EmailBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, data: Record<string, unknown>) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: "up" | "down") => void;
}

export function EditorCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
}: EditorCanvasProps) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelectBlock(null);
      }}
    >
      <div className="p-6">
        {blocks.map((block, index) => (
          <CanvasBlock
            key={block.id}
            block={block}
            isSelected={selectedBlockId === block.id}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
            onSelect={() => onSelectBlock(block.id)}
            onUpdate={(data) => onUpdateBlock(block.id, data)}
            onDelete={() => onDeleteBlock(block.id)}
            onDuplicate={() => onDuplicateBlock(block.id)}
            onMoveUp={() => onMoveBlock(block.id, "up")}
            onMoveDown={() => onMoveBlock(block.id, "down")}
          />
        ))}
      </div>
    </div>
  );
}

function CanvasBlock({
  block,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  block: EmailBlock;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group cursor-pointer ${
        isSelected
          ? "ring-2 ring-brand-500 ring-offset-1 rounded-lg"
          : "hover:ring-1 hover:ring-slate-300 hover:ring-offset-1 rounded-lg"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Block toolbar - shows on hover/select */}
      {isSelected && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-slate-800 rounded-lg px-1 py-0.5 shadow-lg z-20">
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-slate-300 hover:text-white cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-600 mx-0.5" />
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1 text-slate-300 hover:text-white"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-slate-300 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Visual block rendering */}
      <VisualBlock block={block} onUpdate={onUpdate} isSelected={isSelected} />
    </div>
  );
}

function VisualBlock({
  block,
  onUpdate,
  isSelected,
}: {
  block: EmailBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  switch (block.type) {
    case "header":
      return <HeaderVisual block={block} onUpdate={onUpdate} isSelected={isSelected} />;
    case "text":
      return <TextVisual block={block} onUpdate={onUpdate} isSelected={isSelected} />;
    case "image":
      return <ImageVisual block={block} onUpdate={onUpdate} />;
    case "button":
      return <ButtonVisual block={block} onUpdate={onUpdate} isSelected={isSelected} />;
    case "divider":
      return <DividerVisual block={block} />;
    case "spacer":
      return <SpacerVisual block={block} />;
    case "social":
      return <SocialVisual block={block} />;
    case "footer":
      return <FooterVisual block={block} onUpdate={onUpdate} isSelected={isSelected} />;
    case "product_grid":
      return <ProductGridVisual />;
    case "discount_code":
      return <DiscountCodeVisual block={block} />;
    default:
      return <div className="p-4 text-sm text-slate-400">Unknown block</div>;
  }
}

// ─── Header Block ───
function HeaderVisual({
  block,
  onUpdate,
  isSelected,
}: {
  block: Extract<EmailBlock, { type: "header" }>;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const sizes: Record<number, string> = { 1: "text-[28px]", 2: "text-[22px]", 3: "text-[18px]" };
  const sizeClass = sizes[block.data.level] || "text-[28px]";
  const textAlign = block.data.align || "center";

  return (
    <div className="py-2" style={{ textAlign }}>
      <div
        contentEditable={isSelected}
        suppressContentEditableWarning
        onBlur={(e) => onUpdate({ text: e.currentTarget.textContent || "" })}
        className={`${sizeClass} font-bold leading-tight outline-none ${
          isSelected ? "ring-0" : ""
        }`}
        style={{ color: block.data.color || "#0f172a" }}
      >
        {block.data.text}
      </div>
    </div>
  );
}

// ─── Text Block ───
function TextVisual({
  block,
  onUpdate,
  isSelected,
}: {
  block: Extract<EmailBlock, { type: "text" }>;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  return (
    <div className="py-2 relative" style={{ textAlign: block.data.align || "left" }}>
      {isSelected && showToolbar && containerRef.current && (
        <FloatingToolbar anchorRef={containerRef} />
      )}
      <div
        ref={containerRef}
        contentEditable={isSelected}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: block.data.html }}
        onBlur={(e) => onUpdate({ html: e.currentTarget.innerHTML })}
        onFocus={() => setShowToolbar(true)}
        onMouseUp={() => {
          if (isSelected) setShowToolbar(true);
        }}
        className={`prose prose-sm max-w-none text-slate-700 leading-relaxed outline-none ${
          isSelected ? "min-h-[40px]" : ""
        }`}
      />
      {isSelected && (
        <div className="absolute top-0 right-0">
          <AiGenerateButton
            type="email_body"
            context={{ existingContent: block.data.html?.replace(/<[^>]*>/g, "") }}
            onSelect={(text) => onUpdate({ html: `<p>${text}</p>` })}
            label="Write"
          />
        </div>
      )}
    </div>
  );
}

// ─── Image Block ───
function ImageVisual({
  block,
  onUpdate,
}: {
  block: Extract<EmailBlock, { type: "image" }>;
  onUpdate: (data: Record<string, unknown>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json();
        onUpdate({ src: url });
      }
    } catch {
      // upload failed silently
    }
    setUploading(false);
  }

  if (!block.data.src) {
    return (
      <div className="py-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-40 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-500 hover:border-slate-400 transition-colors"
        >
          {uploading ? (
            <span className="text-sm">Uploading...</span>
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <span className="text-sm">Click to upload image</span>
            </>
          )}
        </button>
      </div>
    );
  }

  const widthStyle =
    block.data.width === "full"
      ? "100%"
      : typeof block.data.width === "number"
      ? `${block.data.width}px`
      : "auto";

  return (
    <div className="py-2" style={{ textAlign: block.data.align }}>
      <div className="relative inline-block group/img">
        <img
          src={block.data.src}
          alt={block.data.alt}
          style={{
            width: widthStyle,
            maxWidth: "100%",
            borderRadius: block.data.borderRadius ?? 8,
          }}
          className="block"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm hover:bg-white"
          title="Replace image"
        >
          <ImageIcon className="w-4 h-4 text-slate-600" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
      </div>
    </div>
  );
}

// ─── Button Block ───
function ButtonVisual({
  block,
  onUpdate,
  isSelected,
}: {
  block: Extract<EmailBlock, { type: "button" }>;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const bgColor =
    block.data.backgroundColor ||
    (block.data.style === "filled" ? "#0083dc" : "transparent");
  const textColor =
    block.data.textColor ||
    (block.data.style === "filled" ? "#ffffff" : "#0083dc");
  const border =
    block.data.style === "outline"
      ? `2px solid ${block.data.backgroundColor || "#0083dc"}`
      : "none";
  const borderRadius = block.data.borderRadius ?? 8;

  return (
    <div className="py-2" style={{ textAlign: block.data.align }}>
      <span
        contentEditable={isSelected}
        suppressContentEditableWarning
        onBlur={(e) => onUpdate({ text: e.currentTarget.textContent || "" })}
        className="inline-block outline-none font-semibold text-sm cursor-text"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          border,
          borderRadius,
          padding: "12px 28px",
          lineHeight: 1,
        }}
      >
        {block.data.text}
      </span>
    </div>
  );
}

// ─── Divider Block ───
function DividerVisual({ block }: { block: Extract<EmailBlock, { type: "divider" }> }) {
  const color = block.data.color || "#e2e8f0";
  const thickness = block.data.thickness || 1;
  const widthMap: Record<string, string> = { full: "100%", half: "50%", third: "33%" };
  const width = widthMap[block.data.width || "full"] || "100%";

  return (
    <div className="py-4">
      <hr
        style={{
          border: "none",
          borderTop: `${thickness}px solid ${color}`,
          width,
          margin: "0 auto",
        }}
      />
    </div>
  );
}

// ─── Spacer Block ───
function SpacerVisual({ block }: { block: Extract<EmailBlock, { type: "spacer" }> }) {
  return (
    <div
      className="flex items-center justify-center border border-dashed border-slate-200 rounded text-slate-300 text-xs"
      style={{ height: block.data.height || 32 }}
    >
      {block.data.height || 32}px
    </div>
  );
}

// ─── Social Block ───
function SocialVisual({ block }: { block: Extract<EmailBlock, { type: "social" }> }) {
  const links: string[] = [];
  if (block.data.instagram) links.push("Instagram");
  if (block.data.facebook) links.push("Facebook");
  if (block.data.tiktok) links.push("TikTok");
  if (block.data.twitter) links.push("Twitter");
  if (block.data.website) links.push("Website");

  if (links.length === 0) {
    return (
      <div className="py-3 text-center text-sm text-slate-400">
        Social links — configure in properties
      </div>
    );
  }

  return (
    <div className="py-3" style={{ textAlign: block.data.align || "center" }}>
      {links.map((name, i) => (
        <span key={name} className="text-sm text-slate-500">
          {i > 0 && " · "}
          <span className="hover:text-slate-700">{name}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Footer Block ───
function FooterVisual({
  block,
  onUpdate,
  isSelected,
}: {
  block: Extract<EmailBlock, { type: "footer" }>;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  return (
    <div
      className="pt-4 mt-2 border-t border-slate-200"
      style={{ textAlign: block.data.align || "center" }}
    >
      <div
        contentEditable={isSelected}
        suppressContentEditableWarning
        onBlur={(e) => onUpdate({ text: e.currentTarget.textContent || "" })}
        className="text-sm text-slate-400 outline-none"
      >
        {block.data.text}
      </div>
    </div>
  );
}

// ─── Discount Code Block ───
function DiscountCodeVisual({ block }: { block: Extract<EmailBlock, { type: "discount_code" }> }) {
  const bgColor = block.data.backgroundColor || "#059669";
  const textColor = block.data.textColor || "#ffffff";

  if (block.data.style === "minimal") {
    return (
      <div className="py-3 text-center">
        <span className="text-sm text-slate-500">Use code </span>
        <span
          className="font-mono font-bold text-sm px-2 py-0.5 rounded"
          style={{ backgroundColor: `${bgColor}15`, color: bgColor }}
        >
          {block.data.code || "CODE"}
        </span>
        {block.data.description && (
          <span className="text-sm text-slate-500"> — {block.data.description}</span>
        )}
      </div>
    );
  }

  if (block.data.style === "banner") {
    return (
      <div
        className="py-3 px-4 rounded-lg text-center"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <p className="font-mono font-bold text-lg tracking-wider">{block.data.code || "CODE"}</p>
        {block.data.description && (
          <p className="text-sm opacity-90 mt-0.5">{block.data.description}</p>
        )}
      </div>
    );
  }

  // card (default)
  return (
    <div className="py-3">
      <div
        className="rounded-lg border-2 border-dashed p-4 text-center"
        style={{ borderColor: bgColor }}
      >
        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: bgColor }}>
          Your discount code
        </p>
        <p
          className="font-mono font-bold text-xl tracking-wider px-4 py-2 rounded inline-block"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {block.data.code || "CODE"}
        </p>
        {block.data.description && (
          <p className="text-sm text-slate-500 mt-2">{block.data.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Product Grid Block ───
function ProductGridVisual() {
  return (
    <div className="py-4 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
        <ImageIcon className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">
          Product grid — configure in properties
        </span>
      </div>
    </div>
  );
}
