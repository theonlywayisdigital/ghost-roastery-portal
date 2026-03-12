import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { StorefrontPage } from "./StorefrontPage";
import type { Product } from "./_components/types";

export const dynamic = "force-dynamic";

export default async function StorefrontPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  // Verify roaster exists and is enabled
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id, storefront_type")
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  // Wholesale-only storefronts skip the retail homepage
  if (roaster.storefront_type === "wholesale") {
    redirect(`/s/${slug}/wholesale`);
  }

  const { data: products } = await supabase
    .from("wholesale_products")
    .select(
      `id, name, description, price, unit, image_url, sort_order,
       is_retail, is_wholesale, retail_price, is_purchasable, retail_stock_count, track_stock,
       product_variants(id, retail_price, is_active, channel)`
    )
    .eq("roaster_id", roaster.id)
    .eq("status", "published")
    .eq("is_retail", true)
    .order("sort_order", { ascending: true });

  return <StorefrontPage products={(products as Product[]) || []} />;
}
