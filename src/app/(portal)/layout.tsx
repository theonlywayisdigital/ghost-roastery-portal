import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { PastDueBanner } from "@/components/PastDueBanner";
import { TrialBanner } from "@/components/TrialBanner";

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

  // Lockout: inactive/unsubscribed roasters are redirected to billing
  const isRoaster = user.roles.includes("roaster");
  const isAdmin = user.roles.includes("admin");
  if (isRoaster && !isAdmin) {
    const activeStatuses = ["active", "past_due", "trialing", "cancelling"];
    const hasActiveSubscription = subscriptionStatus && activeStatuses.includes(subscriptionStatus);

    if (!hasActiveSubscription) {
      const headersList = await headers();
      const pathname = headersList.get("x-pathname") || headersList.get("x-next-pathname") || "";
      const allowedPaths = ["/settings/billing", "/settings/profile", "/api/"];
      const isAllowedPath = allowedPaths.some((p) => pathname.startsWith(p));

      if (!isAllowedPath && !pathname.startsWith("/settings/billing")) {
        redirect("/settings/billing?tab=subscription&subscribe=true");
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {subscriptionStatus === "past_due" && <PastDueBanner />}
      {subscriptionStatus === "trialing" && (
        <TrialBanner trialEndsAt={(user.roaster?.trial_ends_at as string) || null} />
      )}

      <Sidebar
        user={{
          email: user.email,
          fullName: user.fullName,
          roles: user.roles,
          businessName: user.roaster?.business_name || null,
          isGhostRoaster: user.roaster?.is_ghost_roaster || false,
          salesTier: (user.roaster?.sales_tier as string) || "growth",
          marketingTier: (user.roaster?.marketing_tier as string) || "growth",
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
