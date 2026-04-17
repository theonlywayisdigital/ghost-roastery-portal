import { notFound } from "next/navigation";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";
import { WebsiteWholesalePage } from "./WebsiteWholesalePage";

export const dynamic = "force-dynamic";

export default async function WebsiteWholesalePageRoute({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const supabase = createServerClient();

  // Resolve roaster by custom domain or storefront slug (same as layout.tsx)
  const { data: roaster } = await supabase
    .from("roasters")
    .select(
      "id, business_name, brand_logo_url, brand_primary_colour, brand_accent_colour, storefront_slug, storefront_enabled, storefront_type, stripe_account_id, platform_fee_percent"
    )
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) notFound();

  // Check storefront_type supports wholesale
  if (roaster.storefront_type !== "wholesale" && roaster.storefront_type !== "both") {
    notFound();
  }

  // Optionally check auth SSR-side
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
        .select("id, status, payment_terms")
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
              paymentTerms: access.payment_terms,
            }
          : null,
      };

      if (access?.status === "approved") {
        const { data: wholesaleProducts } = await supabase
          .from("products")
          .select(
            `id, name, description, image_url, unit, price, sort_order,
             wholesale_price, minimum_wholesale_quantity, is_active, weight_grams, is_blend,
             product_variants(id, weight_grams, unit, wholesale_price, is_active, channel, grind_type:roaster_grind_types(id, name)),
             roasted_stock(id, current_stock_kg, low_stock_threshold_kg, green_beans:green_bean_id(id, current_stock_kg, low_stock_threshold_kg)),
             blend_components(id, percentage, roasted_stock:roasted_stock(id, current_stock_kg, low_stock_threshold_kg, green_beans:green_bean_id(id, current_stock_kg, low_stock_threshold_kg))),
             product_images(id, url, sort_order, is_primary)`
          )
          .eq("roaster_id", roaster.id)
          .eq("status", "published")
          .eq("is_wholesale", true)
          .order("sort_order", { ascending: true });

        products = wholesaleProducts || [];
      }
    }
  } catch {
    // Auth check failed
  }

  return (
    <WebsiteWholesalePage
      roaster={{
        id: roaster.id,
        businessName: roaster.business_name,
        logoUrl: roaster.brand_logo_url,
        slug: roaster.storefront_slug,
        stripeAccountId: roaster.stripe_account_id,
        platformFeePercent: roaster.platform_fee_percent as number | null,
      }}
      domain={domain}
      products={products}
      initialAccess={initialAccess}
    />
  );
}
