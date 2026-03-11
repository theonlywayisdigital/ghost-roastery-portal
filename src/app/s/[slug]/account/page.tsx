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
    .from("partner_roasters")
    .select("id")
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) redirect(`/s/${slug}`);

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, created_at")
    .eq("id", userId)
    .single();

  if (!profile) redirect(`/s/${slug}`);

  // Fetch wholesale access if exists
  const { data: wholesaleAccess } = await supabase
    .from("wholesale_access")
    .select("id, status, payment_terms, business_name, created_at")
    .eq("user_id", userId)
    .eq("roaster_id", roaster.id)
    .maybeSingle();

  return (
    <AccountPage
      slug={slug}
      profile={profile}
      wholesaleAccess={wholesaleAccess}
    />
  );
}
