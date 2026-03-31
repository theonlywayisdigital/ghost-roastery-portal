import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { GreenBeanForm } from "../../../../green-beans/GreenBeanForm";

export default async function EditGreenBeanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: bean }, { data: suppliers }] = await Promise.all([
    supabase.from("green_beans").select("*").eq("id", id).eq("roaster_id", user.roaster.id).single(),
    supabase.from("suppliers").select("id, name").eq("roaster_id", user.roaster.id).eq("is_active", true).order("name"),
  ]);

  if (!bean) notFound();

  const formData = {
    id: bean.id,
    name: bean.name || "",
    origin_country: bean.origin_country || "",
    origin_region: bean.origin_region || "",
    variety: bean.variety || "",
    process: bean.process || "",
    lot_number: bean.lot_number || "",
    supplier_id: bean.supplier_id || "",
    arrival_date: bean.arrival_date || "",
    cost_per_kg: bean.cost_per_kg ? String(bean.cost_per_kg) : "",
    cupping_score: bean.cupping_score ? String(bean.cupping_score) : "",
    tasting_notes: bean.tasting_notes || "",
    altitude_masl: bean.altitude_masl ? String(bean.altitude_masl) : "",
    harvest_year: bean.harvest_year || "",
    current_stock_kg: String(bean.current_stock_kg || ""),
    low_stock_threshold_kg: bean.low_stock_threshold_kg ? String(bean.low_stock_threshold_kg) : "",
    notes: bean.notes || "",
    is_active: bean.is_active ?? true,
  };

  return <GreenBeanForm bean={formData} suppliers={suppliers || []} />;
}
