"use client";

import { useState } from "react";
import {
  X,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Check,
  Loader2,
} from "lucide-react";
import type { KBCategory, AudienceType } from "@/types/support";

const AUDIENCES: { value: AudienceType; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "roaster", label: "Roaster" },
  { value: "admin", label: "Admin" },
];

interface Props {
  categories: KBCategory[];
  onClose: () => void;
  onUpdated: () => void;
}

export function CategoryManager({ categories, onClose, onUpdated }: Props) {
  const [items, setItems] = useState(categories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAudience, setEditAudience] = useState<AudienceType[]>([]);
  const [newName, setNewName] = useState("");
  const [newAudience, setNewAudience] = useState<AudienceType[]>([
    "customer",
    "roaster",
  ]);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const startEdit = (cat: KBCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditAudience([...cat.audience]);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    const slug = editName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const res = await fetch(`/api/admin/support/kb/categories/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        slug,
        audience: editAudience,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      onUpdated();
      const data = await res.json();
      setItems((prev) =>
        prev.map((c) => (c.id === editingId ? data.category : c))
      );
    }
    setSaving(false);
  };

  const addCategory = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/support/kb/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), audience: newAudience }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => [...prev, data.category]);
      setNewName("");
      setNewAudience(["customer", "roaster"]);
      onUpdated();
    }
    setSaving(false);
  };

  const deleteCategory = async (id: string) => {
    const cat = items.find((c) => c.id === id);
    if (
      !confirm(
        `Delete "${cat?.name}"? Articles in this category will become uncategorized.`
      )
    )
      return;
    const res = await fetch(`/api/admin/support/kb/categories/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setItems((prev) => prev.filter((c) => c.id !== id));
      onUpdated();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete category");
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newItems = [...items];
    const [dragged] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, dragged);
    setItems(newItems);
    setDragIndex(index);
  };

  const handleDragEnd = async () => {
    setDragIndex(null);
    await fetch("/api/admin/support/kb/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_ids: items.map((c) => c.id) }),
    });
    onUpdated();
  };

  const toggleAudience = (
    arr: AudienceType[],
    val: AudienceType,
    setter: (v: AudienceType[]) => void
  ) => {
    setter(
      arr.includes(val) ? arr.filter((a) => a !== val) : [...arr, val]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Manage Categories
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {items.map((cat, index) => (
            <div
              key={cat.id}
              draggable={editingId !== cat.id}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                dragIndex === index
                  ? "border-brand-300 bg-brand-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <GripVertical className="w-4 h-4 text-slate-300 cursor-grab flex-shrink-0" />

              {editingId === cat.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    {AUDIENCES.map((a) => (
                      <button
                        key={a.value}
                        onClick={() =>
                          toggleAudience(editAudience, a.value, setEditAudience)
                        }
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          editAudience.includes(a.value)
                            ? "bg-brand-100 text-brand-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1 bg-brand-600 text-white rounded-md text-xs font-medium hover:bg-brand-700"
                    >
                      {saving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 text-slate-500 text-xs hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {cat.name}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {cat.audience.map((a) => (
                        <span
                          key={a}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {cat.article_count ?? 0}
                  </span>
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              No categories yet. Add one below.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <button
              onClick={addCategory}
              disabled={saving || !newName.trim()}
              className="flex items-center gap-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          <div className="flex gap-2">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                onClick={() =>
                  toggleAudience(newAudience, a.value, setNewAudience)
                }
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  newAudience.includes(a.value)
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
