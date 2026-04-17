import { createServerClient } from "@/lib/supabase";
import { EmbedWholesaleApply } from "./EmbedWholesaleApply";

export const dynamic = "force-dynamic";

// Renders nothing for embeds when the roaster is missing, inactive, or misconfigured.
// This prevents a deleted roaster's slug from accidentally rendering a new roaster's form.
function EmptyEmbed() {
  return <div />;
}

export default async function EmbedWholesaleApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("roasters")
    .select(
      `id, business_name, brand_accent_colour, storefront_slug, storefront_enabled, storefront_type, is_active, embed_settings`
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .eq("is_active", true)
    .single();

  // No roaster, inactive, or storefront disabled — render nothing
  if (!roaster) return <EmptyEmbed />;

  // Only show if storefront is wholesale or both
  if (roaster.storefront_type !== "wholesale" && roaster.storefront_type !== "both") {
    return <EmptyEmbed />;
  }

  const accent = roaster.brand_accent_colour || "#0083dc";
  const embedSettings = (roaster.embed_settings as Record<string, unknown>) || {};

  return (
    <EmbedWholesaleApply
      roasterId={roaster.id}
      slug={roaster.storefront_slug}
      accentColour={accent}
      accentText={isLightColour(accent) ? "#1e293b" : "#ffffff"}
      embedSettings={embedSettings}
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
