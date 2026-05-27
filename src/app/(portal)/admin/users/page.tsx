import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { AdminUsersTabs } from "./AdminUsersTabs";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const supabase = createServerClient();

  // Load roasters list for the user filter dropdown
  const { data: roasters } = await supabase
    .from("roasters")
    .select("id, business_name")
    .eq("is_active", true)
    .order("business_name");

  // Load countries for the roaster filter dropdown
  const { data: roasterRows } = await supabase
    .from("roasters")
    .select("country")
    .not("country", "is", null);

  const countries = Array.from(
    new Set((roasterRows || []).map((r) => r.country).filter(Boolean))
  ).sort() as string[];

  return (
    <AdminUsersTabs
      roasters={(roasters || []).map((r) => ({ id: r.id, business_name: r.business_name }))}
      countries={countries}
    />
  );
}
