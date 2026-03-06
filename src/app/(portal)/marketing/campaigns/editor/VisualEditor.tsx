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
import { Monitor, Smartphone, Undo2, Redo2, Sparkles, X } from "@/components/icons";
import type { EmailBlock, EmailBlockType, EmailTemplate } from "@/types/marketing";
import { BlockPalette, PALETTE_PREFIX } from "./BlockPalette";
import { EditorCanvas } from "./EditorCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { createDefaultBlock } from "./block-utils";
import { AiEmailModal } from "./AiEmailModal";
import { renderEmailHtmlForPreview } from "@/lib/render-email-html";

interface VisualEditorProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
  emailBgColor: string;
  onEmailBgColorChange: (color: string) => void;
  onAiSubject?: (subject: string) => void;
  onAiPreviewText?: (previewText: string) => void;
  templates?: EmailTemplate[];
  onSelectTemplate?: (template: EmailTemplate) => void;
}

const MAX_HISTORY = 40;

export function VisualEditor({ blocks, onChange, emailBgColor, onEmailBgColorChange, onAiSubject, onAiPreviewText, templates, onSelectTemplate }: VisualEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // Undo/redo
  const historyRef = useRef<EmailBlock[][]>([]);
  const futureRef = useRef<EmailBlock[][]>([]);

  const pushHistory = useCallback(
    (prev: EmailBlock[]) => {
      historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), prev];
      futureRef.current = [];
    },
    []
  );

  const handleChange = useCallback(
    (newBlocks: EmailBlock[]) => {
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
    setAiGenerated(false);
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

    if (activeId.startsWith(PALETTE_PREFIX)) {
      const blockType = activeId.replace(PALETTE_PREFIX, "") as EmailBlockType;
      const newBlock = createDefaultBlock(blockType);
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

  function handleAddBlock(type: EmailBlockType) {
    const newBlock = createDefaultBlock(type);
    handleChange([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  }

  function handleUpdateBlock(id: string, data: Record<string, unknown>) {
    handleChange(
      blocks.map((b) =>
        b.id === id ? ({ ...b, data: { ...b.data, ...data } } as EmailBlock) : b
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
    } as EmailBlock;
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

  function handleAiGenerated(result: { subject: string; preview_text: string; blocks: EmailBlock[] }) {
    handleChange(result.blocks);
    if (result.subject && onAiSubject) onAiSubject(result.subject);
    if (result.preview_text && onAiPreviewText) onAiPreviewText(result.preview_text);
    setAiGenerated(true);
    setSelectedBlockId(null);
  }

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {blocks.length > 0 ? "AI Generate" : "AI Generate"}
            </button>
            <span className="text-xs text-slate-400">
              {blocks.length} block{blocks.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* AI Generated Banner */}
        {aiGenerated && (
          <div className="flex items-center justify-between px-4 py-2 bg-violet-50 border-b border-violet-200">
            <p className="text-xs text-violet-700 font-medium">
              AI generated — review and edit before sending
            </p>
            <button
              onClick={() => {
                undo();
                setAiGenerated(false);
              }}
              className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
              <Undo2 className="w-3 h-3" />
              Undo
            </button>
          </div>
        )}

        {/* 3-panel layout */}
        <div className="flex">
          {/* Left: Block Palette */}
          <div className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 hidden md:block">
            <div className="sticky top-[49px] overflow-y-auto max-h-[calc(100vh-49px)]">
              <BlockPalette onAddBlock={handleAddBlock} />
            </div>
          </div>

          {/* Center: Canvas */}
          <div
            className="flex-1 p-6 min-h-[400px]"
            style={{ backgroundColor: emailBgColor || "#f8fafc" }}
          >
            <div
              className={`mx-auto transition-all ${
                viewMode === "mobile" ? "max-w-[375px]" : "max-w-[600px]"
              }`}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <EditorCanvas
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
                <div className="space-y-4">
                  {/* AI Generate Card */}
                  <button
                    onClick={() => setShowAiModal(true)}
                    className="w-full bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border-2 border-dashed border-violet-300 p-8 text-center hover:border-violet-400 hover:from-violet-100 hover:to-purple-100 transition-all group"
                  >
                    <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-violet-200 transition-colors">
                      <Sparkles className="w-6 h-6 text-violet-600" />
                    </div>
                    <p className="text-violet-700 text-sm font-semibold mb-1">
                      Generate with AI
                    </p>
                    <p className="text-violet-500 text-xs">
                      Describe your email and AI will write the whole thing
                    </p>
                  </button>

                  {/* Templates */}
                  {templates && templates.length > 0 && onSelectTemplate && (
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-3">Or start from a layout</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {templates.map((t) => {
                          const html = renderEmailHtmlForPreview(t.content);
                          return (
                            <button
                              key={t.id}
                              onClick={() => onSelectTemplate(t)}
                              className="text-left rounded-xl border-2 border-slate-200 overflow-hidden transition-all hover:shadow-md hover:border-slate-300 bg-white"
                            >
                              <div className="h-32 overflow-hidden bg-slate-50 relative pointer-events-none">
                                <iframe
                                  srcDoc={html}
                                  title={t.name}
                                  className="w-[600px] h-[600px] border-0 origin-top-left"
                                  style={{ transform: "scale(0.28)", transformOrigin: "top left" }}
                                  sandbox=""
                                  tabIndex={-1}
                                />
                              </div>
                              <div className="p-2 border-t border-slate-100">
                                <p className="text-xs font-medium text-slate-900 truncate">{t.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 capitalize">
                                  {t.category.replace("_", " ")}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manual option */}
                  <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
                    <p className="text-slate-400 text-sm mb-1">
                      Or drag blocks from the left panel
                    </p>
                    <p className="text-slate-300 text-xs">
                      to build your email manually
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Properties Panel */}
          <div className="w-72 shrink-0 border-l border-slate-200 bg-white hidden md:block">
            <div className="sticky top-[49px] overflow-y-auto max-h-[calc(100vh-49px)]">
              <PropertiesPanel
              block={selectedBlock}
              onUpdate={(data) => {
                if (selectedBlockId) handleUpdateBlock(selectedBlockId, data);
              }}
              onDelete={() => {
                if (selectedBlockId) handleDeleteBlock(selectedBlockId);
              }}
              emailBgColor={emailBgColor}
              onEmailBgColorChange={onEmailBgColorChange}
            />
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {dragActiveId ? (
          <div className="px-4 py-2 bg-white border border-brand-300 rounded-lg shadow-lg text-sm text-slate-700 opacity-80">
            {dragActiveId.startsWith(PALETTE_PREFIX)
              ? dragActiveId.replace(PALETTE_PREFIX, "").replace("_", " ")
              : "Moving block"}
          </div>
        ) : null}
      </DragOverlay>

      {/* AI Email Generation Modal */}
      <AiEmailModal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        onGenerated={handleAiGenerated}
      />
    </DndContext>
  );
}
