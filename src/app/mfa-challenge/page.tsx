"use client";

import { Suspense } from "react";
import { MfaChallengeContent } from "./MfaChallengeContent";
import { Loader2 } from "@/components/icons";

export default function MfaChallengePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      }
    >
      <MfaChallengeContent />
    </Suspense>
  );
}
