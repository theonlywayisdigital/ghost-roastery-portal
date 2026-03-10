import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { StorefrontSettings } from "./StorefrontSettings";

export default async function SettingsPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  if (!roaster.storefront_setup_complete) {
    redirect("/storefront/setup");
  }

  const settingsData = {
    storefront_type: (roaster.storefront_type as string) || "wholesale",
    minimum_wholesale_order: (roaster.minimum_wholesale_order as number) || 1,
    storefront_seo_title: (roaster.storefront_seo_title as string) || "",
    storefront_seo_description: (roaster.storefront_seo_description as string) || "",
    business_name: roaster.business_name as string,
  };

  return <StorefrontSettings settings={settingsData} />;
}
