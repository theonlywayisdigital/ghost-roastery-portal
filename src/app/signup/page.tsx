import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "./SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-slate-900">
        Create your account
      </h1>
      <p className="text-slate-500 mt-1 mb-8">
        Start your 14-day free trial. No credit card required to sign up.
      </p>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <SignupForm />
      </div>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-brand-600 font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
