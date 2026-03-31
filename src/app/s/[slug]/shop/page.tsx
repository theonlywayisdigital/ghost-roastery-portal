import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { RETAIL_ENABLED } from "@/lib/feature-flags";
import { ShopPage } from "./ShopPage";
import type { Product } from "../_components/types";

export const dynamic = "force-dynamic";

export default async function ShopPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("roasters")
    .select("id, storefront_type")
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  // Retail shop is unavailable when retail is disabled or storefront is wholesale-only
  if (!RETAIL_ENABLED || roaster.storefront_type === "wholesale") {
    redirect(`/s/${slug}/wholesale`);
  }

  const { data: products } = await supabase
    .from("products")
    .select(
      `id, name, category, origin, tasting_notes, description, price, unit, image_url, sort_order,
       is_retail, is_wholesale, retail_price, is_purchasable, retail_stock_count, track_stock,
       product_variants(id, retail_price, is_active, channel),
       product_images(id, url, sort_order, is_primary)`
    )
    .eq("roaster_id", roaster.id)
    .eq("status", "published")
    .eq("is_retail", true)
    .order("sort_order", { ascending: true });

  return <ShopPage products={(products as Product[]) || []} />;
}
