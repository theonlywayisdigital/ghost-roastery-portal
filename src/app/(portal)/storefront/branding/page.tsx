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
    storefront_logo_size: (roaster.storefront_logo_size as "small" | "medium" | "large") || "medium",
    business_name: roaster.business_name as string,
    storefront_nav_colour: (roaster.storefront_nav_colour as string) || "",
    storefront_nav_text_colour: (roaster.storefront_nav_text_colour as string) || "",
    storefront_button_colour: (roaster.storefront_button_colour as string) || "",
    storefront_button_text_colour: (roaster.storefront_button_text_colour as string) || "",
    storefront_bg_colour: (roaster.storefront_bg_colour as string) || "",
    storefront_text_colour: (roaster.storefront_text_colour as string) || "",
    storefront_button_style: (roaster.storefront_button_style as "sharp" | "rounded" | "pill") || "rounded",
    storefront_nav_fixed: (roaster.storefront_nav_fixed as boolean) ?? true,
  };

  return <BrandingEditor branding={brandingData} />;
}
