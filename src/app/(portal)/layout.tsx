import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { PastDueBanner } from "@/components/PastDueBanner";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const subscriptionStatus = (user.roaster?.subscription_status as string) || null;

  return (
    <div className="min-h-screen bg-slate-50">
      {subscriptionStatus === "past_due" && <PastDueBanner />}

      <Sidebar
        user={{
          email: user.email,
          fullName: user.fullName,
          roles: user.roles,
          businessName: user.roaster?.business_name || null,
          isGhostRoaster: user.roaster?.is_ghost_roaster || false,
          salesTier: (user.roaster?.sales_tier as string) || "free",
          marketingTier: (user.roaster?.marketing_tier as string) || "free",
          subscriptionStatus,
          websiteSubscriptionActive: (user.roaster?.website_subscription_active as boolean) ?? false,
        }}
      />

      {/* Main content area */}
      <div className="lg:pl-64">
        <main className="p-6 lg:p-8 pt-16 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
