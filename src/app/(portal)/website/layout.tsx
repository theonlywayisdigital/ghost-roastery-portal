import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { FeatureGate } from "@/components/shared/FeatureGate";

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const isActive = user.roaster.website_subscription_active === true;

  if (!isActive) {
    return (
      <FeatureGate
        featureName="Website Builder"
        requiredTier="growth"
        productType="website"
      />
    );
  }

  return <>{children}</>;
}
