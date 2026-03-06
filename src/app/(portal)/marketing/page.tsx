import { getCurrentRoaster } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkFeature } from "@/lib/feature-gates";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { ContentCalendar } from "./ContentCalendar";

export default async function MarketingPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const gate = await checkFeature(roaster.id, "contentCalendar");
  if (!gate.allowed) {
    return <FeatureGate featureName="Content Calendar" requiredTier={gate.requiredTier} productType={gate.requiredProduct} />;
  }

  return <ContentCalendar />;
}
