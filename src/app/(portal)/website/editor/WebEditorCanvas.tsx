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
  Play,
  MapPin,
} from "lucide-react";
import type { WebBlock } from "./web-block-types";
import { WebFloatingToolbar } from "./WebFloatingToolbar";

interface WebEditorCanvasProps {
  blocks: WebBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, data: Record<string, unknown>) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: "up" | "down") => void;
}

export function WebEditorCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
}: WebEditorCanvasProps) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelectBlock(null);
      }}
    >
      <div className="p-0">
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
  block: WebBlock;
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

      <VisualBlock block={block} onUpdate={onUpdate} isSelected={isSelected} />
    </div>
  );
}

function VisualBlock({
  block,
  onUpdate,
  isSelected,
}: {
  block: WebBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  switch (block.type) {
    case "hero":
      return <HeroVisual block={block} onUpdate={onUpdate} isSelected={isSelected} />;
    case "heading":
      return <HeadingVisual block={block} onUpdate={onUpdate} isSelected={isSelected} />;
    case "text":
      return <TextVisual block={block} onUpdate={onUpdate} isSelected={isSelected} />;
    case "image":
      return <WebImageVisual block={block} onUpdate={onUpdate} />;
    case "button":
      return <ButtonVisual block={block} onUpdate={onUpdate} isSelected={isSelected} />;
    case "two_column":
      return <TwoColumnVisual block={block} />;
    case "product_grid":
      return <ProductGridVisual block={block} />;
    case "contact_form":
      return <ContactFormVisual block={block} />;
    case "spacer":
      return <SpacerVisual block={block} />;
    case "divider":
      return <DividerVisual block={block} />;
    case "testimonial":
      return <TestimonialVisual block={block} onUpdate={onUpdate} isSelected={isSelected} />;
    case "gallery":
      return <GalleryVisual block={block} />;
    case "video":
      return <VideoVisual block={block} />;
    case "map":
      return <MapVisual block={block} />;
    default:
      return <div className="p-4 text-sm text-slate-400">Unknown block</div>;
  }
}

// ─── Hero Block ───
function HeroVisual({
  block,
  onUpdate,
  isSelected,
}: {
  block: Extract<WebBlock, { type: "hero" }>;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        minHeight: block.data.minHeight || 400,
        backgroundImage: block.data.backgroundImageUrl
          ? `url(${block.data.backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: block.data.backgroundImageUrl ? undefined : "#1e293b",
        textAlign: block.data.align || "center",
      }}
    >
      {block.data.backgroundImageUrl && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${(block.data.backgroundOverlay || 40) / 100})` }}
        />
      )}
      <div className="relative z-10 px-8 py-12 max-w-xl mx-auto">
        <div
          contentEditable={isSelected}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate({ heading: e.currentTarget.textContent || "" })}
          className="text-3xl md:text-4xl font-bold text-white leading-tight outline-none mb-3"
        >
          {block.data.heading}
        </div>
        <div
          contentEditable={isSelected}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate({ subheading: e.currentTarget.textContent || "" })}
          className="text-lg text-white/80 outline-none mb-6"
        >
          {block.data.subheading}
        </div>
        {block.data.buttonText && (
          <span className="inline-block px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold text-sm">
            {block.data.buttonText}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Heading Block ───
function HeadingVisual({
  block,
  onUpdate,
  isSelected,
}: {
  block: Extract<WebBlock, { type: "heading" }>;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const sizes: Record<number, string> = { 1: "text-[28px]", 2: "text-[22px]", 3: "text-[18px]" };
  const sizeClass = sizes[block.data.level] || "text-[28px]";

  return (
    <div className="px-6 py-2" style={{ textAlign: block.data.align }}>
      <div
        contentEditable={isSelected}
        suppressContentEditableWarning
        onBlur={(e) => onUpdate({ text: e.currentTarget.textContent || "" })}
        className={`${sizeClass} font-bold leading-tight outline-none`}
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
  block: Extract<WebBlock, { type: "text" }>;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  return (
    <div className="px-6 py-2 relative" style={{ textAlign: block.data.align || "left" }}>
      {isSelected && showToolbar && containerRef.current && (
        <WebFloatingToolbar anchorRef={containerRef} />
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
    </div>
  );
}

// ─── Image Block ───
function WebImageVisual({
  block,
  onUpdate,
}: {
  block: Extract<WebBlock, { type: "image" }>;
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
      <div className="px-6 py-2">
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
    <div className="px-6 py-2" style={{ textAlign: block.data.align }}>
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
      {block.data.caption && (
        <p className="text-xs text-slate-400 mt-1">{block.data.caption}</p>
      )}
    </div>
  );
}

// ─── Button Block ───
function ButtonVisual({
  block,
  onUpdate,
  isSelected,
}: {
  block: Extract<WebBlock, { type: "button" }>;
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
  const padding =
    block.data.size === "sm" ? "8px 20px" : block.data.size === "lg" ? "16px 36px" : "12px 28px";

  return (
    <div className="px-6 py-2" style={{ textAlign: block.data.align }}>
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
          padding,
          lineHeight: 1,
        }}
      >
        {block.data.text}
      </span>
    </div>
  );
}

// ─── Two Column Block ───
function TwoColumnVisual({ block }: { block: Extract<WebBlock, { type: "two_column" }> }) {
  const splits: Record<string, [string, string]> = {
    "50-50": ["1fr", "1fr"],
    "33-67": ["1fr", "2fr"],
    "67-33": ["2fr", "1fr"],
  };
  const [left, right] = splits[block.data.split] || ["1fr", "1fr"];

  return (
    <div
      className="px-6 py-4"
      style={{
        display: "grid",
        gridTemplateColumns: `${left} ${right}`,
        gap: block.data.gap || 24,
      }}
    >
      <div
        className="prose prose-sm max-w-none text-slate-700"
        dangerouslySetInnerHTML={{ __html: block.data.leftHtml }}
      />
      <div
        className="prose prose-sm max-w-none text-slate-700"
        dangerouslySetInnerHTML={{ __html: block.data.rightHtml }}
      />
    </div>
  );
}

// ─── Product Grid Block ───
function ProductGridVisual({ block }: { block: Extract<WebBlock, { type: "product_grid" }> }) {
  return (
    <div className="px-6 py-4 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
        <ImageIcon className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">
          {`Product grid — ${block.data.columns} columns, up to ${block.data.limit} products`}
        </span>
      </div>
    </div>
  );
}

// ─── Contact Form Block ───
function ContactFormVisual({ block }: { block: Extract<WebBlock, { type: "contact_form" }> }) {
  return (
    <div className="px-6 py-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{block.data.heading}</h3>
      <div className="space-y-3 max-w-md">
        {block.data.fields.map((field) => (
          <div key={field}>
            <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{field}</label>
            {field === "message" ? (
              <div className="w-full h-20 border border-slate-200 rounded-lg bg-slate-50" />
            ) : (
              <div className="w-full h-10 border border-slate-200 rounded-lg bg-slate-50" />
            )}
          </div>
        ))}
        <div className="pt-1">
          <span className="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">
            {block.data.submitText}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Spacer Block ───
function SpacerVisual({ block }: { block: Extract<WebBlock, { type: "spacer" }> }) {
  return (
    <div
      className="flex items-center justify-center border border-dashed border-slate-200 rounded text-slate-300 text-xs mx-6"
      style={{ height: block.data.height || 48 }}
    >
      {`${block.data.height || 48}px`}
    </div>
  );
}

// ─── Divider Block ───
function DividerVisual({ block }: { block: Extract<WebBlock, { type: "divider" }> }) {
  const color = block.data.color || "#e2e8f0";
  const thickness = block.data.thickness || 1;
  const widthMap: Record<string, string> = { full: "100%", half: "50%", third: "33%" };
  const width = widthMap[block.data.width || "full"] || "100%";

  return (
    <div className="px-6 py-4">
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

// ─── Testimonial Block ───
function TestimonialVisual({
  block,
  onUpdate,
  isSelected,
}: {
  block: Extract<WebBlock, { type: "testimonial" }>;
  onUpdate: (data: Record<string, unknown>) => void;
  isSelected: boolean;
}) {
  return (
    <div className="px-6 py-4" style={{ textAlign: block.data.align || "center" }}>
      <blockquote className="max-w-lg mx-auto">
        <div
          contentEditable={isSelected}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate({ quote: e.currentTarget.textContent || "" })}
          className="text-lg text-slate-700 italic leading-relaxed outline-none mb-3"
        >
          {`"${block.data.quote}"`}
        </div>
        <div className="flex items-center gap-3 justify-center">
          {block.data.imageUrl && (
            <img
              src={block.data.imageUrl}
              alt={block.data.author}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <div>
            <div
              contentEditable={isSelected}
              suppressContentEditableWarning
              onBlur={(e) => onUpdate({ author: e.currentTarget.textContent || "" })}
              className="text-sm font-semibold text-slate-900 outline-none"
            >
              {block.data.author}
            </div>
            {block.data.role && (
              <p className="text-xs text-slate-400">{block.data.role}</p>
            )}
          </div>
        </div>
      </blockquote>
    </div>
  );
}

// ─── Gallery Block ───
function GalleryVisual({ block }: { block: Extract<WebBlock, { type: "gallery" }> }) {
  if (block.data.images.length === 0) {
    return (
      <div className="px-6 py-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
          <ImageIcon className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">Gallery — add images in properties</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="px-6 py-4"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${block.data.columns}, 1fr)`,
        gap: block.data.gap,
      }}
    >
      {block.data.images.map((img, i) => (
        <img
          key={i}
          src={img.src}
          alt={img.alt}
          className="w-full h-auto object-cover"
          style={{ borderRadius: block.data.borderRadius }}
        />
      ))}
    </div>
  );
}

// ─── Video Block ───
function VideoVisual({ block }: { block: Extract<WebBlock, { type: "video" }> }) {
  if (!block.data.url) {
    return (
      <div className="px-6 py-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
          <Play className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">Video — enter URL in properties</span>
        </div>
      </div>
    );
  }

  const ratios: Record<string, string> = { "16:9": "56.25%", "4:3": "75%", "1:1": "100%" };
  const paddingBottom = ratios[block.data.aspectRatio] || "56.25%";

  return (
    <div className="px-6 py-4">
      <div className="relative w-full bg-slate-900 rounded-lg overflow-hidden" style={{ paddingBottom }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="w-12 h-12 text-white/60" />
        </div>
        <p className="absolute bottom-2 left-3 text-xs text-white/50 truncate max-w-[80%]">
          {block.data.url}
        </p>
      </div>
    </div>
  );
}

// ─── Map Block ───
function MapVisual({ block }: { block: Extract<WebBlock, { type: "map" }> }) {
  if (!block.data.address) {
    return (
      <div className="px-6 py-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">Map — enter address in properties</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <div
        className="w-full bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200"
        style={{ height: block.data.height || 300 }}
      >
        <div className="text-center">
          <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">{block.data.address}</p>
        </div>
      </div>
    </div>
  );
}
