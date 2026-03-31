"use client";

import { useState } from "react";
import { Scale, Check, X } from "@/components/icons";

interface RebalanceItem {
  type: "green" | "roasted";
  id: string;
  name: string;
  currentKg: number;
  linkedGreenBeanId?: string;
  linkedGreenBeanName?: string;
  linkedGreenBeanKg?: number;
}

interface QuickRebalanceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: RebalanceItem;
}

export function QuickRebalanceModal({ open, onClose, onSuccess, item }: QuickRebalanceModalProps) {
  const [newGreenKg, setNewGreenKg] = useState("");
  const [newRoastedKg, setNewRoastedKg] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const showGreen = item.type === "green" || (item.type === "roasted" && !!item.linkedGreenBeanId);
  const showRoasted = item.type === "roasted";

  function handleClose() {
    setNewGreenKg("");
    setNewRoastedKg("");
    setNotes("");
    setError(null);
    setSuccess(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const promises: Promise<Response>[] = [];

    // Green bean adjustment
    if (showGreen && newGreenKg) {
      const greenId = item.type === "green" ? item.id : item.linkedGreenBeanId;
      const currentGreen = item.type === "green" ? item.currentKg : (item.linkedGreenBeanKg || 0);
      const diff = parseFloat(newGreenKg) - currentGreen;
      if (diff !== 0 && greenId) {
        promises.push(
          fetch(`/api/tools/green-beans/${greenId}/movements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movement_type: "adjustment",
              quantity_kg: diff,
              notes: notes || "Stock rebalance",
            }),
          })
        );
      }
    }

    // Roasted stock adjustment
    if (showRoasted && newRoastedKg) {
      const diff = parseFloat(newRoastedKg) - item.currentKg;
      if (diff !== 0) {
        promises.push(
          fetch(`/api/tools/roasted-stock/${item.id}/movements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movement_type: "adjustment",
              quantity_kg: diff,
              notes: notes || "Stock rebalance",
            }),
          })
        );
      }
    }

    if (promises.length === 0) {
      setError("No changes to save");
      setSaving(false);
      return;
    }

    const results = await Promise.all(promises);
    const failed = results.some((r) => !r.ok);

    if (failed) {
      setError("Some adjustments failed");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => {
      onSuccess();
      handleClose();
    }, 800);
  }

  if (!open) return null;

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Scale className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Rebalance Stock</h3>
          </div>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4 ml-[46px]">{item.name}</p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {success ? (
          <div className="flex items-center justify-center gap-2 py-8 text-green-600">
            <Check className="w-5 h-5" />
            <span className="font-medium">Stock levels updated</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {showGreen && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-500 font-medium">
                    {item.type === "green" ? "Green Stock" : `Green Stock (${item.linkedGreenBeanName})`}
                  </label>
                  <span className="text-xs text-slate-400">
                    current: {(item.type === "green" ? item.currentKg : (item.linkedGreenBeanKg || 0)).toFixed(2)} kg
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">
                    {(item.type === "green" ? item.currentKg : (item.linkedGreenBeanKg || 0)).toFixed(2)} kg
                  </span>
                  <span className="text-slate-300">&rarr;</span>
                  <input
                    type="number"
                    value={newGreenKg}
                    onChange={(e) => setNewGreenKg(e.target.value)}
                    className={inputClass}
                    min="0"
                    step="0.001"
                    placeholder="New level"
                    autoFocus={item.type === "green"}
                  />
                </div>
                {newGreenKg && (
                  <p className="text-xs mt-1 text-slate-500">
                    {(() => {
                      const current = item.type === "green" ? item.currentKg : (item.linkedGreenBeanKg || 0);
                      const diff = parseFloat(newGreenKg) - current;
                      if (diff === 0) return "No change";
                      return `${diff > 0 ? "+" : ""}${diff.toFixed(3)} kg adjustment`;
                    })()}
                  </p>
                )}
              </div>
            )}

            {showRoasted && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-500 font-medium">Roasted Stock</label>
                  <span className="text-xs text-slate-400">current: {item.currentKg.toFixed(2)} kg</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">{item.currentKg.toFixed(2)} kg</span>
                  <span className="text-slate-300">&rarr;</span>
                  <input
                    type="number"
                    value={newRoastedKg}
                    onChange={(e) => setNewRoastedKg(e.target.value)}
                    className={inputClass}
                    min="0"
                    step="0.001"
                    placeholder="New level"
                    autoFocus={item.type === "roasted"}
                  />
                </div>
                {newRoastedKg && (
                  <p className="text-xs mt-1 text-slate-500">
                    {(() => {
                      const diff = parseFloat(newRoastedKg) - item.currentKg;
                      if (diff === 0) return "No change";
                      return `${diff > 0 ? "+" : ""}${diff.toFixed(3)} kg adjustment`;
                    })()}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500 font-medium">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="e.g. Physical stocktake correction"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (!newGreenKg && !newRoastedKg)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                <Scale className="w-4 h-4" />
                {saving ? "Updating..." : "Update Stock Levels"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
