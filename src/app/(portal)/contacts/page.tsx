import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ContactsCRM } from "./ContactsCRM";

export default async function ContactsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();

  // Load wholesale buyers for the Wholesale tab's approval section
  const { data: buyers } = await supabase
    .from("wholesale_access")
    .select(
      `id, user_id, status, business_name, business_type, business_address,
       business_website, vat_number, monthly_volume, notes, price_tier,
       payment_terms, credit_limit, rejected_reason, created_at, updated_at,
       approved_at, users!wholesale_access_user_id_fkey(full_name, email)`
    )
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("auto_approve_wholesale")
    .eq("id", user.roaster.id)
    .single();

  return (
    <ContactsCRM
      buyers={buyers || []}
      autoApprove={roaster?.auto_approve_wholesale ?? false}
      roasterId={user.roaster.id as string}
    />
  );
}
