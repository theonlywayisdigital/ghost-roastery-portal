"use client";

import { useState } from "react";
import { Users } from "@/components/icons";
import { StatusBadge } from "@/components/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PartnerAllocationCardProps {
  roaster: any | null;
  roasterOrder: any | null;
  orderId: string;
  onAllocate?: () => void;
}

export function PartnerAllocationCard({ roaster, roasterOrder, orderId, onAllocate }: PartnerAllocationCardProps) {
  const [isAllocating, setIsAllocating] = useState(false);

  async function handleAutoAllocate() {
    setIsAllocating(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok && onAllocate) {
        onAllocate();
      }
    } finally {
      setIsAllocating(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Partner Allocation</h3>
      </div>

      {roaster ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500">Allocated Partner</p>
            <p className="text-sm font-medium text-slate-900">{roaster.business_name}</p>
          </div>
          {roasterOrder && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Status:</span>
                <StatusBadge status={roasterOrder.status} type="roasterOrder" />
              </div>
              {roasterOrder.label_print_status && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Label:</span>
                  <StatusBadge status={roasterOrder.label_print_status} type="labelPrint" />
                </div>
              )}
              {roasterOrder.dispatch_deadline && (
                <div>
                  <p className="text-xs text-slate-500">Dispatch Deadline</p>
                  <p className="text-sm text-slate-900">
                    {new Date(roasterOrder.dispatch_deadline).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              {roasterOrder.tracking_number && (
                <div>
                  <p className="text-xs text-slate-500">Tracking</p>
                  <p className="text-sm text-slate-900">
                    {`${roasterOrder.tracking_number}${roasterOrder.tracking_carrier ? ` (${roasterOrder.tracking_carrier})` : ""}`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">No partner has been allocated to this order.</p>
          <button
            onClick={handleAutoAllocate}
            disabled={isAllocating}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <Users className="w-4 h-4" /> {isAllocating ? "Allocating..." : "Auto-Allocate Partner"}
          </button>
        </div>
      )}
    </div>
  );
}
