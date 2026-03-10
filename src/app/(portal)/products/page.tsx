import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProductsTable } from "./ProductsTable";

export default async function ProductsPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const supabase = createServerClient();
  const { data: products } = await supabase
    .from("wholesale_products")
    .select("*, product_variants(id, weight_grams, unit, retail_price, wholesale_price, channel, is_active)")
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return <ProductsTable products={products || []} />;
}
