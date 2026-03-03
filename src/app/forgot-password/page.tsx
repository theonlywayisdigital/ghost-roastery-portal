import { Logo } from "@/components/Logo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo height={150} className="h-[150px] w-auto" />
          </div>
          <p className="text-slate-500 mt-1">Wholesale and Partner Portal</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Forgot your password?
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {`Enter your email and we'll send you a reset link.`}
          </p>
          <ForgotPasswordForm />
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
