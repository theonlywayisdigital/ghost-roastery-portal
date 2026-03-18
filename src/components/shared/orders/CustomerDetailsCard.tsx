"use client";

import Link from "next/link";
import { User } from "@/components/icons";

interface CustomerDetailsCardProps {
  name: string | null;
  email: string;
  business?: string | null;
  userId?: string | null;
  showAdminLink?: boolean;
  contactHref?: string | null;
  heading?: string;
}

export function CustomerDetailsCard({ name, email, business, userId, showAdminLink, contactHref, heading = "Customer" }: CustomerDetailsCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">{heading}</h3>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-slate-900">{name || "\u2014"}</p>
        <p className="text-sm text-slate-500">{email}</p>
        {business && <p className="text-sm text-slate-500">{business}</p>}
        {showAdminLink && userId && (
          <Link
            href={`/admin/customers?search=${encodeURIComponent(email)}`}
            className="inline-block text-xs text-brand-600 hover:text-brand-700 mt-1"
          >
            View Customer
          </Link>
        )}
        {contactHref && (
          <Link
            href={contactHref}
            className="inline-block text-xs text-brand-600 hover:text-brand-700 mt-1"
          >
            View Contact
          </Link>
        )}
      </div>
    </div>
  );
}
