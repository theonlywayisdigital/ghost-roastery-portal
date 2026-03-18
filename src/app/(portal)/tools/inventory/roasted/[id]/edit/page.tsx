import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { RoastedStockForm } from "../../../../roasted-stock/RoastedStockForm";

export default async function EditRoastedStockPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: stock }, { data: greenBeans }] = await Promise.all([
    supabase.from("roasted_stock").select("*").eq("id", id).eq("roaster_id", user.roaster.id).single(),
    supabase.from("green_beans").select("id, name").eq("roaster_id", user.roaster.id).eq("is_active", true).order("name"),
  ]);

  if (!stock) notFound();

  const formData = {
    id: stock.id,
    name: stock.name || "",
    green_bean_id: stock.green_bean_id || "",
    current_stock_kg: String(stock.current_stock_kg || ""),
    low_stock_threshold_kg: stock.low_stock_threshold_kg ? String(stock.low_stock_threshold_kg) : "",
    batch_size_kg: stock.batch_size_kg ? String(stock.batch_size_kg) : "",
    notes: stock.notes || "",
    is_active: stock.is_active ?? true,
  };

  return <RoastedStockForm stock={formData} greenBeans={greenBeans || []} />;
}
