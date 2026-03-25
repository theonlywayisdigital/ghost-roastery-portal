import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo variant="main" height={160} className="h-[160px] w-auto" />
          </div>
          <p className="text-slate-500 mt-1">Sell, market &amp; manage &mdash; built for roasters</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            Sign in to your account
          </h2>
          <LoginForm />
        </div>

        {/* Signup link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          {"Don't have an account? "}
          <Link
            href="/signup"
            className="text-brand-600 font-medium hover:underline"
          >
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
