import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { CertificationsTable } from "./CertificationsTable";

export default async function CertificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: certifications } = await supabase
    .from("certifications")
    .select("*")
    .eq("roaster_id", user.roaster.id)
    .order("expiry_date", { ascending: true });

  return <CertificationsTable certifications={certifications || []} />;
}
