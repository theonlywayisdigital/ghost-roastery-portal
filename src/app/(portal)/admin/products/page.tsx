import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { getGRRoasterId } from "@/lib/gr-roaster";
import { AdminProductsTable } from "./AdminProductsTable";

export default async function AdminProductsPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/login");

  const roasterId = await getGRRoasterId();
  const supabase = createServerClient();

  const { data: products } = await supabase
    .from("wholesale_products")
    .select("*")
    .eq("roaster_id", roasterId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return <AdminProductsTable products={products || []} />;
}
