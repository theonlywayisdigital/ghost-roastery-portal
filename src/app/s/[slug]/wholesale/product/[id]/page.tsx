import { notFound } from "next/navigation";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";
import { WholesaleProductDetail } from "./WholesaleProductDetail";

export const dynamic = "force-dynamic";

export default async function WholesaleProductDetailRoute({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = createServerClient();

  // Verify roaster
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      "id, business_name, brand_logo_url, storefront_slug, storefront_enabled, storefront_type, stripe_account_id, platform_fee_percent"
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  // Must support wholesale
  if (roaster.storefront_type !== "wholesale" && roaster.storefront_type !== "both") {
    notFound();
  }

  // Auth check — only approved wholesale buyers can view
  let wholesaleAccessId: string | null = null;
  let paymentTerms = "prepay";

  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (user) {
      const { data: access } = await supabase
        .from("wholesale_access")
        .select("id, status, payment_terms")
        .eq("user_id", user.id)
        .eq("roaster_id", roaster.id)
        .eq("status", "approved")
        .single();

      if (access) {
        wholesaleAccessId = access.id;
        paymentTerms = access.payment_terms;
      }
    }
  } catch {
    // Not logged in
  }

  if (!wholesaleAccessId) {
    // Not an approved buyer — redirect to wholesale landing
    notFound();
  }

  // Fetch product with wholesale variants, stock pools, and images
  const { data: product } = await supabase
    .from("products")
    .select(
      `id, name, category, origin, tasting_notes, description, price, unit, image_url, sort_order,
       wholesale_price, minimum_wholesale_quantity, weight_grams,
       product_variants(id, weight_grams, unit, wholesale_price, is_active, channel, grind_type:roaster_grind_types(id, name)),
       roasted_stock(id, current_stock_kg, low_stock_threshold_kg),
       green_beans(id, current_stock_kg, low_stock_threshold_kg),
       product_images(id, url, sort_order, is_primary)`
    )
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .eq("status", "published")
    .eq("is_wholesale", true)
    .single();

  if (!product) notFound();

  // Fetch related wholesale products
  const { data: related } = await supabase
    .from("products")
    .select(
      `id, name, category, origin, tasting_notes, description, image_url, unit, price, sort_order,
       wholesale_price, minimum_wholesale_quantity, weight_grams,
       product_variants(id, weight_grams, unit, wholesale_price, is_active, channel, grind_type:roaster_grind_types(id, name)),
       roasted_stock(id, current_stock_kg, low_stock_threshold_kg),
       green_beans(id, current_stock_kg, low_stock_threshold_kg),
       product_images(id, url, sort_order, is_primary)`
    )
    .eq("roaster_id", roaster.id)
    .eq("status", "published")
    .eq("is_wholesale", true)
    .neq("id", id)
    .order("sort_order", { ascending: true })
    .limit(4);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <WholesaleProductDetail
      product={product as any}
      relatedProducts={(related as any) || []}
      roaster={{
        id: roaster.id,
        businessName: roaster.business_name,
        slug: roaster.storefront_slug,
        stripeAccountId: roaster.stripe_account_id,
        platformFeePercent: roaster.platform_fee_percent as number | null,
      }}
      wholesaleAccessId={wholesaleAccessId}
      paymentTerms={paymentTerms}
    />
  );
}
