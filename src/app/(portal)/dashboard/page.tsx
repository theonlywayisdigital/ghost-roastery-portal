import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { Package, Coffee, TrendingUp, ArrowRight, ClipboardList, Users, Store } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createServerClient();
  const isRoaster = user.roles.includes("roaster");
  const isCustomer =
    user.roles.includes("ghost_roastery_customer") ||
    user.roles.includes("retail_buyer") ||
    user.roles.includes("wholesale_buyer");

  // Roaster stats
  let wholesaleCount = 0;
  let ghostOrderCount = 0;
  let pendingWholesaleRequests = 0;

  if (isRoaster && user.roaster) {
    const { count: wc } = await supabase
      .from("wholesale_orders")
      .select("*", { count: "exact", head: true })
      .eq("roaster_id", user.roaster.id)
      .eq("status", "pending");
    wholesaleCount = wc || 0;

    const { count: wrc } = await supabase
      .from("wholesale_access")
      .select("*", { count: "exact", head: true })
      .eq("roaster_id", user.roaster.id)
      .eq("status", "pending");
    pendingWholesaleRequests = wrc || 0;

    if (user.roaster.is_ghost_roaster) {
      const { count } = await supabase
        .from("roaster_orders")
        .select("*", { count: "exact", head: true })
        .eq("roaster_id", user.roaster.id)
        .eq("status", "pending");
      ghostOrderCount = count || 0;
    }
  }

  // Customer stats
  let customerOrderCount = 0;
  if (isCustomer) {
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    customerOrderCount = count || 0;
  }

  // Wholesale buyer stats
  let wholesaleAccountCount = 0;
  if (user.roles.includes("wholesale_buyer")) {
    const { count: wac } = await supabase
      .from("wholesale_access")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "approved");
    wholesaleAccountCount = wac || 0;
  }

  const displayName =
    user.roaster?.contact_name || user.fullName || user.email;

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
      <p className="text-slate-500 mb-8">
        {`Welcome back, ${displayName}.`}
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Roaster stats */}
        {isRoaster && (
          <>
            {/* Wholesale orders */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pending Wholesale</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {wholesaleCount}
                  </p>
                </div>
              </div>
              <Link
                href="/orders"
                className="text-sm text-brand-600 hover:underline flex items-center gap-1"
              >
                View orders <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Ghost orders (only if Ghost Roaster) */}
            {user.roaster?.is_ghost_roaster && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">New Ghost Orders</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {ghostOrderCount}
                    </p>
                  </div>
                </div>
                <Link
                  href="/ghost-orders"
                  className="text-sm text-brand-600 hover:underline flex items-center gap-1"
                >
                  View orders <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Pending Wholesale Requests */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Trade Requests</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {pendingWholesaleRequests}
                  </p>
                </div>
              </div>
              <Link
                href="/contacts"
                className="text-sm text-brand-600 hover:underline flex items-center gap-1"
              >
                View requests <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">This Month</p>
                  <p className="text-2xl font-bold text-slate-900">£0.00</p>
                </div>
              </div>
              <Link
                href="/orders"
                className="text-sm text-brand-600 hover:underline flex items-center gap-1"
              >
                View revenue <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        )}

        {/* Customer stats */}
        {isCustomer && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">My Orders</p>
                <p className="text-2xl font-bold text-slate-900">
                  {customerOrderCount}
                </p>
              </div>
            </div>
            <Link
              href="/my-orders"
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              View orders <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Wholesale buyer stats */}
        {user.roles.includes("wholesale_buyer") && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Wholesale Accounts</p>
                <p className="text-2xl font-bold text-slate-900">
                  {wholesaleAccountCount}
                </p>
              </div>
            </div>
            <Link
              href="/wholesale"
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              View suppliers <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Ghost Roaster CTA (only if roaster but NOT a Ghost Roaster) */}
      {isRoaster && user.roaster && !user.roaster.is_ghost_roaster && (
        <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-xl border border-brand-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Earn more from your existing roasting capacity
          </h2>
          <p className="text-slate-600 mb-6 max-w-2xl">
            Join the Ghost Roaster programme and receive white-label orders
            from customers across the UK. Use your existing equipment and
            capacity to earn additional revenue — no extra costs.
          </p>
          {user.roaster.ghost_roaster_application_status ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-brand-200">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
              <span className="text-sm font-medium text-slate-700">
                {`Application ${user.roaster.ghost_roaster_application_status}`}
              </span>
            </div>
          ) : (
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              Apply now <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </>
  );
}
