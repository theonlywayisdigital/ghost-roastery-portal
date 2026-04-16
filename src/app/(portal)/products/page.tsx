import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProductsTable } from "./ProductsTable";

export default async function ProductsPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const supabase = createServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("*, product_variants(id, weight_grams, unit, retail_price, wholesale_price, channel, is_active), roasted_stock(id, name, current_stock_kg, low_stock_threshold_kg, is_active, green_beans:green_beans(id, name, current_stock_kg, low_stock_threshold_kg, is_active)), product_images(id, url, sort_order, is_primary), blend_components(id, roasted_stock_id, percentage, roasted_stock:roasted_stock(id, name, current_stock_kg, low_stock_threshold_kg, is_active, green_beans:green_beans(id, name, current_stock_kg, low_stock_threshold_kg, is_active)))")
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return <ProductsTable products={products || []} />;
}
