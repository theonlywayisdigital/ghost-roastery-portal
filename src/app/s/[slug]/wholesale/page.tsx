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
    .from("roasters")
    .select(
      "id, business_name, brand_logo_url, brand_hero_image_url, hero_overlay_opacity, storefront_slug, storefront_enabled, storefront_type, stripe_account_id, platform_fee_percent"
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  // Check storefront_type supports wholesale
  if (roaster.storefront_type !== "wholesale" && roaster.storefront_type !== "both") {
    notFound();
  }

  // Always fetch preview products (no prices) for all visitors
  const { data: previewProducts } = await supabase
    .from("products")
    .select("id, name, description, image_url, unit, sort_order, product_images(id, url, sort_order, is_primary)")
    .eq("roaster_id", roaster.id)
    .eq("status", "published")
    .eq("is_wholesale", true)
    .order("sort_order", { ascending: true });

  // Optionally check auth SSR-side for initial access state
  let initialAccess = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fullProducts: any[] = [];
  let isApproved = false;

  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    console.log("Wholesale auth user:", user?.id, "roaster:", roaster.id);

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const { data: access, error: accessError } = await supabase
        .from("wholesale_access")
        .select("id, status, payment_terms")
        .eq("user_id", user.id)
        .eq("roaster_id", roaster.id)
        .single();

      console.log("Wholesale access result:", access, accessError);

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

      // Only fetch full product data (prices, variants) for approved users
      if (access?.status === "approved") {
        isApproved = true;
        const { data: wholesaleProducts } = await supabase
          .from("products")
          .select(
            `id, name, description, image_url, unit, price, sort_order,
             wholesale_price, minimum_wholesale_quantity, is_active, weight_grams,
             product_variants(id, weight_grams, unit, wholesale_price, is_active, channel, grind_type:roaster_grind_types(id, name)),
             roasted_stock(id, current_stock_kg, low_stock_threshold_kg),
             green_beans(id, current_stock_kg, low_stock_threshold_kg),
             product_images(id, url, sort_order, is_primary)`
          )
          .eq("roaster_id", roaster.id)
          .eq("status", "published")
          .eq("is_wholesale", true)
          .order("sort_order", { ascending: true });

        fullProducts = wholesaleProducts || [];
      }
    }
  } catch (error) {
    console.error("Wholesale auth check failed:", error);
  }

  return (
    <StorefrontWholesalePage
      roaster={{
        id: roaster.id,
        businessName: roaster.business_name,
        logoUrl: roaster.brand_logo_url,
        heroImageUrl: roaster.brand_hero_image_url,
        heroOverlayOpacity: (roaster.hero_overlay_opacity as "light" | "medium" | "dark") || "medium",
        slug: roaster.storefront_slug,
        stripeAccountId: roaster.stripe_account_id,
        platformFeePercent: roaster.platform_fee_percent as number | null,
      }}
      previewProducts={previewProducts || []}
      products={fullProducts}
      initialAccess={initialAccess}
      isApproved={isApproved}
    />
  );
}
