import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { getGRRoasterId } from "@/lib/gr-roaster";
import { OrderDetailClient } from "../../../orders/[id]/OrderDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminWholesaleOrderDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/login");

  const { id } = await params;
  const roasterId = await getGRRoasterId();
  const supabase = createServerClient();

  // Verify the order belongs to GR
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (!order) {
    return (
      <div className="text-center py-20 text-slate-400">Order not found</div>
    );
  }

  const [roasterRes, activitiesRes, commsRes, invoiceRes, refundsRes] =
    await Promise.all([
      supabase
        .from("roasters")
        .select("*")
        .eq("id", order.roaster_id)
        .single(),
      supabase
        .from("order_activity_log")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("order_communications")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
      order.invoice_id
        ? supabase
            .from("invoices")
            .select("*")
            .eq("id", order.invoice_id)
            .single()
        : { data: null },
      supabase
        .from("refunds")
        .select("*")
        .eq("order_id", id)
        .eq("order_type", "wholesale")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <OrderDetailClient
      orderType="wholesale"
      order={order}
      roaster={roasterRes.data}
      invoice={invoiceRes.data}
      activities={activitiesRes.data || []}
      communications={commsRes.data || []}
      refunds={refundsRes.data || []}
    />
  );
}
