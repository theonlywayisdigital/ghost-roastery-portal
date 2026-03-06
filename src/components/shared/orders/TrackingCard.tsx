"use client";

import { useState } from "react";
import { Truck } from "@/components/icons";

interface TrackingCardProps {
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  editable?: boolean;
  onSave?: (trackingNumber: string, trackingCarrier: string) => Promise<void>;
}

export function TrackingCard({
  trackingNumber: initialNumber,
  trackingCarrier: initialCarrier,
  editable = false,
  onSave,
}: TrackingCardProps) {
  const [number, setNumber] = useState(initialNumber || "");
  const [carrier, setCarrier] = useState(initialCarrier || "");
  const [saving, setSaving] = useState(false);

  // Don't show if no tracking and not editable
  if (!initialNumber && !editable) return null;

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(number, carrier);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Tracking</h3>
      </div>

      {editable ? (
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Tracking number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Carrier</option>
            <option value="Royal Mail">Royal Mail</option>
            <option value="DPD">DPD</option>
            <option value="DHL">DHL</option>
            <option value="Evri">Evri</option>
            <option value="UPS">UPS</option>
            <option value="FedEx">FedEx</option>
            <option value="Parcelforce">Parcelforce</option>
            <option value="Other">Other</option>
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {initialNumber && (
            <p className="text-sm text-slate-900">{initialNumber}</p>
          )}
          {initialCarrier && (
            <p className="text-sm text-slate-500">{initialCarrier}</p>
          )}
        </div>
      )}
    </div>
  );
}
