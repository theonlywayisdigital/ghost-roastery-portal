"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "@/components/icons";
import { useMarketingContext } from "@/lib/marketing-context";

export default function NewCampaignPage() {
  const router = useRouter();
  const { apiBase, pageBase } = useMarketingContext();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function create() {
      try {
        const res = await fetch(`${apiBase}/campaigns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Untitled Campaign" }),
        });
        if (res.ok) {
          const { campaign } = await res.json();
          router.replace(`${pageBase}/campaigns/${campaign.id}/edit`);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to create campaign.");
        }
      } catch {
        setError("Failed to create campaign. Please check your connection.");
      }
    }
    create();
  }, [router, apiBase, pageBase]);

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <button
          onClick={() => router.push(`${pageBase}/campaigns`)}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      <span className="ml-2 text-sm text-slate-500">Creating campaign...</span>
    </div>
  );
}
