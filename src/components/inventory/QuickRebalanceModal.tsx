"use client";

import { useState, useEffect } from "react";
import { Scale, Check, X, Loader2 } from "@/components/icons";

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
  const [newKg, setNewKg] = useState("");
  const [updateGreen, setUpdateGreen] = useState(false);
  const [newGreenKg, setNewGreenKg] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fresh stock values fetched from the DB
  const [loading, setLoading] = useState(false);
  const [liveKg, setLiveKg] = useState<number | null>(null);
  const [liveGreenKg, setLiveGreenKg] = useState<number | null>(null);

  // Fetch fresh stock values whenever the modal opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setLiveKg(null);
    setLiveGreenKg(null);

    async function fetchFreshData() {
      try {
        if (item.type === "green") {
          const res = await fetch(`/api/tools/green-beans/${item.id}`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) {
              setLiveKg(parseFloat(String(data.greenBean.current_stock_kg)) || 0);
            }
          }
        } else {
          const res = await fetch(`/api/tools/roasted-stock/${item.id}`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) {
              setLiveKg(parseFloat(String(data.roastedStock.current_stock_kg)) || 0);
              // If linked green bean, fetch its fresh data too
              const greenId = data.roastedStock.green_bean_id || item.linkedGreenBeanId;
              if (greenId) {
                const greenRes = await fetch(`/api/tools/green-beans/${greenId}`);
                if (greenRes.ok) {
                  const greenData = await greenRes.json();
                  if (!cancelled) {
                    setLiveGreenKg(parseFloat(String(greenData.greenBean.current_stock_kg)) || 0);
                  }
                }
              }
            }
          }
        }
      } catch {
        // Fall back to props values silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFreshData();
    return () => { cancelled = true; };
  }, [open, item.id, item.type, item.linkedGreenBeanId]);

  // Use live values if available, fall back to props
  const currentKg = liveKg ?? item.currentKg;
  const currentGreenKg = liveGreenKg ?? (item.linkedGreenBeanKg || 0);

  function handleClose() {
    setNewKg("");
    setUpdateGreen(false);
    setNewGreenKg("");
    setNotes("");
    setError(null);
    setSuccess(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newKg) {
      setError("Enter a new stock level");
      return;
    }

    const targetKg = parseFloat(newKg);
    if (isNaN(targetKg) || targetKg < 0) {
      setError("Enter a valid stock level");
      return;
    }

    // Check if main stock actually changed
    if (targetKg === currentKg && !(updateGreen && newGreenKg)) {
      setError("No changes to save");
      return;
    }

    setSaving(true);
    setError(null);

    const promises: Promise<Response>[] = [];

    if (item.type === "green") {
      if (targetKg !== currentKg) {
        promises.push(
          fetch(`/api/tools/green-beans/${item.id}/movements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movement_type: "adjustment",
              set_to_kg: targetKg,
              notes: notes || "Stock rebalance",
            }),
          })
        );
      }
    } else {
      if (targetKg !== currentKg) {
        promises.push(
          fetch(`/api/tools/roasted-stock/${item.id}/movements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movement_type: "adjustment",
              set_to_kg: targetKg,
              notes: notes || "Stock rebalance",
            }),
          })
        );
      }

      // Optional linked green bean update
      if (updateGreen && newGreenKg && item.linkedGreenBeanId) {
        const greenTarget = parseFloat(newGreenKg);
        if (!isNaN(greenTarget) && greenTarget !== currentGreenKg) {
          promises.push(
            fetch(`/api/tools/green-beans/${item.linkedGreenBeanId}/movements`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                movement_type: "adjustment",
                set_to_kg: greenTarget,
                notes: notes || "Stock rebalance",
              }),
            })
          );
        }
      }
    }

    if (promises.length === 0) {
      setError("No changes to save");
      setSaving(false);
      return;
    }

    try {
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
    } catch {
      setError("Something went wrong");
      setSaving(false);
    }
  }

  if (!open) return null;

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500";
  const isGreen = item.type === "green";

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

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading current stock...</span>
          </div>
        ) : success ? (
          <div className="flex items-center justify-center gap-2 py-8 text-green-600">
            <Check className="w-5 h-5" />
            <span className="font-medium">Stock levels updated</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Main stock input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Set new stock level (kg)
                </label>
                <span className="text-xs text-slate-400">
                  Current: {currentKg.toFixed(2)} kg
                </span>
              </div>
              <input
                type="number"
                value={newKg}
                onChange={(e) => setNewKg(e.target.value)}
                className={inputClass}
                min="0"
                step="0.001"
                placeholder={currentKg.toFixed(2)}
                autoFocus
              />
              {newKg && (
                <p className="text-xs mt-1 text-slate-500">
                  {(() => {
                    const diff = parseFloat(newKg) - currentKg;
                    if (diff === 0) return "No change";
                    return `${diff > 0 ? "+" : ""}${diff.toFixed(3)} kg adjustment`;
                  })()}
                </p>
              )}
            </div>

            {/* Optional linked green bean update (roasted stock only) */}
            {!isGreen && item.linkedGreenBeanId && (
              <div className="border-t border-slate-100 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateGreen}
                    onChange={(e) => {
                      setUpdateGreen(e.target.checked);
                      if (!e.target.checked) setNewGreenKg("");
                    }}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-700">Also update linked green bean stock?</span>
                </label>

                {updateGreen && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-slate-500 font-medium">
                        {item.linkedGreenBeanName}
                      </label>
                      <span className="text-xs text-slate-400">
                        Current: {currentGreenKg.toFixed(2)} kg
                      </span>
                    </div>
                    <input
                      type="number"
                      value={newGreenKg}
                      onChange={(e) => setNewGreenKg(e.target.value)}
                      className={inputClass}
                      min="0"
                      step="0.001"
                      placeholder={currentGreenKg.toFixed(2)}
                    />
                    {newGreenKg && (
                      <p className="text-xs mt-1 text-slate-500">
                        {(() => {
                          const diff = parseFloat(newGreenKg) - currentGreenKg;
                          if (diff === 0) return "No change";
                          return `${diff > 0 ? "+" : ""}${diff.toFixed(3)} kg adjustment`;
                        })()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
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
                disabled={saving || !newKg}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                {saving ? "Updating..." : "Update Stock"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
