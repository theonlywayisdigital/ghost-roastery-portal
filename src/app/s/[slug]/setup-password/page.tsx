import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { SetupPasswordForm } from "./SetupPasswordForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function StorefrontSetupPasswordPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { token } = await searchParams;

  const supabase = createServerClient();

  // Verify roaster exists and storefront is enabled
  const { data: roaster } = await supabase
    .from("roasters")
    .select(
      "id, business_name, brand_logo_url, brand_primary_colour, brand_accent_colour, storefront_logo_size, storefront_enabled, storefront_type"
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) redirect(`/s/${slug}`);

  // Validate token
  let valid = false;

  if (token) {
    const { data } = await supabase
      .from("account_setup_tokens")
      .select("id, expires_at, used_at")
      .eq("token", token)
      .single();

    if (data && !data.used_at && new Date(data.expires_at) > new Date()) {
      valid = true;
    }
  }

  return (
    <SetupPasswordForm
      slug={slug}
      token={token || null}
      valid={valid}
      roaster={{
        businessName: roaster.business_name,
        logoUrl: roaster.brand_logo_url,
        primaryColour: roaster.brand_primary_colour || "#1e293b",
        accentColour: roaster.brand_accent_colour || "#0083dc",
        logoSize:
          (roaster.storefront_logo_size as "small" | "medium" | "large") ||
          "medium",
      }}
    />
  );
}
