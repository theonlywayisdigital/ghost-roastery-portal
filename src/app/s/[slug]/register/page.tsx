import { redirect } from "next/navigation";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function StorefrontRegisterRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ email?: string; name?: string }>;
}) {
  const { slug } = await params;
  const { email, name } = await searchParams;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("partner_roasters")
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
      redirect(`/s/${slug}`);
    }
  } catch {
    // Not authenticated — continue to register page
  }

  return (
    <RegisterForm
      slug={slug}
      roasterId={roaster.id}
      prefillEmail={email || ""}
      prefillName={name || ""}
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
