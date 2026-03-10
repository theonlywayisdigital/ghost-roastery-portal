import { Logo } from "@/components/Logo";
import { SetupPasswordForm } from "./SetupPasswordForm";
import { createServerClient } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function SetupPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  let valid = false;
  let roasterSlug: string | null = null;
  let roasterBranding: {
    businessName: string;
    logoUrl: string | null;
    primaryColour: string | null;
    accentColour: string | null;
  } | null = null;

  if (token) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("account_setup_tokens")
      .select("id, expires_at, used_at, roaster_slug")
      .eq("token", token)
      .single();

    if (data && !data.used_at && new Date(data.expires_at) > new Date()) {
      valid = true;
      roasterSlug = data.roaster_slug || null;

      if (roasterSlug) {
        const { data: roaster } = await supabase
          .from("partner_roasters")
          .select("business_name, brand_logo_url, brand_primary_colour, brand_accent_colour")
          .eq("storefront_slug", roasterSlug)
          .single();

        if (roaster) {
          roasterBranding = {
            businessName: roaster.business_name,
            logoUrl: roaster.brand_logo_url,
            primaryColour: roaster.brand_primary_colour,
            accentColour: roaster.brand_accent_colour,
          };
        }
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {roasterBranding?.logoUrl ? (
              <Image
                src={roasterBranding.logoUrl}
                alt={roasterBranding.businessName}
                width={150}
                height={150}
                className="h-[150px] w-auto object-contain"
              />
            ) : (
              <Logo height={150} className="h-[150px] w-auto" />
            )}
          </div>
          <p className="text-slate-500 mt-1">
            {roasterBranding
              ? `${roasterBranding.businessName} Wholesale`
              : <>Sell, market &amp; manage &mdash; built for roasters</>}
          </p>
        </div>

        {/* Form or error */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          {valid && token ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Set up your password
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Choose a password to access your wholesale account.
              </p>
              <SetupPasswordForm
                token={token}
                roasterSlug={roasterSlug}
                businessName={roasterBranding?.businessName}
              />
            </>
          ) : (
            <div className="text-center py-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Invalid or expired link
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                This account setup link is no longer valid. Please contact us
                for a new one.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                Go to Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Back to login */}
        <p className="text-center text-sm text-slate-500 mt-6">
          <Link
            href="/login"
            className="text-brand-600 font-medium hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
