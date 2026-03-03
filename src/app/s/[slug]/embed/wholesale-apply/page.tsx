import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { EmbedWholesaleApply } from "./EmbedWholesaleApply";

export const dynamic = "force-dynamic";

export default async function EmbedWholesaleApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      `id, business_name, brand_accent_colour, storefront_slug, storefront_enabled, storefront_type`
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  // Only show if storefront is wholesale or both
  if (roaster.storefront_type !== "wholesale" && roaster.storefront_type !== "both") {
    notFound();
  }

  const accent = roaster.brand_accent_colour || "#0083dc";

  return (
    <EmbedWholesaleApply
      roasterId={roaster.id}
      slug={roaster.storefront_slug}
      accentColour={accent}
      accentText={isLightColour(accent) ? "#1e293b" : "#ffffff"}
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
