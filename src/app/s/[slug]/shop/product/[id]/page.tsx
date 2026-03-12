import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { createAuthServerClient } from "@/lib/supabase";
import { ProductDetail } from "./ProductDetail";
import type { Product } from "../../../_components/types";

export const dynamic = "force-dynamic";

export default async function ProductDetailRoute({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = createServerClient();

  // Verify roaster
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id")
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  // Fetch product
  const { data: product } = await supabase
    .from("wholesale_products")
    .select(
      `id, name, description, price, unit, image_url, sort_order,
       is_retail, is_wholesale, retail_price, is_purchasable, retail_stock_count, track_stock,
       product_variants(id, retail_price, is_active, channel)`
    )
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .eq("status", "published")
    .single();

  if (!product) notFound();

  // Block wholesale-only products unless viewer is an approved wholesale buyer
  if (!product.is_retail && product.is_wholesale) {
    let isApprovedBuyer = false;

    try {
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        const { data: access } = await supabase
          .from("wholesale_access")
          .select("id")
          .eq("user_id", user.id)
          .eq("roaster_id", roaster.id)
          .eq("status", "approved")
          .single();
        isApprovedBuyer = !!access;
      }
    } catch {
      // Not logged in — treat as unapproved
    }

    if (!isApprovedBuyer) notFound();
  }

  // Fetch related products (same roaster, different product, public only)
  const { data: related } = await supabase
    .from("wholesale_products")
    .select(
      `id, name, description, price, unit, image_url, sort_order,
       is_retail, is_wholesale, retail_price, is_purchasable, retail_stock_count, track_stock,
       product_variants(id, retail_price, is_active, channel)`
    )
    .eq("roaster_id", roaster.id)
    .eq("status", "published")
    .eq("is_retail", true)
    .neq("id", id)
    .order("sort_order", { ascending: true })
    .limit(4);

  return (
    <ProductDetail
      product={product as Product}
      relatedProducts={(related as Product[]) || []}
    />
  );
}
