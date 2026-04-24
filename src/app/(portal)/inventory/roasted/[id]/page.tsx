import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { RoastedStockDetail } from "../../_components/roasted-stock/[id]/RoastedStockDetail";

export default async function RoastedStockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: stock }, { data: movements }] = await Promise.all([
    supabase.from("roasted_stock").select("*, green_beans(id, name, current_stock_kg)").eq("id", id).eq("roaster_id", user.roaster.id).single(),
    supabase.from("roasted_stock_movements").select("*").eq("roasted_stock_id", id).eq("roaster_id", user.roaster.id).order("created_at", { ascending: false }).limit(50),
  ]);

  if (!stock) notFound();

  return <RoastedStockDetail stock={stock} movements={movements || []} />;
}
