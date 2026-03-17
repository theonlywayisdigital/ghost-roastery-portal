import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { StorefrontProducts } from "./StorefrontProducts";

export default async function StorefrontProductsPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  if (!roaster.storefront_setup_complete) {
    redirect("/wholesale-portal/setup");
  }

  const supabase = createServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("*, product_variants(id, retail_price, wholesale_price, is_active, unit, channel)")
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return <StorefrontProducts products={products || []} />;
}
