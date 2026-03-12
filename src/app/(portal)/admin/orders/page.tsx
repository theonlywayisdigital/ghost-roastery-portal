import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { OrdersClient } from "./OrdersClient";

export default async function AdminOrdersPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    redirect("/dashboard");
  }

  const supabase = createServerClient();

  const [ordersRes, wholesaleRes, roastersRes] = await Promise.all([
    supabase.from("ghost_orders").select("id, order_status, total_price, payment_status"),
    supabase.from("orders").select("id, status, subtotal"),
    supabase
      .from("partner_roasters")
      .select("id, business_name")
      .eq("is_active", true)
      .order("business_name"),
  ]);

  const ghostOrders = ordersRes.data || [];
  const wholesaleOrders = wholesaleRes.data || [];

  const totalOrders = ghostOrders.length + wholesaleOrders.length;
  const pendingOrders =
    ghostOrders.filter((o) => o.order_status === "Pending").length +
    wholesaleOrders.filter((o) => o.status === "pending").length;
  const inProductionOrders = ghostOrders.filter(
    (o) => o.order_status === "In Production"
  ).length;
  const totalRevenue =
    ghostOrders
      .filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + o.total_price, 0) +
    wholesaleOrders.reduce((sum, o) => sum + o.subtotal, 0);

  const roasters = (roastersRes.data || []).map((r) => ({
    value: r.id,
    label: r.business_name,
  }));

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">All Orders</h1>
        <p className="text-slate-500 mt-1">
          Manage all orders across Ghost Roastery, Storefront, and Wholesale.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Orders" value={totalOrders} />
        <SummaryCard label="Pending" value={pendingOrders} color="text-yellow-600" />
        <SummaryCard label="In Production" value={inProductionOrders} color="text-blue-600" />
        <SummaryCard
          label="Revenue"
          value={`£${totalRevenue.toFixed(2)}`}
          color="text-green-600"
        />
      </div>

      <Suspense fallback={<div className="text-center py-12 text-slate-400">Loading orders...</div>}>
        <OrdersClient roasters={roasters} />
      </Suspense>
    </>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${color || "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
