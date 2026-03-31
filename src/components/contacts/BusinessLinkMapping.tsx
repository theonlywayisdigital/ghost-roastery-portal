"use client";

import { useState, useEffect } from "react";
import type { NormalisedContact } from "@/lib/contacts-import";

interface ExistingBusiness {
  id: string;
  name: string;
}

interface Props {
  contacts: NormalisedContact[];
  businessMappings: Record<string, string>;
  onMappingsChange: (mappings: Record<string, string>) => void;
}

export function BusinessLinkMapping({
  contacts,
  businessMappings,
  onMappingsChange,
}: Props) {
  const [existingBusinesses, setExistingBusinesses] = useState<
    ExistingBusiness[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Extract unique business names from contacts
  const uniqueBusinessNames = Array.from(
    new Set(
      contacts
        .map((c) => c.business_name)
        .filter((n): n is string => n != null && n.trim() !== "")
    )
  );

  // Fetch existing businesses for this roaster
  useEffect(() => {
    fetch("/api/businesses?limit=1000&status=all")
      .then((r) => r.json())
      .then((data) => {
        setExistingBusinesses(
          (data.businesses || []).map((b: { id: string; name: string }) => ({
            id: b.id,
            name: b.name,
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-match on first load — match existing businesses, default unmatched to "create"
  useEffect(() => {
    if (loading) return;

    const initial: Record<string, string> = { ...businessMappings };
    let changed = false;

    for (const bizName of uniqueBusinessNames) {
      const key = bizName.toLowerCase().trim();
      if (initial[key]) continue;

      const match = existingBusinesses.find(
        (b) => b.name.toLowerCase().trim() === key
      );
      if (match) {
        initial[key] = match.id;
      } else {
        initial[key] = "create";
      }
      changed = true;
    }

    if (changed) {
      onMappingsChange(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, existingBusinesses]);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading businesses&hellip;</p>
      </div>
    );
  }

  if (uniqueBusinessNames.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-6 text-center">
        <p className="text-sm text-slate-500 mb-1">
          No business names found in your CSV.
        </p>
        <p className="text-xs text-slate-400">
          You can skip this step and link contacts to businesses later.
        </p>
      </div>
    );
  }

  function handleChange(normalizedName: string, value: string) {
    const next = { ...businessMappings };
    if (value) {
      next[normalizedName] = value;
    } else {
      delete next[normalizedName];
    }
    onMappingsChange(next);
  }

  const linkedCount = uniqueBusinessNames.filter((n) => {
    const key = n.toLowerCase().trim();
    const val = businessMappings[key];
    return val && val !== "";
  }).length;

  const createCount = uniqueBusinessNames.filter((n) => {
    const key = n.toLowerCase().trim();
    return businessMappings[key] === "create";
  }).length;

  const unlinkedCount = uniqueBusinessNames.length - linkedCount;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Link Businesses
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Match each business name from your CSV to an existing business, or
          create new ones.
          {existingBusinesses.length > 0 &&
            " Matching names have been auto-linked."}
        </p>
      </div>

      <div className="space-y-3">
        {uniqueBusinessNames.map((bizName) => {
          const key = bizName.toLowerCase().trim();
          const selectedValue = businessMappings[key] || "";
          const contactCount = contacts.filter(
            (c) =>
              c.business_name &&
              c.business_name.toLowerCase().trim() === key
          ).length;

          return (
            <div
              key={key}
              className="border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {bizName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {contactCount} contact{contactCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <select
                value={selectedValue}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700"
              >
                <option value="">Not linked</option>
                <option value="create">+ Create new business</option>
                {existingBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-slate-400 text-right">
        {linkedCount - createCount} linked, {createCount} to create,{" "}
        {unlinkedCount} unlinked
      </div>
    </div>
  );
}
