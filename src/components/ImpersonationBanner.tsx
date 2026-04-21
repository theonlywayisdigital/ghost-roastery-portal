"use client";

import { useState } from "react";
import { Eye, X } from "@/components/icons";

export function ImpersonationBanner({ roasterName }: { roasterName: string }) {
  const [exiting, setExiting] = useState(false);

  async function handleExit() {
    setExiting(true);
    try {
      const res = await fetch("/api/admin/impersonate/exit", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.redirectUrl;
      }
    } catch {
      setExiting(false);
    }
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium relative z-50">
      <Eye className="w-4 h-4 flex-shrink-0" />
      <span>{`Viewing as ${roasterName}`}</span>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold transition-colors disabled:opacity-50"
      >
        <X className="w-3 h-3" />
        {exiting ? "Exiting..." : "Exit"}
      </button>
    </div>
  );
}
