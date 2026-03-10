import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProductionTable } from "./ProductionTable";

export default async function ProductionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: plans } = await supabase
    .from("production_plans")
    .select("*, green_beans(name)")
    .eq("roaster_id", user.roaster.id)
    .order("planned_date", { ascending: true });

  return <ProductionTable plans={plans || []} />;
}
