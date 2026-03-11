import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { WholesaleApplyPage } from "./WholesaleApplyPage";

export const dynamic = "force-dynamic";

export default async function WholesaleApplyRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      "id, business_name, brand_logo_url, brand_primary_colour, brand_accent_colour, storefront_logo_size, storefront_enabled, storefront_type"
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) redirect(`/s/${slug}`);

  if (
    roaster.storefront_type !== "wholesale" &&
    roaster.storefront_type !== "both"
  ) {
    redirect(`/s/${slug}`);
  }

  return (
    <WholesaleApplyPage
      slug={slug}
      roaster={{
        id: roaster.id,
        businessName: roaster.business_name,
        logoUrl: roaster.brand_logo_url,
        primaryColour: roaster.brand_primary_colour || "#1e293b",
        accentColour: roaster.brand_accent_colour || "#0083dc",
        logoSize: (roaster.storefront_logo_size as "small" | "medium" | "large") || "medium",
      }}
    />
  );
}
