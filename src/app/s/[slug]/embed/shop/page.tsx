import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { RETAIL_ENABLED } from "@/lib/feature-flags";
import { EmbedShop } from "./EmbedShop";

export const dynamic = "force-dynamic";

export default async function EmbedShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Embed shop is unavailable when retail is disabled
  if (!RETAIL_ENABLED) {
    redirect(`/s/${slug}/wholesale`);
  }

  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      `id, business_name, brand_logo_url, brand_primary_colour,
       brand_accent_colour, brand_heading_font, storefront_slug,
       storefront_enabled, retail_enabled, stripe_account_id,
       storefront_button_style`
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  const { data: products } = await supabase
    .from("products")
    .select(
      `id, name, origin, tasting_notes, description, price, unit, image_url, sort_order,
       is_retail, is_wholesale, retail_price, is_purchasable, retail_stock_count, track_stock,
       product_images(id, url, sort_order, is_primary)`
    )
    .eq("roaster_id", roaster.id)
    .eq("is_active", true)
    .eq("is_retail", true)
    .order("sort_order", { ascending: true });

  return (
    <EmbedShop
      roaster={{
        id: roaster.id,
        businessName: roaster.business_name,
        slug: roaster.storefront_slug,
        accentColour: roaster.brand_accent_colour || "#0083dc",
        accentText: isLightColour(roaster.brand_accent_colour || "#0083dc") ? "#1e293b" : "#ffffff",
        buttonStyle: (roaster.storefront_button_style as "sharp" | "rounded" | "pill") || "rounded",
        retailEnabled: roaster.retail_enabled && !!roaster.stripe_account_id,
      }}
      products={products || []}
    />
  );
}

function isLightColour(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
