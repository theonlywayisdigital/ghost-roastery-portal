import { getCurrentRoaster } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkFeature } from "@/lib/feature-gates";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { AutomationDetail } from "./AutomationDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const gate = await checkFeature(roaster.id, "automations");
  if (!gate.allowed) {
    return <FeatureGate featureName="Automations" requiredTier={gate.requiredTier} productType={gate.requiredProduct} />;
  }

  const { id } = await params;
  return <AutomationDetail automationId={id} />;
}
