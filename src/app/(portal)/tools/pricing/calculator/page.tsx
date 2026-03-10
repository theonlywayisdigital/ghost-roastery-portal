import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { CostCalculator } from "./CostCalculator";

export default async function CostCalculatorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: greenBeans } = await supabase
    .from("green_beans")
    .select("id, name, cost_per_kg")
    .eq("roaster_id", user.roaster.id)
    .eq("is_active", true)
    .order("name");

  return <CostCalculator greenBeans={greenBeans || []} />;
}
