import { notFound } from "next/navigation";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";
import { WholesaleProductDetail } from "@/app/s/[slug]/wholesale/product/[id]/WholesaleProductDetail";

export const dynamic = "force-dynamic";

export default async function WebsiteWholesaleProductDetailRoute({
  params,
}: {
  params: Promise<{ domain: string; id: string }>;
}) {
  const { domain, id } = await params;
  const supabase = createServerClient();

  // Resolve roaster by custom domain or storefront slug
  const { data: roaster } = await supabase
    .from("roasters")
    .select(
      "id, business_name, brand_logo_url, storefront_slug, storefront_enabled, storefront_type, stripe_account_id, platform_fee_percent"
    )
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) notFound();

  if (roaster.storefront_type !== "wholesale" && roaster.storefront_type !== "both") {
    notFound();
  }

  // Auth check — only approved wholesale buyers
  let wholesaleAccessId: string | null = null;
  let paymentTerms = "net30";

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

  if (!wholesaleAccessId) notFound();

  // Fetch product
  const { data: product } = await supabase
    .from("products")
    .select(
      `id, name, category, origin, tasting_notes, description, price, unit, image_url, sort_order,
       wholesale_price, minimum_wholesale_quantity, weight_grams, is_blend,
       product_variants(id, weight_grams, unit, wholesale_price, is_active, channel, grind_type:roaster_grind_types(id, name)),
       roasted_stock(id, current_stock_kg, low_stock_threshold_kg, green_beans:green_bean_id(id, current_stock_kg, low_stock_threshold_kg)),
       blend_components(id, percentage, roasted_stock:roasted_stock(id, current_stock_kg, low_stock_threshold_kg, green_beans:green_bean_id(id, current_stock_kg, low_stock_threshold_kg))),
       product_images(id, url, sort_order, is_primary)`
    )
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .eq("status", "published")
    .eq("is_wholesale", true)
    .single();

  if (!product) notFound();

  // Related wholesale products
  const { data: related } = await supabase
    .from("products")
    .select(
      `id, name, category, origin, tasting_notes, description, image_url, unit, price, sort_order,
       wholesale_price, minimum_wholesale_quantity, weight_grams, is_blend,
       product_variants(id, weight_grams, unit, wholesale_price, is_active, channel, grind_type:roaster_grind_types(id, name)),
       roasted_stock(id, current_stock_kg, low_stock_threshold_kg, green_beans:green_bean_id(id, current_stock_kg, low_stock_threshold_kg)),
       blend_components(id, percentage, roasted_stock:roasted_stock(id, current_stock_kg, low_stock_threshold_kg, green_beans:green_bean_id(id, current_stock_kg, low_stock_threshold_kg))),
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
