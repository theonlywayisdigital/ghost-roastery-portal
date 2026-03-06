"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Layers, Plus, X } from "@/components/icons";
import type { WebSection, WebsiteTheme, SectionType } from "@/lib/website-sections/types";
import { createDefaultSection } from "@/lib/website-sections/defaults";
import { SectionList } from "./SectionList";
import { LivePreview } from "./LivePreview";
import { SectionPropertiesForm } from "./SectionPropertiesForm";
import { SectionCatalogModal } from "./SectionCatalogModal";
import { WebsiteThemeProvider } from "./WebsiteThemeProvider";
import { cn } from "@/lib/utils";

interface SectionEditorProps {
  initialSections: WebSection[];
  onChange: (sections: WebSection[]) => void;
  theme: WebsiteTheme;
  roasterId: string;
  siteName?: string;
  logoUrl?: string;
  pages?: { title: string; slug: string; is_nav_button?: boolean }[];
}

export function SectionEditor({
  initialSections,
  onChange,
  theme,
  roasterId,
  siteName,
  logoUrl,
  pages,
}: SectionEditorProps) {
  const [sections, setSections] = useState<WebSection[]>(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false);
  const [sectionListExpanded, setSectionListExpanded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const selectedSection = sections.find((s) => s.id === selectedId) ?? null;

  // Close section list overlay when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        sectionListExpanded &&
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        setSectionListExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sectionListExpanded]);

  const updateSections = useCallback(
    (next: WebSection[]) => {
      setSections(next);
      onChange(next);
    },
    [onChange]
  );

  // Select a section and open the properties panel
  const handleSelectSection = useCallback((id: string) => {
    setSelectedId(id);
    setPropertiesPanelOpen(true);
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    updateSections(arrayMove(sections, oldIndex, newIndex));
  }

  function handleAddSection(type: SectionType) {
    const newSection = createDefaultSection(type);
    const next = [...sections, newSection];
    updateSections(next);
    handleSelectSection(newSection.id);
  }

  function handleToggleVisibility(id: string) {
    updateSections(
      sections.map((s) =>
        s.id === id ? { ...s, visible: !s.visible } : s
      ) as WebSection[]
    );
  }

  function handleRemoveSection(id: string) {
    const next = sections.filter((s) => s.id !== id);
    updateSections(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
      if (next.length === 0) setPropertiesPanelOpen(false);
    }
  }

  function handleUpdateSection(updated: WebSection) {
    updateSections(
      sections.map((s) => (s.id === updated.id ? updated : s))
    );
  }

  function handleClosePropertiesPanel() {
    setPropertiesPanelOpen(false);
  }

  // Section type label helper
  const sectionLabel = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="h-full flex overflow-hidden relative">
      {/* Left rail — always visible (48px) */}
      <div className="w-12 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col items-center py-2 z-20">
        {/* Toggle section list */}
        <button
          onClick={() => setSectionListExpanded(!sectionListExpanded)}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors mb-2",
            sectionListExpanded
              ? "bg-brand-50 text-brand-700"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          )}
          title="Sections"
        >
          <Layers className="w-4.5 h-4.5" />
        </button>

        {/* Section dot indicators */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1.5 py-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSelectSection(section.id)}
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors shrink-0",
                selectedId === section.id
                  ? "bg-brand-100 text-brand-700 ring-1 ring-brand-300"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600",
                !section.visible && "opacity-40"
              )}
              title={sectionLabel(section.type)}
            >
              {section.type.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>

        {/* Add section button */}
        <button
          onClick={() => setCatalogOpen(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors mt-2"
          title="Add section"
        >
          <Plus className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Left overlay — Section List with DnD (expanded from rail) */}
      {sectionListExpanded && (
        <div
          ref={overlayRef}
          className="absolute left-12 top-0 w-[220px] h-full bg-white shadow-xl z-30 border-r border-slate-200 flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 shrink-0">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sections
            </h3>
            <button
              onClick={() => setSectionListExpanded(false)}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <SectionList
                  sections={sections}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    handleSelectSection(id);
                    setSectionListExpanded(false);
                  }}
                  onToggleVisibility={handleToggleVisibility}
                  onRemove={handleRemoveSection}
                  onAddClick={() => setCatalogOpen(true)}
                />
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      {/* Center panel — Live Preview (scrolls like a real site) */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        <WebsiteThemeProvider theme={theme} className="h-full">
          <LivePreview
            sections={sections}
            theme={theme}
            selectedId={selectedId}
            onSelectSection={handleSelectSection}
            siteName={siteName}
            logoUrl={logoUrl}
            pages={pages}
          />
        </WebsiteThemeProvider>
      </div>

      {/* Right panel — Properties Form (collapsible) */}
      <div
        className={cn(
          "shrink-0 bg-white h-full overflow-y-auto transition-all duration-200",
          propertiesPanelOpen
            ? "w-[320px] border-l border-slate-200"
            : "w-0 overflow-hidden border-l-0"
        )}
      >
        {selectedSection && propertiesPanelOpen && (
          <SectionPropertiesForm
            section={selectedSection}
            onChange={handleUpdateSection}
            roasterId={roasterId}
            onClose={handleClosePropertiesPanel}
          />
        )}
      </div>

      {/* Add Section Modal */}
      <SectionCatalogModal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onAdd={handleAddSection}
      />
    </div>
  );
}
