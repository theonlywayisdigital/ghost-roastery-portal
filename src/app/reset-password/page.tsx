import { Logo } from "@/components/Logo";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { createServerClient } from "@/lib/supabase";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  let valid = false;

  if (token) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("password_reset_tokens")
      .select("id, expires_at, used_at")
      .eq("token", token)
      .single();

    if (data && !data.used_at && new Date(data.expires_at) > new Date()) {
      valid = true;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo height={150} className="h-[150px] w-auto" />
          </div>
          <p className="text-slate-500 mt-1">Sell, market &amp; manage &mdash; built for roasters</p>
        </div>

        {/* Form or error */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          {valid && token ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Set a new password
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Choose a new password for your account.
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <div className="text-center py-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Invalid or expired link
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                This password reset link is no longer valid. Please request a
                new one.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center justify-center px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                Request New Link
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
