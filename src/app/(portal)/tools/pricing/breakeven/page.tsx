import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";
import { BreakevenCalculator } from "./BreakevenCalculator";
import Link from "next/link";

export default async function BreakevenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const featureCheck = await checkFeature(user.roaster.id as string, "toolsBreakeven");

  if (!featureCheck.allowed) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Break-even Calculator</h1>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-3 bg-amber-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <span className="text-amber-600 text-xl">&#128274;</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Upgrade Required</h2>
            <p className="text-sm text-slate-500 mb-4">{featureCheck.message}</p>
            <Link
              href="/settings/billing?tab=subscription"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              Upgrade Plan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = createServerClient();
  const { data: calculations } = await supabase
    .from("breakeven_calculations")
    .select("*")
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  return <BreakevenCalculator calculations={calculations || []} />;
}
