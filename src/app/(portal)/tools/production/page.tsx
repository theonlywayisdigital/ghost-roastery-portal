import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProductionPlanner } from "./ProductionPlanner";

export default async function ProductionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: plans } = await supabase
    .from("production_plans")
    .select("*, green_beans(name), roasted_stock(name)")
    .eq("roaster_id", user.roaster.id)
    .in("status", ["planned", "in_progress"])
    .order("planned_date", { ascending: true });

  return <ProductionPlanner initialPlans={plans || []} />;
}
