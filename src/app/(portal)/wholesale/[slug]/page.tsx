import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { WholesaleCatalogue } from "./WholesaleCatalogue";

export const dynamic = "force-dynamic";

export default async function WholesaleCataloguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("wholesale_buyer")) redirect("/dashboard");

  const supabase = createServerClient();

  // Fetch roaster by storefront_slug
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      "id, business_name, brand_logo_url, storefront_slug, storefront_enabled, stripe_account_id, platform_fee_percent"
    )
    .eq("storefront_slug", slug)
    .single();

  if (!roaster) notFound();

  // Redirect to storefront wholesale if storefront is enabled
  if (roaster.storefront_enabled) {
    redirect(`/s/${roaster.storefront_slug}/wholesale`);
  }

  // Fetch wholesale_access record for current user
  const { data: access } = await supabase
    .from("wholesale_access")
    .select("id, price_tier, payment_terms, status")
    .eq("user_id", user.id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!access || access.status !== "approved") {
    redirect("/wholesale");
  }

  // Fetch products (wholesale or both)
  const { data: products } = await supabase
    .from("wholesale_products")
    .select(
      `id, name, description, image_url, unit, price, sort_order,
       product_type, wholesale_price, minimum_wholesale_quantity, is_active`
    )
    .eq("roaster_id", roaster.id)
    .eq("is_active", true)
    .in("product_type", ["wholesale", "both"])
    .order("sort_order", { ascending: true });

  return (
    <WholesaleCatalogue
      roaster={{
        id: roaster.id,
        businessName: roaster.business_name,
        logoUrl: roaster.brand_logo_url,
        slug: roaster.storefront_slug,
        stripeAccountId: roaster.stripe_account_id,
        platformFeePercent: roaster.platform_fee_percent as number | null,
      }}
      products={products || []}
      wholesaleAccessId={access.id}
      paymentTerms={access.payment_terms}
    />
  );
}
