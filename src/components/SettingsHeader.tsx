"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface SettingsHeaderProps {
  title: string;
  description?: string;
  breadcrumb: string;
}

export function SettingsHeader({ title, description, breadcrumb }: SettingsHeaderProps) {
  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
        <Link href="/settings" className="hover:text-slate-700 transition-colors">
          Settings
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-medium">{breadcrumb}</span>
      </nav>

      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
