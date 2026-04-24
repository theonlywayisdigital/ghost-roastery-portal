import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { RoastedStockTable } from "../_components/roasted-stock/RoastedStockTable";

export default async function InventoryRoastedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: stock } = await supabase
    .from("roasted_stock")
    .select("*, green_bean_id, green_beans(name), products(id, name), blend_components(product_id, products(id, name))")
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  return <RoastedStockTable stock={stock || []} />;
}
