import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { RoastLogTable } from "./RoastLogTable";

export default async function RoastLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: roastLogs } = await supabase
    .from("roast_logs")
    .select("*, green_beans(name)")
    .eq("roaster_id", user.roaster.id)
    .order("roast_date", { ascending: false });

  return <RoastLogTable roastLogs={roastLogs || []} />;
}
