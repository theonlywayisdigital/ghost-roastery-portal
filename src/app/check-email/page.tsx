"use client";

import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CheckEmailContent } from "./CheckEmailContent";
import { Loader2 } from "@/components/icons";

export default function CheckEmailPage() {
  return (
    <AuthLayout showMobileLogo={true}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        }
      >
        <CheckEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
