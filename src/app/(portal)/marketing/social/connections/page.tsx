import { Suspense } from "react";
import { getCurrentRoaster } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkFeature } from "@/lib/feature-gates";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { ConnectionsPage } from "./ConnectionsPage";
import { Loader2 } from "@/components/icons";

export default async function ConnectionsRoute() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const gate = await checkFeature(roaster.id, "socialScheduling");
  if (!gate.allowed) {
    return <FeatureGate featureName="Social Scheduling" requiredTier={gate.requiredTier} productType={gate.requiredProduct} />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      }
    >
      <ConnectionsPage />
    </Suspense>
  );
}
