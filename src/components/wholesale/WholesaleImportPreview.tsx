"use client";

import type { NormalisedWholesaleBuyer } from "@/lib/wholesale-import";

interface Props {
  buyers: NormalisedWholesaleBuyer[];
  errors: string[];
}

export function WholesaleImportPreview({ buyers, errors }: Props) {
  const withPhone = buyers.filter((b) => b.phone).length;
  const uniqueBusinesses = new Set(
    buyers.map((b) => b.business_name.toLowerCase().trim())
  ).size;
  const withTerms = buyers.filter((b) => b.payment_terms).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{buyers.length}</p>
          <p className="text-xs text-slate-500">Total Buyers</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{withPhone}</p>
          <p className="text-xs text-slate-500">With Phone</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{uniqueBusinesses}</p>
          <p className="text-xs text-slate-500">Unique Businesses</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{withTerms}</p>
          <p className="text-xs text-slate-500">With Payment Terms</p>
        </div>
      </div>

      {/* Warnings */}
      {errors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-amber-800 mb-1">
            Warnings ({errors.length})
          </h4>
          <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
            {errors.map((err, i) => (
              <li key={i}>{"\u2022"} {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Email
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Business
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Type
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Payment Terms
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {buyers.map((buyer, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900">
                      {[buyer.first_name, buyer.last_name]
                        .filter(Boolean)
                        .join(" ") || "\u2014"}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {buyer.email}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {buyer.business_name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 capitalize">
                    {buyer.business_type || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 capitalize">
                    {buyer.payment_terms || "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
