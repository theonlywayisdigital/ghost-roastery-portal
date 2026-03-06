"use client";

import { useState, useEffect } from "react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, Plus, X } from "@/components/icons";

interface PageItem {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
  nav_sort_order: number;
  footer_sort_order: number;
  is_published: boolean;
  show_in_nav: boolean;
  show_in_footer: boolean;
  is_nav_button: boolean;
}

export default function MenusPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetch("/api/website/pages")
      .then((r) => r.json())
      .then((data) => {
        if (data.pages) {
          setPages(
            data.pages.map((p: PageItem) => ({
              ...p,
              show_in_nav: p.show_in_nav ?? false,
              show_in_footer: p.show_in_footer ?? false,
              is_nav_button: p.is_nav_button ?? false,
              nav_sort_order: p.nav_sort_order ?? p.sort_order ?? 0,
              footer_sort_order: p.footer_sort_order ?? p.sort_order ?? 0,
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Derived lists
  const navPages = pages
    .filter((p) => p.show_in_nav && p.slug !== "home")
    .sort((a, b) => a.nav_sort_order - b.nav_sort_order);

  const footerPages = pages
    .filter((p) => p.show_in_footer && p.slug !== "home")
    .sort((a, b) => a.footer_sort_order - b.footer_sort_order);

  const unassignedPages = pages.filter(
    (p) => !p.show_in_nav && !p.show_in_footer && p.slug !== "home"
  );

  function handleNavDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = navPages.findIndex((p) => p.id === active.id);
    const newIndex = navPages.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(navPages, oldIndex, newIndex);

    setPages((prev) =>
      prev.map((p) => {
        const idx = reordered.findIndex((r) => r.id === p.id);
        if (idx !== -1) return { ...p, nav_sort_order: idx };
        return p;
      })
    );
  }

  function handleFooterDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = footerPages.findIndex((p) => p.id === active.id);
    const newIndex = footerPages.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(footerPages, oldIndex, newIndex);

    setPages((prev) =>
      prev.map((p) => {
        const idx = reordered.findIndex((r) => r.id === p.id);
        if (idx !== -1) return { ...p, footer_sort_order: idx };
        return p;
      })
    );
  }

  function toggleField(id: string, field: "show_in_nav" | "show_in_footer") {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: !p[field] };
        // When adding to nav, set nav_sort_order to end
        if (field === "show_in_nav" && !p.show_in_nav) {
          updated.nav_sort_order = navPages.length;
        }
        // When adding to footer, set footer_sort_order to end
        if (field === "show_in_footer" && !p.show_in_footer) {
          updated.footer_sort_order = footerPages.length;
        }
        return updated;
      })
    );
  }

  function toggleButton(id: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_nav_button: !p.is_nav_button } : p))
    );
  }

  function removeFromNav(id: string) {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, show_in_nav: false, is_nav_button: false } : p
      )
    );
  }

  function removeFromFooter(id: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, show_in_footer: false } : p))
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/website/pages/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: pages.map((p) => ({
            id: p.id,
            show_in_nav: p.show_in_nav,
            show_in_footer: p.show_in_footer,
            nav_sort_order: p.nav_sort_order,
            footer_sort_order: p.footer_sort_order,
            is_nav_button: p.is_nav_button,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Menus</h1>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Menus</h1>
          <p className="text-slate-500 text-sm mt-1">
            Control which pages appear in the navigation bar and footer.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          No pages yet. Create pages to manage their navigation placement.
        </div>
      </div>
    );
  }

  // Pages that could be added (non-home, not currently in nav/footer respectively)
  const addableToNav = pages.filter(
    (p) => !p.show_in_nav && p.slug !== "home"
  );
  const addableToFooter = pages.filter(
    (p) => !p.show_in_footer && p.slug !== "home"
  );

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Menus</h1>
          <p className="text-slate-500 text-sm mt-1">
            Control which pages appear in the navigation bar and footer, and in
            what order.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Navigation Bar */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          Navigation Bar
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Drag to reorder. Toggle &ldquo;Button&rdquo; to display a page as a
          styled button in the nav.
        </p>

        {navPages.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-6 text-center text-sm text-slate-400">
            No pages in the navigation bar yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_80px_auto] items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
              <div className="w-5" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Page
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                Button
              </span>
              <div className="w-7" />
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleNavDragEnd}
            >
              <SortableContext
                items={navPages.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {navPages.map((page) => (
                  <SortableNavRow
                    key={page.id}
                    page={page}
                    onToggleButton={() => toggleButton(page.id)}
                    onRemove={() => removeFromNav(page.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {addableToNav.length > 0 && (
          <AddPageDropdown
            label="Add to Nav"
            pages={addableToNav}
            onAdd={(id) => toggleField(id, "show_in_nav")}
          />
        )}
      </section>

      {/* Footer */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Footer</h2>
        <p className="text-sm text-slate-500 mb-4">
          Drag to reorder footer links.
        </p>

        {footerPages.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-6 text-center text-sm text-slate-400">
            No pages in the footer yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
              <div className="w-5" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Page
              </span>
              <div className="w-7" />
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFooterDragEnd}
            >
              <SortableContext
                items={footerPages.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {footerPages.map((page) => (
                  <SortableFooterRow
                    key={page.id}
                    page={page}
                    onRemove={() => removeFromFooter(page.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {addableToFooter.length > 0 && (
          <AddPageDropdown
            label="Add to Footer"
            pages={addableToFooter}
            onAdd={(id) => toggleField(id, "show_in_footer")}
          />
        )}
      </section>

      {/* Unassigned */}
      {unassignedPages.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Unassigned Pages
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            These pages are not in the nav or footer.
          </p>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {unassignedPages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {page.title}
                    </span>
                    {!page.is_published && (
                      <span className="shrink-0 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">/{page.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleField(page.id, "show_in_nav")}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2.5 py-1.5 rounded-md hover:bg-brand-50 transition-colors"
                  >
                    + Nav
                  </button>
                  <button
                    onClick={() => toggleField(page.id, "show_in_footer")}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2.5 py-1.5 rounded-md hover:bg-brand-50 transition-colors"
                  >
                    + Footer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Drag Handle Icon ─────────────────────────────────────────────────── */

function DragHandleIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

/* ─── Sortable Nav Row ─────────────────────────────────────────────────── */

interface SortableNavRowProps {
  page: PageItem;
  onToggleButton: () => void;
  onRemove: () => void;
}

function SortableNavRow({ page, onToggleButton, onRemove }: SortableNavRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[auto_1fr_80px_auto] items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
    >
      <button
        {...attributes}
        {...listeners}
        className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
      >
        <DragHandleIcon />
      </button>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 truncate">
            {page.title}
          </span>
          {!page.is_published && (
            <span className="shrink-0 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              Draft
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">/{page.slug}</span>
      </div>

      {/* Button toggle */}
      <div className="flex justify-center">
        <button
          onClick={onToggleButton}
          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
          style={{
            backgroundColor: page.is_nav_button ? "#4f46e5" : "#e2e8f0",
          }}
          title={
            page.is_nav_button
              ? "Displayed as a button in the nav"
              : "Displayed as a regular link"
          }
        >
          <span
            className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
            style={{
              transform: page.is_nav_button
                ? "translateX(18px)"
                : "translateX(3px)",
            }}
          />
        </button>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
        title="Remove from nav"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Sortable Footer Row ──────────────────────────────────────────────── */

interface SortableFooterRowProps {
  page: PageItem;
  onRemove: () => void;
}

function SortableFooterRow({ page, onRemove }: SortableFooterRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
    >
      <button
        {...attributes}
        {...listeners}
        className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
      >
        <DragHandleIcon />
      </button>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 truncate">
            {page.title}
          </span>
          {!page.is_published && (
            <span className="shrink-0 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              Draft
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">/{page.slug}</span>
      </div>

      <button
        onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
        title="Remove from footer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Add Page Dropdown ────────────────────────────────────────────────── */

interface AddPageDropdownProps {
  label: string;
  pages: PageItem[];
  onAdd: (id: string) => void;
}

function AddPageDropdown({ label, pages, onAdd }: AddPageDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-lg border border-slate-200 shadow-lg py-1 min-w-[200px] max-h-60 overflow-auto">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => {
                  onAdd(page.id);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span className="truncate">{page.title}</span>
                {!page.is_published && (
                  <span className="shrink-0 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-2">
                    Draft
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
