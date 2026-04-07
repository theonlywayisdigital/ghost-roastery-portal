import { Logo } from "@/components/Logo";
import { SignupForm } from "./SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo variant="stacked" height={150} className="h-[150px] w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Start Your Free Trial
          </h1>
          <p className="text-slate-500 mt-1">
            14 days free, then £39/mo. Cancel anytime.
          </p>
        </div>

        {/* Signup form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <SignupForm />
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-brand-600 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>

        {/* Benefits */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p className="font-medium text-slate-700 mb-2">
            What you get:
          </p>
          <ul className="space-y-1">
            <li>14-day free trial — no charge until day 15</li>
            <li>Full access to Sales Growth features</li>
            <li>Cancel anytime before your trial ends</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
