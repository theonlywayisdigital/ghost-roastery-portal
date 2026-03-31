"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Tag, Megaphone, Receipt, Package, Flame } from "@/components/icons";
import { QuickReceiveModal } from "@/components/inventory/QuickReceiveModal";
import { QuickRoastModal } from "@/components/inventory/QuickRoastModal";

export function DashboardQuickActions() {
  const router = useRouter();
  const [showReceive, setShowReceive] = useState(false);
  const [showRoast, setShowRoast] = useState(false);

  function handleSuccess() {
    router.refresh();
  }

  const btnClass = "inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap";

  return (
    <>
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        <Link href="/orders/new" className={btnClass}>
          <Plus className="w-4 h-4" />
          Create Order
        </Link>
        <Link href="/products/new" className={btnClass}>
          <Tag className="w-4 h-4" />
          Add Product
        </Link>
        <button onClick={() => setShowReceive(true)} className={btnClass}>
          <Package className="w-4 h-4" />
          Receive Beans
        </button>
        <button onClick={() => setShowRoast(true)} className={btnClass}>
          <Flame className="w-4 h-4" />
          Log Roast
        </button>
        <Link href="/marketing/campaigns/new" className={btnClass}>
          <Megaphone className="w-4 h-4" />
          Send Campaign
        </Link>
        <Link href="/invoices/new" className={btnClass}>
          <Receipt className="w-4 h-4" />
          Create Invoice
        </Link>
      </div>

      <QuickReceiveModal open={showReceive} onClose={() => setShowReceive(false)} onSuccess={handleSuccess} />
      <QuickRoastModal open={showRoast} onClose={() => setShowRoast(false)} onSuccess={handleSuccess} />
    </>
  );
}
