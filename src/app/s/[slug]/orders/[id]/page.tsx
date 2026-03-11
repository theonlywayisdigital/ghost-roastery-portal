import { redirect } from "next/navigation";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";
import { OrderDetailPage } from "./OrderDetailPage";

export const dynamic = "force-dynamic";

export default async function StorefrontOrderDetailRoute({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id: orderId } = await params;

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
    redirect(`/s/${slug}/login?redirect=/s/${slug}/orders/${orderId}`);
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

  // Fetch order — must belong to this user AND this roaster
  const { data: order } = await supabase
    .from("wholesale_orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .eq("roaster_id", roaster.id)
    .single();

  if (!order) redirect(`/s/${slug}/orders`);

  // Fetch invoice if exists
  let invoice: { id: string; invoice_number: string; invoice_access_token: string | null } | null = null;
  if (order.invoice_id) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, invoice_number, invoice_access_token")
      .eq("id", order.invoice_id)
      .single();
    invoice = inv;
  }

  return (
    <OrderDetailPage
      slug={slug}
      order={order}
      invoice={invoice}
    />
  );
}
