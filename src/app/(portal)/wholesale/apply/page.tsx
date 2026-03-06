import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { WholesaleApplyForm } from "@/app/s/[slug]/WholesaleApplyForm";

export default async function WholesaleApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // For now, show the form without roaster context
  // In a full implementation, the user would select which roaster to apply to
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        Apply for Wholesale Access
      </h1>
      <p className="text-slate-500 mb-8">
        Submit your application to get trade pricing from a roaster.
      </p>
      <div className="max-w-2xl">
        <p className="text-sm text-slate-500">
          To apply for wholesale access, visit a roaster&apos;s storefront and use
          the trade enquiry form, or contact them directly through the portal.
        </p>
      </div>
    </div>
  );
}
