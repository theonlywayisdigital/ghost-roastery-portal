import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProductionForm } from "../ProductionForm";

export default async function EditProductionPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: plan }, { data: beans }, { data: products }] = await Promise.all([
    supabase
      .from("production_plans")
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
      .from("products")
      .select("id, name")
      .eq("roaster_id", user.roaster.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  if (!plan) notFound();

  // Convert numeric fields to strings for the form
  const formData = {
    ...plan,
    planned_date: plan.planned_date || "",
    green_bean_id: plan.green_bean_id || "",
    green_bean_name: plan.green_bean_name || "",
    planned_weight_kg: plan.planned_weight_kg != null ? String(plan.planned_weight_kg) : "",
    expected_loss_percent: plan.expected_loss_percent != null ? String(plan.expected_loss_percent) : "15",
    product_id: plan.product_id || "",
    priority: plan.priority != null ? String(plan.priority) : "0",
    notes: plan.notes || "",
    status: plan.status || "planned",
  };

  return <ProductionForm plan={formData} beans={beans || []} products={products || []} />;
}
