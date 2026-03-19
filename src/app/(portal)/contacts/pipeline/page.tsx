import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { checkFeature } from "@/lib/feature-gates";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { PipelineBoard } from "@/components/shared/pipeline";

export default async function PipelinePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const gate = await checkFeature(user.roaster.id, "pipeline");
  if (!gate.allowed) {
    return (
      <FeatureGate
        featureName="Sales Pipeline"
        requiredTier={gate.requiredTier}
        productType={gate.requiredProduct}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sales Pipeline</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track your leads through the sales process
        </p>
      </div>

      <PipelineBoard
        apiBase="/api/contacts"
        detailBase="/contacts"
        businessDetailBase="/businesses"
        stagesSettingsHref="/settings/pipeline-stages"
      />
    </div>
  );
}
