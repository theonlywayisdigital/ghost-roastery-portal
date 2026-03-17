import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { StorefrontTabs } from "./StorefrontTabs";
import { WebsiteBuilderBanner } from "./WebsiteBuilderBanner";
import { RETAIL_ENABLED } from "@/lib/feature-flags";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const isSetupComplete = roaster.storefront_setup_complete as boolean;
  const slug = roaster.storefront_slug as string | null;

  // Check if roaster already has a website
  const supabase = createServerClient();
  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("roaster_id", roaster.id)
    .maybeSingle();

  const hasWebsite = !!website;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{RETAIL_ENABLED ? "My Storefront" : "Wholesale Portal"}</h1>
        {isSetupComplete && slug && (
          <p className="text-sm text-slate-500 mt-1">
            {slug}.ghostroastery.com
          </p>
        )}
      </div>

      {isSetupComplete && !hasWebsite && <WebsiteBuilderBanner />}

      {isSetupComplete && <StorefrontTabs />}

      {children}
    </div>
  );
}
