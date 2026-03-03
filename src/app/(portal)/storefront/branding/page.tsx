import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { BrandingEditor } from "./BrandingEditor";

export default async function BrandingPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  if (!roaster.storefront_setup_complete) {
    redirect("/storefront/setup");
  }

  const brandingData = {
    storefront_slug: roaster.storefront_slug as string,
    storefront_enabled: roaster.storefront_enabled as boolean,
    brand_logo_url: (roaster.brand_logo_url as string) || "",
    brand_primary_colour: (roaster.brand_primary_colour as string) || "#1A1A1A",
    brand_accent_colour: (roaster.brand_accent_colour as string) || "#D97706",
    brand_heading_font: (roaster.brand_heading_font as string) || "inter",
    brand_body_font: (roaster.brand_body_font as string) || "inter",
    brand_tagline: (roaster.brand_tagline as string) || "",
    brand_hero_image_url: (roaster.brand_hero_image_url as string) || "",
    brand_about: (roaster.brand_about as string) || "",
    brand_instagram: (roaster.brand_instagram as string) || "",
    brand_facebook: (roaster.brand_facebook as string) || "",
    brand_tiktok: (roaster.brand_tiktok as string) || "",
    storefront_type: (roaster.storefront_type as string) || "wholesale",
    minimum_wholesale_order: (roaster.minimum_wholesale_order as number) || 1,
    storefront_seo_title: (roaster.storefront_seo_title as string) || "",
    storefront_seo_description: (roaster.storefront_seo_description as string) || "",
    business_name: roaster.business_name as string,
  };

  return <BrandingEditor branding={brandingData} />;
}
