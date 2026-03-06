import { getCurrentRoaster } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkFeature } from "@/lib/feature-gates";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { PostDetail } from "./PostDetail";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const gate = await checkFeature(roaster.id, "socialScheduling");
  if (!gate.allowed) {
    return <FeatureGate featureName="Social Scheduling" requiredTier={gate.requiredTier} productType={gate.requiredProduct} />;
  }

  const { id } = await params;
  return <PostDetail postId={id} />;
}
