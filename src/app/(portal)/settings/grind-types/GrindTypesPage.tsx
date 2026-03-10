"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Coffee,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
} from "@/components/icons";
import { SettingsHeader } from "@/components/SettingsHeader";

interface GrindType {
  id: string;
  name: string;
  sort_order: number;
}

export function GrindTypesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grindTypes, setGrindTypes] = useState<GrindType[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<GrindType> | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/grind-types");
      if (res.ok) {
        const data = await res.json();
        setGrindTypes(data.grindTypes);
      }
    } catch (err) {
      console.error("Failed to load grind types:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveItem() {
    if (!editingItem?.name?.trim()) return;
    setSavingItem(true);

    try {
      const isNew = !editingItem.id;
      const url = isNew
        ? "/api/settings/grind-types"
        : `/api/settings/grind-types/${editingItem.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingItem.name,
          sort_order: editingItem.sort_order ?? 0,
        }),
      });

      if (res.ok) {
        setEditingItem(null);
        const refreshRes = await fetch("/api/settings/grind-types");
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setGrindTypes(data.grindTypes);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save grind type");
      }
    } catch {
      setError("Failed to save grind type");
    }
    setSavingItem(false);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/settings/grind-types/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setGrindTypes((prev) => prev.filter((g) => g.id !== id));
      } else {
        setError("Failed to delete grind type");
      }
    } catch {
      setError("Failed to delete grind type");
    }
    setConfirmDelete(null);
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Grind Types</h1>
          <p className="text-slate-500 mt-1">Manage the grind options available for your products.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SettingsHeader
        title="Grind Types"
        description="Manage the grind options available for your products."
        breadcrumb="Grind Types"
      />

      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Grind Types</h2>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  The grind options customers can choose when ordering your products.
                </p>
              </div>
              <button
                onClick={() =>
                  setEditingItem({ name: "", sort_order: grindTypes.length })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Grind Type
              </button>
            </div>
          </div>
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
                <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
                  <X className="w-4 h-4 inline" />
                </button>
              </div>
            )}

            {grindTypes.length === 0 && !editingItem ? (
              <div className="text-center py-8">
                <Coffee className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  No grind types configured. Add your first grind type to offer grind options on your products.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {grindTypes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{`Sort order: ${item.sort_order}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edit/Add Modal */}
            {editingItem && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {editingItem.id ? "Edit Grind Type" : "Add Grind Type"}
                    </h3>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editingItem.name || ""}
                        onChange={(e) =>
                          setEditingItem((prev) => prev ? { ...prev, name: e.target.value } : null)
                        }
                        placeholder='e.g. "Whole Bean", "Espresso", "Filter"'
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingItem.sort_order ?? 0}
                        onChange={(e) =>
                          setEditingItem((prev) =>
                            prev ? { ...prev, sort_order: parseInt(e.target.value) || 0 } : null
                          )
                        }
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[120px]"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Lower numbers appear first.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setEditingItem(null)}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveItem}
                      disabled={savingItem || !editingItem.name?.trim()}
                      className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {savingItem ? "Saving..." : editingItem.id ? "Update" : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Delete Grind Type
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    {`Are you sure you want to delete "${grindTypes.find((g) => g.id === confirmDelete)?.name}"? This cannot be undone.`}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(confirmDelete)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
