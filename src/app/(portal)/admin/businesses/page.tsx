import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { AdminBusinessesCRM } from "./AdminBusinessesCRM";

export default async function AdminBusinessesPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const supabase = createServerClient();

  // Load roasters list for the filter dropdown
  const { data: roasters } = await supabase
    .from("partner_roasters")
    .select("id, business_name")
    .eq("is_active", true)
    .order("business_name");

  return (
    <AdminBusinessesCRM
      roasters={(roasters || []).map((r) => ({ id: r.id, business_name: r.business_name }))}
    />
  );
}
