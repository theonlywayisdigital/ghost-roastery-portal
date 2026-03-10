import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { PricingTable } from "./PricingTable";

export default async function PricingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: calculations } = await supabase
    .from("cost_calculations")
    .select("*, green_beans(name)")
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  return <PricingTable calculations={calculations || []} />;
}
