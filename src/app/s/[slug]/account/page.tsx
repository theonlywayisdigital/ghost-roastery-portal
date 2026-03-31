import { redirect } from "next/navigation";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";
import { AccountPage } from "./AccountPage";

export const dynamic = "force-dynamic";

export default async function StorefrontAccountRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Require authentication
  let userId: string;
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    userId = user.id;
  } catch {
    redirect(`/s/${slug}/login?redirect=/s/${slug}/account`);
  }

  const supabase = createServerClient();

  // Fetch roaster
  const { data: roaster } = await supabase
    .from("roasters")
    .select("id")
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) redirect(`/s/${slug}`);

  // Fetch user profile (include phone)
  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, phone, created_at")
    .eq("id", userId)
    .single();

  if (!profile) redirect(`/s/${slug}`);

  // Fetch wholesale access if exists (include vat_number)
  const { data: wholesaleAccess } = await supabase
    .from("wholesale_access")
    .select("id, status, payment_terms, business_name, vat_number, created_at")
    .eq("user_id", userId)
    .eq("roaster_id", roaster.id)
    .maybeSingle();

  // Fetch buyer addresses
  const { data: addresses } = await supabase
    .from("buyer_addresses")
    .select("*")
    .eq("user_id", userId)
    .eq("roaster_id", roaster.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  return (
    <AccountPage
      slug={slug}
      roasterId={roaster.id}
      profile={profile}
      wholesaleAccess={wholesaleAccess}
      addresses={addresses || []}
    />
  );
}
