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
       business_website, vat_number, monthly_volume, notes,
       payment_terms, rejected_reason, created_at, updated_at,
       approved_at, users!wholesale_access_user_id_fkey(full_name, email)`
    )
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  // Look up contact IDs for each buyer
  const userIds = (buyers || []).map((b) => b.user_id);
  const { data: contacts } = userIds.length
    ? await supabase
        .from("contacts")
        .select("id, user_id")
        .eq("roaster_id", user.roaster.id)
        .in("user_id", userIds)
    : { data: [] };

  const contactMap = new Map(
    (contacts || []).map((c) => [c.user_id, c.id])
  );

  const enrichedBuyers = (buyers || []).map((b) => ({
    ...b,
    contact_id: contactMap.get(b.user_id) || null,
  }));

  const { data: roaster } = await supabase
    .from("roasters")
    .select("auto_approve_wholesale, wholesale_stripe_enabled")
    .eq("id", user.roaster.id)
    .single();

  return (
    <WholesaleSectionPage
      buyers={enrichedBuyers}
      autoApprove={roaster?.auto_approve_wholesale ?? false}
      wholesaleStripeEnabled={roaster?.wholesale_stripe_enabled ?? false}
      roasterId={user.roaster.id as string}
    />
  );
}
