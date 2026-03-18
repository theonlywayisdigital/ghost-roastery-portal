"use client";

import { useState } from "react";
import { Settings } from "@/components/icons";

export function InventoryOverview({
  roasterId,
  defaultBatchSizeKg,
}: {
  roasterId: string;
  defaultBatchSizeKg: number | null;
}) {
  const [batchSize, setBatchSize] = useState(
    defaultBatchSizeKg != null ? String(defaultBatchSizeKg) : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const value = batchSize.trim() ? parseFloat(batchSize) : null;

    const res = await fetch("/api/tools/inventory/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_batch_size_kg: value }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">
            Inventory Settings
          </h2>
        </div>

        <div className="max-w-sm">
          <label
            htmlFor="batch-size"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Default Batch Size (kg)
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Your typical roast batch size in KG. Used to calculate batches
            needed from available stock.
          </p>
          <div className="flex items-center gap-3">
            <input
              id="batch-size"
              type="number"
              step="0.1"
              min="0"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              placeholder="e.g. 12"
              className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">Saved</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
