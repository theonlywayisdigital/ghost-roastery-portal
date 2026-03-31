import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Store } from "@/components/icons";

const TIER_LABELS: Record<string, string> = {
  standard: "Standard",
  preferred: "Preferred",
  vip: "VIP",
};

const TERMS_LABELS: Record<string, string> = {
  prepay: "Prepay",
  net7: "Net 7",
  net14: "Net 14",
  net30: "Net 30",
};

export default async function WholesaleSuppliersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("wholesale_buyer")) redirect("/dashboard");

  const supabase = createServerClient();

  const { data: accounts } = await supabase
    .from("wholesale_access")
    .select(
      `id, price_tier, payment_terms, roaster_id,
       roasters!wholesale_access_roaster_id_fkey(
         id, business_name, brand_logo_url, storefront_slug
       )`
    )
    .eq("user_id", user.id)
    .eq("status", "approved");

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">My Suppliers</h1>
      <p className="text-slate-500 mb-8">
        Your approved wholesale accounts.
      </p>

      {!accounts || accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Store className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500 mb-2">No wholesale accounts yet.</p>
          <p className="text-sm text-slate-400">
            Find a roaster storefront and apply for trade access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const roastersRaw = account.roasters as unknown;
            const roaster = Array.isArray(roastersRaw)
              ? (roastersRaw[0] as { id: string; business_name: string; brand_logo_url: string | null; storefront_slug: string } | undefined)
              : (roastersRaw as { id: string; business_name: string; brand_logo_url: string | null; storefront_slug: string } | null);
            if (!roaster) return null;

            return (
              <div
                key={account.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  {roaster.brand_logo_url ? (
                    <Image
                      src={roaster.brand_logo_url}
                      alt={roaster.business_name}
                      width={48}
                      height={48}
                      className="rounded-lg object-contain bg-slate-50 p-1"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Store className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {roaster.business_name}
                    </h3>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                    {TIER_LABELS[account.price_tier] || account.price_tier}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    {TERMS_LABELS[account.payment_terms] || account.payment_terms}
                  </span>
                </div>

                <Link
                  href={`/wholesale/${roaster.storefront_slug}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                >
                  Browse Catalogue <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
