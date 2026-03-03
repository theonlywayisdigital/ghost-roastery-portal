import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
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
    .from("partner_roasters")
    .select("id")
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  const { data: products } = await supabase
    .from("wholesale_products")
    .select(
      `id, name, description, price, unit, image_url, sort_order,
       product_type, retail_price, is_purchasable, retail_stock_count, track_stock`
    )
    .eq("roaster_id", roaster.id)
    .eq("is_active", true)
    .in("product_type", ["retail", "both"])
    .order("sort_order", { ascending: true });

  return <ShopPage products={(products as Product[]) || []} />;
}
