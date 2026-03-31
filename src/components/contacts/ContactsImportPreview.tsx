"use client";

import type { NormalisedContact, NormalisedBusiness } from "@/lib/contacts-import";

// ─── Contact Import Preview ─────────────────────────────────

interface ContactPreviewProps {
  contacts: NormalisedContact[];
  errors: string[];
}

export function ContactImportPreview({ contacts, errors }: ContactPreviewProps) {
  const withEmail = contacts.filter((c) => c.email).length;
  const withBusiness = contacts.filter((c) => c.business_name).length;
  const uniqueBusinesses = new Set(
    contacts.map((c) => c.business_name?.toLowerCase().trim()).filter(Boolean)
  ).size;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{contacts.length}</p>
          <p className="text-xs text-slate-500">Contacts</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{withEmail}</p>
          <p className="text-xs text-slate-500">With Email</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{withBusiness}</p>
          <p className="text-xs text-slate-500">With Business</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{uniqueBusinesses}</p>
          <p className="text-xs text-slate-500">Unique Businesses</p>
        </div>
      </div>

      {/* Errors */}
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

      {/* Contact table */}
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
                  Phone
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Business
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900">
                      {[contact.first_name, contact.last_name]
                        .filter(Boolean)
                        .join(" ") || "\u2014"}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {contact.email || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {contact.phone || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {contact.business_name || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {contact.role || "\u2014"}
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

// ─── Business Import Preview ────────────────────────────────

interface BusinessPreviewProps {
  businesses: NormalisedBusiness[];
  errors: string[];
}

export function BusinessImportPreview({ businesses, errors }: BusinessPreviewProps) {
  const withContact = businesses.filter(
    (b) => b.contact_first_name || b.contact_last_name || b.contact_email
  ).length;
  const withIndustry = businesses.filter((b) => b.industry).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{businesses.length}</p>
          <p className="text-xs text-slate-500">Businesses</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{withContact}</p>
          <p className="text-xs text-slate-500">With Contact</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{withIndustry}</p>
          <p className="text-xs text-slate-500">With Industry</p>
        </div>
      </div>

      {/* Errors */}
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

      {/* Business table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Industry
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Email
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Primary Contact
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2.5">
                  Phone
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businesses.map((biz, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900">{biz.name}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 capitalize">
                    {biz.industry || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {biz.email || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {[biz.contact_first_name, biz.contact_last_name]
                      .filter(Boolean)
                      .join(" ") || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {biz.phone || "\u2014"}
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
