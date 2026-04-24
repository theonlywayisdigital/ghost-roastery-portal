"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Truck, ArrowRight, Loader2 } from "@/components/icons";

export function DashboardPendingDispatchWidget() {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tools/production/dispatch");
        if (!res.ok) return;
        const data = await res.json();
        setCount(data.summary?.totalOrders ?? 0);
      } catch {
        // Widget is non-critical
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <Link
      href="/dispatch"
      className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-6 block h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center">
          <Truck className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <p className="text-sm text-slate-500">Pending Dispatch</p>
          {loading ? (
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin mt-1" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">{count}</p>
          )}
        </div>
      </div>
      <span className="text-sm text-brand-600 flex items-center gap-1">
        View dispatch <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}
