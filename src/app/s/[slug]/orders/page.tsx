import { redirect } from "next/navigation";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";
import { OrdersPage } from "./OrdersPage";

export const dynamic = "force-dynamic";

export default async function StorefrontOrdersRoute({
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
    redirect(`/s/${slug}/login?redirect=/s/${slug}/orders`);
  }

  const supabase = createServerClient();

  // Fetch roaster
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      "id, business_name, brand_primary_colour, brand_accent_colour"
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) redirect(`/s/${slug}`);

  // Fetch orders
  const { data: orders } = await supabase
    .from("wholesale_orders")
    .select(
      `id, created_at, status, subtotal, discount_amount, discount_code,
       items, order_channel, payment_method, payment_terms,
       tracking_number, tracking_carrier, stripe_payment_id,
       refund_status, refund_total, invoice_id`
    )
    .eq("user_id", userId)
    .eq("roaster_id", roaster.id)
    .order("created_at", { ascending: false });

  return <OrdersPage slug={slug} orders={orders || []} />;
}
