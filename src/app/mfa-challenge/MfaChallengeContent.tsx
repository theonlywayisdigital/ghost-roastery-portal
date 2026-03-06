"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Loader2, ShieldCheck } from "lucide-react";
import { MfaChallengeForm } from "./MfaChallengeForm";
import { createBrowserClient } from "@/lib/supabase";

export function MfaChallengeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const factorIdParam = searchParams.get("factorId");
  const [factorId, setFactorId] = useState<string | null>(factorIdParam);
  const [loading, setLoading] = useState(!factorIdParam);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (factorId || loadedRef.current) return;
    loadedRef.current = true;

    async function loadFactor() {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.mfa.listFactors();

      const verified = data?.totp?.filter((f) => f.status === "verified") || [];
      if (verified.length > 0) {
        setFactorId(verified[0].id);
      } else {
        router.push("/dashboard");
      }
      setLoading(false);
    }

    loadFactor();
  }, [factorId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo height={150} className="h-[150px] w-auto" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-brand-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Two-factor authentication
            </h2>
            <p className="text-sm text-slate-500">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          {factorId && <MfaChallengeForm factorId={factorId} />}
        </div>
      </div>
    </div>
  );
}
