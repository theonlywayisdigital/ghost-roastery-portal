import { notFound } from "next/navigation";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";
import { StorefrontWholesalePage } from "./StorefrontWholesalePage";

export const dynamic = "force-dynamic";

export default async function WholesalePageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  // Fetch roaster
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      "id, business_name, brand_logo_url, storefront_slug, storefront_enabled, storefront_type, stripe_account_id, platform_fee_percent"
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  // Check storefront_type supports wholesale
  if (roaster.storefront_type !== "wholesale" && roaster.storefront_type !== "both") {
    notFound();
  }

  // Optionally check auth SSR-side for initial access state
  let initialAccess = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let products: any[] = [];

  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const { data: access } = await supabase
        .from("wholesale_access")
        .select("id, status, price_tier, payment_terms")
        .eq("user_id", user.id)
        .eq("roaster_id", roaster.id)
        .single();

      initialAccess = {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email || profile?.email || "",
          name: profile?.full_name || "",
        },
        access: access
          ? {
              id: access.id,
              status: access.status,
              priceTier: access.price_tier,
              paymentTerms: access.payment_terms,
            }
          : null,
      };

      // Only fetch products if user has approved access
      if (access?.status === "approved") {
        const { data: wholesaleProducts } = await supabase
          .from("wholesale_products")
          .select(
            `id, name, description, image_url, unit, price, sort_order,
             wholesale_price, minimum_wholesale_quantity, is_active,
             product_variants(id, weight_grams, unit, wholesale_price, is_active, channel, grind_type:roaster_grind_types(id, name))`
          )
          .eq("roaster_id", roaster.id)
          .eq("is_active", true)
          .eq("is_wholesale", true)
          .order("sort_order", { ascending: true });

        products = wholesaleProducts || [];
      }
    }
  } catch {
    // Auth check failed — user will see login form
  }

  return (
    <StorefrontWholesalePage
      roaster={{
        id: roaster.id,
        businessName: roaster.business_name,
        logoUrl: roaster.brand_logo_url,
        slug: roaster.storefront_slug,
        stripeAccountId: roaster.stripe_account_id,
        platformFeePercent: roaster.platform_fee_percent as number | null,
      }}
      products={products}
      initialAccess={initialAccess}
    />
  );
}
