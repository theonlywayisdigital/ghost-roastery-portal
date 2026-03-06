import { getCurrentRoaster } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkFeature } from "@/lib/feature-gates";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { SocialDashboard } from "./SocialDashboard";

export default async function SocialPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const gate = await checkFeature(roaster.id, "socialScheduling");
  if (!gate.allowed) {
    return <FeatureGate featureName="Social Scheduling" requiredTier={gate.requiredTier} productType={gate.requiredProduct} />;
  }

  return <SocialDashboard />;
}
