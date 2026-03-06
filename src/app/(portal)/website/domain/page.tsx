"use client";

import { useState } from "react";
import { Globe, CheckCircle2, AlertCircle, Loader2 } from "@/components/icons";

export default function WebsiteDomainPage() {
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Custom Domain</h1>
      <p className="text-slate-500 text-sm mb-6">
        Connect your own domain to your website.
      </p>

      <div className="max-w-xl space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Domain</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Custom Domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="www.yourroastery.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>

            <button
              disabled={!domain || saving}
              className="px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save Domain"
              )}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">DNS Setup</h2>
          <p className="text-sm text-slate-500 mb-4">
            Add a CNAME record pointing to <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">cname.vercel-dns.com</code> in your DNS provider.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 text-sm font-mono">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase">Type</span>
                <p className="text-slate-900">CNAME</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase">Name</span>
                <p className="text-slate-900">www</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase">Value</span>
                <p className="text-slate-900">cname.vercel-dns.com</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
