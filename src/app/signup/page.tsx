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
            <Logo height={150} className="h-[150px] w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Join Ghost Roastery
          </h1>
          <p className="text-slate-500 mt-1">
            Get your free wholesale portal in minutes
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
            What you get — completely free:
          </p>
          <ul className="space-y-1">
            <li>Your own wholesale ordering portal</li>
            <li>Share with your cafes, restaurants & clients</li>
            <li>No monthly fees — we take a small % per transaction</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
