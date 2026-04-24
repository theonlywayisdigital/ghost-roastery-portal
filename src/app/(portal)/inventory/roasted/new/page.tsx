import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { RoastedStockForm } from "../../_components/roasted-stock/RoastedStockForm";

export default async function NewRoastedStockPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: greenBeans } = await supabase
    .from("green_beans")
    .select("id, name")
    .eq("roaster_id", user.roaster.id)
    .eq("is_active", true)
    .order("name");

  return <RoastedStockForm greenBeans={greenBeans || []} />;
}
