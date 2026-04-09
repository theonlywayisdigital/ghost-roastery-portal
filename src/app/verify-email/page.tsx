"use client";

import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { VerifyEmailContent } from "./VerifyEmailContent";
import { Loader2 } from "@/components/icons";

export default function VerifyEmailPage() {
  return (
    <AuthLayout showMobileLogo={true}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
