"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Lock,
  Funnel,
  Trophy,
  XCircle,
} from "@/components/icons";
import Link from "next/link";
import { SettingsHeader } from "@/components/SettingsHeader";
import { STAGE_COLOURS, VALID_COLOURS, type PipelineStage } from "@/lib/pipeline";

export function PipelineStagesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<PipelineStage> | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [canCustomise, setCanCustomise] = useState(true);
  const [reordering, setReordering] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pipeline-stages");
      if (res.ok) {
        const data = await res.json();
        setStages(data.stages);
      }
      // Check if user can customise (try a feature-gated endpoint)
      // We'll just check via the stages GET response — canCustomise stays true by default
      // and gets set to false only if a POST returns 403
    } catch (err) {
      console.error("Failed to load pipeline stages:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveItem() {
    if (!editingItem?.name?.trim()) return;
    setSavingItem(true);
    setError(null);

    try {
      const isNew = !editingItem.id;
      const url = isNew
        ? "/api/pipeline-stages"
        : `/api/pipeline-stages/${editingItem.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingItem.name,
          colour: editingItem.colour || "blue",
          sort_order: editingItem.sort_order ?? stages.length,
        }),
      });

      if (res.ok) {
        setEditingItem(null);
        loadData();
      } else if (res.status === 403) {
        setCanCustomise(false);
        setEditingItem(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save stage");
      }
    } catch {
      setError("Failed to save stage");
    }
    setSavingItem(false);
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/pipeline-stages/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStages((prev) => prev.filter((s) => s.id !== id));
      } else if (res.status === 403) {
        setCanCustomise(false);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete stage");
      }
    } catch {
      setError("Failed to delete stage");
    }
    setConfirmDelete(null);
  }

  async function handleMove(id: string, direction: "up" | "down") {
    const idx = stages.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;

    const updated = [...stages];
    [updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]];
    // Reassign sort_order
    const reordered = updated.map((s, i) => ({ ...s, sort_order: i }));
    setStages(reordered);

    setReordering(true);
    try {
      const res = await fetch("/api/pipeline-stages/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: reordered.map((s) => ({ id: s.id, sort_order: s.sort_order })),
        }),
      });
      if (res.status === 403) {
        setCanCustomise(false);
        loadData(); // revert
      } else if (!res.ok) {
        loadData(); // revert
      }
    } catch {
      loadData(); // revert
    }
    setReordering(false);
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Pipeline Stages</h1>
          <p className="text-slate-500 mt-1">Manage the stages in your sales pipeline.</p>
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
        title="Pipeline Stages"
        description="Manage the stages in your sales pipeline."
        breadcrumb="Pipeline Stages"
      />

      <div className="space-y-6">
        {/* Upgrade banner for Growth plan */}
        {!canCustomise && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">
                Upgrade to customise pipeline stages
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Custom pipeline stages are available on the Starter plan and above.
                You can view the default stages below.
              </p>
              <Link
                href="/settings/billing?tab=subscription"
                className="inline-flex items-center mt-3 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                Upgrade Plan
              </Link>
            </div>
          </div>
        )}

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Funnel className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Pipeline Stages</h2>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Stages that contacts and businesses move through in your sales pipeline.
                </p>
              </div>
              {canCustomise && (
                <button
                  onClick={() =>
                    setEditingItem({ name: "", colour: "blue", sort_order: stages.length })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Stage
                </button>
              )}
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

            {stages.length === 0 ? (
              <div className="text-center py-8">
                <Funnel className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  No pipeline stages configured.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stages.map((stage, idx) => {
                  const colours = STAGE_COLOURS[stage.colour] || STAGE_COLOURS.blue;
                  return (
                    <div
                      key={stage.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white"
                    >
                      {/* Colour swatch */}
                      <div className={`w-3 h-3 rounded-full ${colours.dot} flex-shrink-0`} />

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{stage.name}</p>
                      </div>

                      {/* Win/Loss badges */}
                      {stage.is_win && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <Trophy className="w-3 h-3" />
                          Win
                        </span>
                      )}
                      {stage.is_loss && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                          <XCircle className="w-3 h-3" />
                          Loss
                        </span>
                      )}
                      {stage.is_default && (
                        <span className="text-xs text-slate-400">Default</span>
                      )}

                      {/* Reorder buttons */}
                      {canCustomise && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleMove(stage.id, "up")}
                            disabled={idx === 0 || reordering}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMove(stage.id, "down")}
                            disabled={idx === stages.length - 1 || reordering}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Edit/Delete buttons */}
                      {canCustomise && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingItem(stage)}
                            className="p-1.5 text-slate-400 hover:text-slate-600"
                            title="Edit stage"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (stage.is_default) {
                                setError("Default stages cannot be deleted");
                                return;
                              }
                              setConfirmDelete(stage.id);
                            }}
                            disabled={stage.is_default}
                            className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={stage.is_default ? "Default stages cannot be deleted" : "Delete stage"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Edit/Add Modal */}
            {editingItem && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {editingItem.id ? "Edit Stage" : "Add Stage"}
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
                        placeholder='e.g. "Qualified", "Proposal Sent"'
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Colour
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {VALID_COLOURS.map((c) => {
                          const colourClasses = STAGE_COLOURS[c];
                          return (
                            <button
                              key={c}
                              onClick={() =>
                                setEditingItem((prev) => prev ? { ...prev, colour: c } : null)
                              }
                              className={`w-8 h-8 rounded-lg ${colourClasses?.dot || "bg-slate-500"} transition-all ${
                                editingItem.colour === c
                                  ? "ring-2 ring-offset-2 ring-brand-500 scale-110"
                                  : "hover:scale-105"
                              }`}
                              title={c}
                            />
                          );
                        })}
                      </div>
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
                    Delete Stage
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    {`Are you sure you want to delete "${stages.find((s) => s.id === confirmDelete)?.name}"? Contacts and businesses in this stage will keep their current status.`}
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
