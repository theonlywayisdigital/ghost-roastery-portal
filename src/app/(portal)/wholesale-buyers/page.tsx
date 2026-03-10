import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { WholesaleSectionPage } from "./WholesaleSectionPage";

export default async function WholesaleBuyersPageRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();

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
    .select("auto_approve_wholesale, wholesale_stripe_enabled")
    .eq("id", user.roaster.id)
    .single();

  return (
    <WholesaleSectionPage
      buyers={buyers || []}
      autoApprove={roaster?.auto_approve_wholesale ?? false}
      wholesaleStripeEnabled={roaster?.wholesale_stripe_enabled ?? false}
      roasterId={user.roaster.id as string}
    />
  );
}
