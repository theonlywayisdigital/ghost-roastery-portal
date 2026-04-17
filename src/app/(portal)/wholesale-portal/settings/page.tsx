import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { StorefrontSettings } from "./StorefrontSettings";

export default async function SettingsPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  if (!roaster.storefront_setup_complete) {
    redirect("/wholesale-portal/setup");
  }

  const settingsData = {
    storefront_type: (roaster.storefront_type as string) || "wholesale",
    // minimum_wholesale_order DB column retained but setting removed — minimum order is handled per-product
    storefront_seo_title: (roaster.storefront_seo_title as string) || "",
    storefront_seo_description: (roaster.storefront_seo_description as string) || "",
    storefront_contact_email: (roaster.storefront_contact_email as string) || "",
    storefront_contact_phone: (roaster.storefront_contact_phone as string) || "",
    storefront_contact_address: (roaster.storefront_contact_address as string) || "",
    business_name: roaster.business_name as string,
  };

  return <StorefrontSettings settings={settingsData} />;
}
