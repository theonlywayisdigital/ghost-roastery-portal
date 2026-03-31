"use client";

import { useState } from "react";
import { Sparkles } from "@/components/icons";

export function ReopenSetupGuide() {
  const [reopened, setReopened] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReopen() {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: false }),
      });
      if (res.ok) {
        setReopened(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (reopened) {
    return (
      <p className="text-sm text-green-600 font-medium">
        Setup guide reopened — check the sidebar.
      </p>
    );
  }

  return (
    <button
      onClick={handleReopen}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors disabled:opacity-50"
    >
      <Sparkles className="w-4 h-4" />
      {loading ? "Reopening..." : "Reopen Setup Guide"}
    </button>
  );
}
