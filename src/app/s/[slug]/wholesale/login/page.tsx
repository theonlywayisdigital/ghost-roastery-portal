import { redirect } from "next/navigation";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";
import { WholesaleLoginPage } from "./WholesaleLoginPage";

export const dynamic = "force-dynamic";

export default async function WholesaleLoginRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("roasters")
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

  // Check if user is already authenticated → redirect to wholesale
  // (the wholesale page gate will handle pending/rejected states)
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (user) {
      redirect(`/s/${slug}/wholesale`);
    }
  } catch {
    // Not authenticated — continue to login page
  }

  return (
    <WholesaleLoginPage
      slug={slug}
      roaster={{
        businessName: roaster.business_name,
        logoUrl: roaster.brand_logo_url,
        primaryColour: roaster.brand_primary_colour || "#1e293b",
        accentColour: roaster.brand_accent_colour || "#0083dc",
        logoSize: (roaster.storefront_logo_size as "small" | "medium" | "large") || "medium",
      }}
    />
  );
}
