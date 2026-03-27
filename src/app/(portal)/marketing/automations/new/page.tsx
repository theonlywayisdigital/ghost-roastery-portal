import { getCurrentRoaster } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkFeature } from "@/lib/feature-gates";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { NewAutomationPage } from "./NewAutomationPage";

export default async function Page() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const gate = await checkFeature(roaster.id, "automations");
  if (!gate.allowed) {
    return <FeatureGate featureName="Automations" requiredTier={gate.requiredTier} productType={gate.requiredProduct} />;
  }

  return <NewAutomationPage />;
}
