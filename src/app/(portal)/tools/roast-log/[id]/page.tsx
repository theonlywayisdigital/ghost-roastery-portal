import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { RoastLogForm } from "../RoastLogForm";

export default async function EditRoastLogPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: roastLog }, { data: beans }, { data: products }] = await Promise.all([
    supabase
      .from("roast_logs")
      .select("*")
      .eq("id", id)
      .eq("roaster_id", user.roaster.id)
      .single(),
    supabase
      .from("green_beans")
      .select("id, name")
      .eq("roaster_id", user.roaster.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("wholesale_products")
      .select("id, name")
      .eq("roaster_id", user.roaster.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  if (!roastLog) notFound();

  // Convert numeric fields to strings for the form
  const formData = {
    ...roastLog,
    roast_date: roastLog.roast_date || "",
    roast_number: roastLog.roast_number || "",
    green_bean_id: roastLog.green_bean_id || "",
    green_bean_name: roastLog.green_bean_name || "",
    green_weight_kg: roastLog.green_weight_kg != null ? String(roastLog.green_weight_kg) : "",
    roasted_weight_kg: roastLog.roasted_weight_kg != null ? String(roastLog.roasted_weight_kg) : "",
    roast_level: roastLog.roast_level || "",
    roast_time_seconds: roastLog.roast_time_seconds != null ? String(roastLog.roast_time_seconds) : "",
    charge_temp_c: roastLog.charge_temp_c != null ? String(roastLog.charge_temp_c) : "",
    first_crack_time_seconds: roastLog.first_crack_time_seconds != null ? String(roastLog.first_crack_time_seconds) : "",
    first_crack_temp_c: roastLog.first_crack_temp_c != null ? String(roastLog.first_crack_temp_c) : "",
    second_crack_time_seconds: roastLog.second_crack_time_seconds != null ? String(roastLog.second_crack_time_seconds) : "",
    second_crack_temp_c: roastLog.second_crack_temp_c != null ? String(roastLog.second_crack_temp_c) : "",
    drop_temp_c: roastLog.drop_temp_c != null ? String(roastLog.drop_temp_c) : "",
    roaster_machine: roastLog.roaster_machine || "",
    operator: roastLog.operator || "",
    ambient_temp_c: roastLog.ambient_temp_c != null ? String(roastLog.ambient_temp_c) : "",
    ambient_humidity_percent: roastLog.ambient_humidity_percent != null ? String(roastLog.ambient_humidity_percent) : "",
    quality_rating: roastLog.quality_rating != null ? String(roastLog.quality_rating) : "",
    notes: roastLog.notes || "",
    product_id: roastLog.product_id || "",
    status: roastLog.status || "draft",
  };

  return <RoastLogForm roastLog={formData} beans={beans || []} products={products || []} />;
}
