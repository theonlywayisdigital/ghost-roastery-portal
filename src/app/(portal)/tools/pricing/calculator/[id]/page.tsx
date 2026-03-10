import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { CostCalculator } from "../CostCalculator";

export default async function EditCalculationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: calculation }, { data: greenBeans }] = await Promise.all([
    supabase
      .from("cost_calculations")
      .select("*")
      .eq("id", id)
      .eq("roaster_id", user.roaster.id)
      .single(),
    supabase
      .from("green_beans")
      .select("id, name, cost_per_kg")
      .eq("roaster_id", user.roaster.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  if (!calculation) notFound();

  // Map DB record to form shape (numbers to strings for form inputs)
  const formData = {
    id: calculation.id,
    name: calculation.name || "",
    green_bean_id: calculation.green_bean_id || "",
    green_cost_per_kg: calculation.green_cost_per_kg != null ? String(calculation.green_cost_per_kg) : "",
    roast_loss_percent: calculation.roast_loss_percent != null ? String(calculation.roast_loss_percent) : "15",
    labour_cost_per_hour: calculation.labour_cost_per_hour != null ? String(calculation.labour_cost_per_hour) : "",
    roast_time_minutes: calculation.roast_time_minutes != null ? String(calculation.roast_time_minutes) : "",
    packaging_cost_per_unit: calculation.packaging_cost_per_unit != null ? String(calculation.packaging_cost_per_unit) : "",
    label_cost_per_unit: calculation.label_cost_per_unit != null ? String(calculation.label_cost_per_unit) : "",
    overhead_per_unit: calculation.overhead_per_unit != null ? String(calculation.overhead_per_unit) : "",
    bag_weight_grams: calculation.bag_weight_grams != null ? String(calculation.bag_weight_grams) : "250",
    target_retail_margin_percent: calculation.target_retail_margin_percent != null ? String(calculation.target_retail_margin_percent) : "50",
    target_wholesale_margin_percent: calculation.target_wholesale_margin_percent != null ? String(calculation.target_wholesale_margin_percent) : "30",
    product_id: calculation.product_id || "",
    notes: calculation.notes || "",
    is_template: calculation.is_template ?? false,
  };

  return <CostCalculator greenBeans={greenBeans || []} calculation={formData} />;
}
