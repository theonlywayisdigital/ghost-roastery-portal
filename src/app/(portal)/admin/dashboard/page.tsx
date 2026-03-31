import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ShoppingCart, Users, Building2, TrendingUp } from "@/components/icons";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const supabase = createServerClient();

  const { count: orderCount } = await supabase
    .from("ghost_orders")
    .select("*", { count: "exact", head: true });

  const { count: pendingCount } = await supabase
    .from("ghost_orders")
    .select("*", { count: "exact", head: true })
    .eq("order_status", "Pending");

  const { count: roasterCount } = await supabase
    .from("roasters")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: userCount } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Ops health overview: pending orders, SLA breaches, roaster strike thresholds, partner capacity, and key metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/admin/orders"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Orders</p>
              <p className="text-2xl font-bold text-slate-900">{pendingCount || 0}</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/orders"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900">{orderCount || 0}</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/roasters"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Roasters</p>
              <p className="text-2xl font-bold text-slate-900">{roasterCount || 0}</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/contacts"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">User Roles</p>
              <p className="text-2xl font-bold text-slate-900">{userCount || 0}</p>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
