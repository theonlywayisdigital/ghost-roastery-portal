import { Suspense } from "react";
import { StartTrialContent } from "./StartTrialContent";
import { Logo } from "@/components/Logo";
import { Loader2 } from "@/components/icons";

function StartTrialFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo height={150} className="h-[150px] w-auto" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Loading...
          </h2>
          <p className="text-sm text-slate-500">
            Please wait while we load your plans.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StartTrialPage() {
  return (
    <Suspense fallback={<StartTrialFallback />}>
      <StartTrialContent />
    </Suspense>
  );
}
