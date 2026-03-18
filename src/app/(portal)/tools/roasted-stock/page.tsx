import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { RoastedStockTable } from "./RoastedStockTable";

export default async function RoastedStockPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: stock } = await supabase
    .from("roasted_stock")
    .select("*, green_beans(name)")
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  return <RoastedStockTable stock={stock || []} />;
}
