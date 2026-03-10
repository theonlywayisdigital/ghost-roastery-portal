import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { GreenBeansTable } from "./GreenBeansTable";

export default async function GreenBeansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: beans } = await supabase
    .from("green_beans")
    .select("*, suppliers(name)")
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  return <GreenBeansTable beans={beans || []} />;
}
