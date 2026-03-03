import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { OrderDetailClient } from "./OrderDetailClient";
import type { OrderType } from "@/types/admin";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const { type } = await searchParams;
  const orderType = (type || "ghost") as OrderType;

  const supabase = createServerClient();

  if (orderType === "ghost") {
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (!order) {
      return (
        <div className="text-center py-20 text-slate-400">Order not found</div>
      );
    }

    const [roasterRes, roasterOrderRes, labelRes, activitiesRes, commsRes] =
      await Promise.all([
        order.roaster_id
          ? supabase.from("partner_roasters").select("*").eq("id", order.roaster_id).single()
          : { data: null },
        supabase.from("roaster_orders").select("*").eq("order_id", id).single(),
        order.label_id
          ? supabase.from("labels").select("*").eq("id", order.label_id).single()
          : { data: null },
        supabase.from("order_activity_log").select("*").eq("order_id", id).order("created_at", { ascending: false }),
        supabase.from("order_communications").select("*").eq("order_id", id).order("created_at", { ascending: false }),
      ]);

    return (
      <OrderDetailClient
        orderType="ghost"
        order={order}
        roaster={roasterRes.data}
        roasterOrder={roasterOrderRes.data}
        label={labelRes.data}
        activities={activitiesRes.data || []}
        communications={commsRes.data || []}
      />
    );
  }

  // Storefront / Wholesale
  const { data: order } = await supabase
    .from("wholesale_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) {
    return (
      <div className="text-center py-20 text-slate-400">Order not found</div>
    );
  }

  const [roasterRes, activitiesRes, commsRes, invoiceRes] = await Promise.all([
    supabase.from("partner_roasters").select("*").eq("id", order.roaster_id).single(),
    supabase.from("order_activity_log").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    supabase.from("order_communications").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    order.invoice_id
      ? supabase.from("invoices").select("*").eq("id", order.invoice_id).single()
      : { data: null },
  ]);

  return (
    <OrderDetailClient
      orderType={orderType}
      order={order}
      roaster={roasterRes.data}
      invoice={invoiceRes.data}
      activities={activitiesRes.data || []}
      communications={commsRes.data || []}
    />
  );
}
