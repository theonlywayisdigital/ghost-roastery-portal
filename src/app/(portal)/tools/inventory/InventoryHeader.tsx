"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Flame } from "@/components/icons";
import { QuickReceiveModal } from "@/components/inventory/QuickReceiveModal";
import { QuickRoastModal } from "@/components/inventory/QuickRoastModal";

export function InventoryHeader() {
  const router = useRouter();
  const [showReceive, setShowReceive] = useState(false);
  const [showRoast, setShowRoast] = useState(false);

  function handleSuccess() {
    router.refresh();
  }

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500 mt-1">
            Manage your green bean and roasted coffee stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReceive(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Package className="w-4 h-4" />
            Receive Beans
          </button>
          <button
            onClick={() => setShowRoast(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors whitespace-nowrap"
          >
            <Flame className="w-4 h-4" />
            Log Roast
          </button>
        </div>
      </div>

      <QuickReceiveModal open={showReceive} onClose={() => setShowReceive(false)} onSuccess={handleSuccess} />
      <QuickRoastModal open={showRoast} onClose={() => setShowRoast(false)} onSuccess={handleSuccess} />
    </>
  );
}
