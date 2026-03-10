import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { RoastLogForm } from "../RoastLogForm";

export default async function NewRoastLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const [{ data: beans }, { data: products }] = await Promise.all([
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

  return <RoastLogForm beans={beans || []} products={products || []} />;
}
