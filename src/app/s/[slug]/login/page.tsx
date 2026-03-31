import { redirect } from "next/navigation";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";
import { StorefrontLoginPage } from "./StorefrontLoginPage";

export const dynamic = "force-dynamic";

export default async function StorefrontLoginRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { slug } = await params;
  const { redirect: redirectTo } = await searchParams;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("roasters")
    .select(
      "id, business_name, brand_logo_url, brand_primary_colour, brand_accent_colour, storefront_logo_size, storefront_enabled"
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) redirect("/");

  // Check if user is already authenticated → redirect
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (user) {
      redirect(redirectTo || `/s/${slug}`);
    }
  } catch {
    // Not authenticated — continue to login page
  }

  return (
    <StorefrontLoginPage
      slug={slug}
      redirectTo={redirectTo || null}
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
