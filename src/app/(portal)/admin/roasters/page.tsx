import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { AdminRoastersCRM } from "./AdminRoastersCRM";

export default async function AdminRoastersPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const supabase = createServerClient();

  // Load countries for filter dropdown
  const { data: roasters } = await supabase
    .from("roasters")
    .select("country")
    .not("country", "is", null);

  const countries = Array.from(
    new Set((roasters || []).map((r) => r.country).filter(Boolean))
  ).sort();

  return <AdminRoastersCRM countries={countries as string[]} />;
}
