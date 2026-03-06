"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Monitor, Smartphone, Tablet, Undo2, Redo2 } from "@/components/icons";
import type { WebBlock, WebBlockType } from "./web-block-types";
import { WebBlockPalette, WEB_PALETTE_PREFIX } from "./WebBlockPalette";
import { WebEditorCanvas } from "./WebEditorCanvas";
import { WebPropertiesPanel } from "./WebPropertiesPanel";
import { createDefaultWebBlock } from "./web-block-utils";

interface WebPageEditorProps {
  blocks: WebBlock[];
  onChange: (blocks: WebBlock[]) => void;
}

const MAX_HISTORY = 40;

export function WebPageEditor({ blocks, onChange }: WebPageEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  // Undo/redo
  const historyRef = useRef<WebBlock[][]>([]);
  const futureRef = useRef<WebBlock[][]>([]);

  const pushHistory = useCallback(
    (prev: WebBlock[]) => {
      historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), prev];
      futureRef.current = [];
    },
    []
  );

  const handleChange = useCallback(
    (newBlocks: WebBlock[]) => {
      pushHistory(blocks);
      onChange(newBlocks);
    },
    [blocks, onChange, pushHistory]
  );

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, blocks];
    onChange(prev);
  }, [blocks, onChange]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    historyRef.current = [...historyRef.current, blocks];
    onChange(next);
  }, [blocks, onChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  function handleDragStart(event: DragStartEvent) {
    setDragActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDragActiveId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith(WEB_PALETTE_PREFIX)) {
      const blockType = activeId.replace(WEB_PALETTE_PREFIX, "") as WebBlockType;
      const newBlock = createDefaultWebBlock(blockType);
      const overIndex = blocks.findIndex((b) => b.id === overId);
      const insertAt = overIndex >= 0 ? overIndex + 1 : blocks.length;
      const newBlocks = [...blocks];
      newBlocks.splice(insertAt, 0, newBlock);
      handleChange(newBlocks);
      setSelectedBlockId(newBlock.id);
      return;
    }

    if (activeId !== overId) {
      const oldIndex = blocks.findIndex((b) => b.id === activeId);
      const newIndex = blocks.findIndex((b) => b.id === overId);
      if (oldIndex >= 0 && newIndex >= 0) {
        handleChange(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  }

  function handleAddBlock(type: WebBlockType) {
    const newBlock = createDefaultWebBlock(type);
    handleChange([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  }

  function handleUpdateBlock(id: string, data: Record<string, unknown>) {
    handleChange(
      blocks.map((b) =>
        b.id === id ? ({ ...b, data: { ...b.data, ...data } } as WebBlock) : b
      )
    );
  }

  function handleDeleteBlock(id: string) {
    handleChange(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }

  function handleDuplicateBlock(id: string) {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const clone = {
      ...blocks[idx],
      id: Math.random().toString(36).slice(2, 8),
      data: { ...blocks[idx].data },
    } as WebBlock;
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, clone);
    handleChange(newBlocks);
    setSelectedBlockId(clone.id);
  }

  function handleMoveBlock(id: string, direction: "up" | "down") {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    handleChange(arrayMove(blocks, idx, targetIdx));
  }

  const canvasMaxWidth =
    viewMode === "mobile" ? "max-w-[375px]" : viewMode === "tablet" ? "max-w-[768px]" : "max-w-[1024px]";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={historyRef.current.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={futureRef.current.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("desktop")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "desktop"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Desktop view"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("tablet")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "tablet"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Tablet view"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "mobile"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Mobile view"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
          <span className="text-xs text-slate-400">
            {blocks.length} block{blocks.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* 3-panel layout */}
        <div className="flex">
          {/* Left: Block Palette */}
          <div className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 hidden md:block">
            <div className="sticky top-[49px] overflow-y-auto max-h-[calc(100vh-49px)]">
              <WebBlockPalette onAddBlock={handleAddBlock} />
            </div>
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 p-6 min-h-[400px] bg-slate-50">
            <div className={`mx-auto transition-all ${canvasMaxWidth}`}>
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <WebEditorCanvas
                  blocks={blocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onUpdateBlock={handleUpdateBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onDuplicateBlock={handleDuplicateBlock}
                  onMoveBlock={handleMoveBlock}
                />
              </SortableContext>

              {blocks.length === 0 && (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
                  <p className="text-slate-400 text-sm mb-1">
                    Drag blocks from the left panel
                  </p>
                  <p className="text-slate-300 text-xs">
                    to start building your page
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Properties Panel */}
          <div className="w-72 shrink-0 border-l border-slate-200 bg-white hidden md:block">
            <div className="sticky top-[49px] overflow-y-auto max-h-[calc(100vh-49px)]">
              <WebPropertiesPanel
                block={selectedBlock}
                onUpdate={(data) => {
                  if (selectedBlockId) handleUpdateBlock(selectedBlockId, data);
                }}
                onDelete={() => {
                  if (selectedBlockId) handleDeleteBlock(selectedBlockId);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {dragActiveId ? (
          <div className="px-4 py-2 bg-white border border-brand-300 rounded-lg shadow-lg text-sm text-slate-700 opacity-80">
            {dragActiveId.startsWith(WEB_PALETTE_PREFIX)
              ? dragActiveId.replace(WEB_PALETTE_PREFIX, "").replace("_", " ")
              : "Moving block"}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
