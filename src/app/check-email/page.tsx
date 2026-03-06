"use client";

import { Suspense } from "react";
import { CheckEmailContent } from "./CheckEmailContent";
import { Loader2 } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}
