"use client";

import { useState } from "react";
import { Truck } from "@/components/icons";

interface DispatchModalProps {
  onConfirm: (trackingNumber?: string, trackingCarrier?: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function DispatchModal({ onConfirm, onClose, isLoading }: DispatchModalProps) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Mark as Dispatched</h3>
        <p className="text-sm text-slate-500 mb-4">Add tracking details before marking this order as dispatched.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 font-medium">Tracking Number</label>
            <input
              type="text"
              placeholder="e.g. RM123456789GB"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Carrier</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select carrier</option>
              <option value="Royal Mail">Royal Mail</option>
              <option value="DPD">DPD</option>
              <option value="DHL">DHL</option>
              <option value="Evri">Evri</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="Parcelforce">Parcelforce</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(trackingNumber || undefined, carrier || undefined)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <Truck className="w-4 h-4" /> {isLoading ? "Updating..." : "Confirm Dispatch"}
          </button>
        </div>
      </div>
    </div>
  );
}
