"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useMarketingContext } from "@/lib/marketing-context";
import { Loader2 } from "lucide-react";
import { DiscountCodeForm } from "../../DiscountCodeForm";
import type { DiscountCode } from "@/types/marketing";

export default function EditDiscountCodePage() {
  const params = useParams();
  const { apiBase } = useMarketingContext();
  const id = params.id as string;
  const [code, setCode] = useState<DiscountCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase}/discount-codes/${id}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setCode(data.code);
        } else {
          setError("Discount code not found.");
        }
      })
      .catch(() => setError("Failed to load discount code."))
      .finally(() => setLoading(false));
  }, [id, apiBase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !code) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-600">{error || "Discount code not found."}</p>
      </div>
    );
  }

  return <DiscountCodeForm mode="edit" initialData={code} />;
}
